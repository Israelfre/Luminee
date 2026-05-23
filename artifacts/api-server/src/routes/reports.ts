import { Router, Request, Response } from "express";
import { db, appointmentsTable, paymentsTable, clientsTable, servicesTable, employeesTable, expensesTable } from "@workspace/db";
import { eq, and, gte, lte, sum, count, sql } from "drizzle-orm";
import { requireSalon } from "../middlewares/requireAuth";

const router = Router();
type AuthRequest = Request & { salonId: number };

// Receita: usa apenas appointments com paymentStatus = paid (evita duplicação)
async function getRevenue(salonId: number, from: Date, to: Date) {
  const [fromApts] = await db
    .select({ total: sum(appointmentsTable.paymentAmount) })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      eq(appointmentsTable.paymentStatus, "paid"),
      gte(appointmentsTable.startsAt, from),
      lte(appointmentsTable.startsAt, to),
    ));

  return parseFloat(fromApts.total ?? "0");
}

// GET /api/reports/financial?from=2026-01-01&to=2026-01-31
router.get("/financial", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const from = new Date((req.query.from as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const to = new Date((req.query.to as string) || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59));
  to.setHours(23, 59, 59, 999);

  const totalRevenue = await getRevenue(salonId, from, to);

  // Despesas no período
  const [expRow] = await db
    .select({ total: sum(expensesTable.amount) })
    .from(expensesTable)
    .where(and(eq(expensesTable.salonId, salonId), gte(expensesTable.paidAt, from), lte(expensesTable.paidAt, to)));
  const totalExpenses = parseFloat(expRow.total ?? "0");

  // Receita por serviço
  const byService = await db
    .select({
      serviceId: servicesTable.id,
      serviceName: servicesTable.name,
      count: count(appointmentsTable.id),
      revenue: sum(appointmentsTable.paymentAmount),
    })
    .from(appointmentsTable)
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      eq(appointmentsTable.paymentStatus, "paid"),
      gte(appointmentsTable.startsAt, from),
      lte(appointmentsTable.startsAt, to),
    ))
    .groupBy(servicesTable.id, servicesTable.name)
    .orderBy(sql`sum(${appointmentsTable.paymentAmount}) desc`);

  // Receita por funcionária
  const byEmployee = await db
    .select({
      employeeId: employeesTable.id,
      employeeName: employeesTable.name,
      commissionPct: employeesTable.commissionPct,
      count: count(appointmentsTable.id),
      revenue: sum(appointmentsTable.paymentAmount),
    })
    .from(appointmentsTable)
    .innerJoin(employeesTable, eq(appointmentsTable.employeeId, employeesTable.id))
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      eq(appointmentsTable.paymentStatus, "paid"),
      gte(appointmentsTable.startsAt, from),
      lte(appointmentsTable.startsAt, to),
    ))
    .groupBy(employeesTable.id, employeesTable.name, employeesTable.commissionPct)
    .orderBy(sql`sum(${appointmentsTable.paymentAmount}) desc`);

  // Receita por método de pagamento
  const byMethod = await db
    .select({
      method: appointmentsTable.paymentMethod,
      count: count(appointmentsTable.id),
      revenue: sum(appointmentsTable.paymentAmount),
    })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      eq(appointmentsTable.paymentStatus, "paid"),
      gte(appointmentsTable.startsAt, from),
      lte(appointmentsTable.startsAt, to),
    ))
    .groupBy(appointmentsTable.paymentMethod);

  // Despesas por categoria
  const expByCategory = await db
    .select({
      category: expensesTable.category,
      total: sum(expensesTable.amount),
      count: count(expensesTable.id),
    })
    .from(expensesTable)
    .where(and(eq(expensesTable.salonId, salonId), gte(expensesTable.paidAt, from), lte(expensesTable.paidAt, to)))
    .groupBy(expensesTable.category);

  res.json({
    period: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      totalRevenue: totalRevenue.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netProfit: (totalRevenue - totalExpenses).toFixed(2),
    },
    byService: byService.map(r => ({
      ...r,
      revenue: parseFloat(r.revenue ?? "0").toFixed(2),
    })),
    byEmployee: byEmployee.map(r => {
      const rev = parseFloat(r.revenue ?? "0");
      const pct = parseFloat(r.commissionPct ?? "0");
      return {
        ...r,
        revenue: rev.toFixed(2),
        commissionPct: pct,
        commissionAmount: ((rev * pct) / 100).toFixed(2),
      };
    }),
    byMethod: byMethod.map(r => ({
      method: r.method ?? "outro",
      count: r.count,
      revenue: parseFloat(r.revenue ?? "0").toFixed(2),
    })),
    expensesByCategory: expByCategory.map(r => ({
      category: r.category,
      total: parseFloat(r.total ?? "0").toFixed(2),
      count: r.count,
    })),
  });
});

// GET /api/reports/commissions?from=...&to=...
router.get("/commissions", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const from = new Date((req.query.from as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const to = new Date((req.query.to as string) || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59));
  to.setHours(23, 59, 59, 999);

  const employees = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.salonId, salonId));

  const result = await Promise.all(employees.map(async (emp) => {
    const apts = await db
      .select({
        id: appointmentsTable.id,
        startsAt: appointmentsTable.startsAt,
        paymentAmount: appointmentsTable.paymentAmount,
        paymentStatus: appointmentsTable.paymentStatus,
        paymentMethod: appointmentsTable.paymentMethod,
        serviceName: servicesTable.name,
        clientName: clientsTable.name,
      })
      .from(appointmentsTable)
      .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
      .innerJoin(clientsTable, eq(appointmentsTable.clientId, clientsTable.id))
      .where(and(
        eq(appointmentsTable.salonId, salonId),
        eq(appointmentsTable.employeeId, emp.id),
        eq(appointmentsTable.paymentStatus, "paid"),
        gte(appointmentsTable.startsAt, from),
        lte(appointmentsTable.startsAt, to),
      ))
      .orderBy(appointmentsTable.startsAt);

    const totalRevenue = apts.reduce((s, a) => s + parseFloat(a.paymentAmount ?? "0"), 0);
    const commissionPct = parseFloat(emp.commissionPct ?? "0");
    const commissionAmount = (totalRevenue * commissionPct) / 100;

    return {
      employee: {
        id: emp.id,
        name: emp.name,
        commissionPct,
      },
      totalRevenue: totalRevenue.toFixed(2),
      commissionAmount: commissionAmount.toFixed(2),
      appointmentCount: apts.length,
      appointments: apts.map(a => ({
        ...a,
        startsAt: a.startsAt.toISOString(),
        paymentAmount: a.paymentAmount ?? "0",
        commissionAmount: ((parseFloat(a.paymentAmount ?? "0") * commissionPct) / 100).toFixed(2),
      })),
    };
  }));

  res.json(result);
});

export default router;
