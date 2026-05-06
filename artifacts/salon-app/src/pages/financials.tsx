import {
  useListPayments,
  getListPaymentsQueryKey,
  useListExpenses,
  getListExpensesQueryKey,
  useCreateExpense,
  useDeleteExpense,
  useCreatePayment,
  useListAppointments,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Loader2, Plus, Wallet, CreditCard, Banknote, ArrowUpRight,
  TrendingUp, TrendingDown, Receipt, BarChart3, Trash2,
  ShoppingBag, Home, Zap, Users, Megaphone, Wrench, MoreHorizontal,
  DollarSign,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const expenseSchema = z.object({
  description: z.string().min(2, "Descrição obrigatória"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Informe um valor válido"),
  category: z.enum(["supplies", "rent", "utilities", "salaries", "marketing", "equipment", "other"]),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
});
type ExpenseFormValues = z.infer<typeof expenseSchema>;

const paymentSchema = z.object({
  appointmentId: z.coerce.number().min(1, "Selecione um agendamento"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Valor inválido"),
  paymentMethod: z.enum(["cash", "pix", "card"]),
});
type PaymentFormValues = z.infer<typeof paymentSchema>;

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(isNaN(num) ? 0 : num);
}

const CATEGORY_CONFIG: Record<string, { label: string; Icon: React.FC<any>; color: string; bg: string }> = {
  supplies:  { label: "Insumos/Produtos", Icon: ShoppingBag,    color: "hsl(338,60%,38%)", bg: "hsl(338,60%,95%)" },
  rent:      { label: "Aluguel",          Icon: Home,           color: "hsl(220,60%,45%)", bg: "hsl(220,60%,94%)" },
  utilities: { label: "Água/Luz/Internet",Icon: Zap,            color: "hsl(45,80%,40%)",  bg: "hsl(45,80%,93%)"  },
  salaries:  { label: "Salários",         Icon: Users,          color: "hsl(280,50%,45%)", bg: "hsl(280,50%,94%)" },
  marketing: { label: "Marketing",        Icon: Megaphone,      color: "hsl(200,60%,40%)", bg: "hsl(200,60%,93%)" },
  equipment: { label: "Equipamentos",     Icon: Wrench,         color: "hsl(150,45%,36%)", bg: "hsl(150,45%,92%)" },
  other:     { label: "Outros",           Icon: MoreHorizontal, color: "hsl(0,0%,45%)",    bg: "hsl(0,0%,93%)"    },
};

const methodConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  cash: { label: "Dinheiro", icon: <Banknote className="h-4 w-4" />, color: "hsl(150,50%,35%)", bg: "hsl(150,50%,93%)" },
  card: { label: "Cartão",   icon: <CreditCard className="h-4 w-4" />, color: "hsl(220,60%,45%)", bg: "hsl(220,60%,94%)" },
  pix:  { label: "Pix",      icon: <ArrowUpRight className="h-4 w-4" />, color: "hsl(175,60%,32%)", bg: "hsl(175,60%,93%)" },
};

export default function Financials() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const qc = useQueryClient();

  const { data: payments, isLoading: loadingPayments } = useListPayments({ month: selectedMonth }, {
    query: { queryKey: getListPaymentsQueryKey({ month: selectedMonth }) }
  });
  const { data: expenses, isLoading: loadingExpenses } = useListExpenses({ month: selectedMonth }, {
    query: { queryKey: getListExpensesQueryKey({ month: selectedMonth }) }
  });
  const { data: completedApts } = useListAppointments({ status: "completed" }, {
    query: { queryKey: getListAppointmentsQueryKey({ status: "completed" }) }
  });

  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const createPayment = useCreatePayment();

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { description: "", amount: "", category: "supplies", paidAt: format(new Date(), "yyyy-MM-dd"), notes: "" },
  });

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: "", paymentMethod: "pix" },
  });

  const onSubmitExpense = (data: ExpenseFormValues) => {
    const paidAt = data.paidAt ? new Date(data.paidAt + "T12:00:00").toISOString() : undefined;
    createExpense.mutate({ data: { ...data, ...(paidAt ? { paidAt } : {}) } }, {
      onSuccess: () => {
        toast.success("Despesa registrada!");
        qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        setIsAddExpenseOpen(false);
        expenseForm.reset();
      },
      onError: () => toast.error("Erro ao registrar despesa"),
    });
  };

  const onSubmitPayment = (data: PaymentFormValues) => {
    createPayment.mutate({ data }, {
      onSuccess: () => {
        toast.success("Pagamento registrado!");
        qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        setIsAddPaymentOpen(false);
        paymentForm.reset();
      },
      onError: () => toast.error("Erro ao registrar pagamento"),
    });
  };

  const onAptChange = (val: string) => {
    paymentForm.setValue("appointmentId", parseInt(val, 10));
    const apt = completedApts?.find(a => a.id.toString() === val);
    if (apt) paymentForm.setValue("amount", apt.servicePrice);
  };

  const handleDeleteExpense = (id: number) => {
    deleteExpense.mutate({ id }, {
      onSuccess: () => { toast.success("Despesa removida"); qc.invalidateQueries({ queryKey: getListExpensesQueryKey() }); },
      onError: () => toast.error("Erro ao remover"),
    });
  };

  const totalRevenue = payments?.reduce((s, p) => s + parseFloat(p.amount), 0) || 0;
  const totalExpenses = expenses?.reduce((s, e) => s + parseFloat(e.amount), 0) || 0;
  const profit = totalRevenue - totalExpenses;
  const byMethod = payments?.reduce((a, p) => { a[p.paymentMethod] = (a[p.paymentMethod] || 0) + parseFloat(p.amount); return a; }, {} as Record<string, number>) || {};
  const byCat = expenses?.reduce((a, e) => { a[e.category] = (a[e.category] || 0) + parseFloat(e.amount); return a; }, {} as Record<string, number>) || {};
  const monthLabel = format(new Date(selectedMonth + "-01"), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold" style={{ background: "linear-gradient(135deg,hsl(338,60%,32%),hsl(338,55%,48%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Financeiro
          </h1>
          <p className="text-muted-foreground mt-1 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-40 h-9 text-sm rounded-xl" />
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 text-white relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,hsl(338,60%,38%),hsl(320,55%,30%))", boxShadow: "0 8px 24px rgba(160,60,90,0.2)" }}>
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-10" style={{ background: "radial-gradient(circle,white,transparent 70%)" }} />
          <div className="flex items-center gap-2 mb-2 text-white/60 text-xs font-bold uppercase tracking-wider">
            <TrendingUp className="h-3.5 w-3.5" />Receitas
          </div>
          <div className="text-3xl font-bold font-serif">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-white/50 mt-1">{payments?.length ?? 0} transações</div>
        </div>

        <div className="rounded-2xl p-5 relative overflow-hidden bg-white border"
          style={{ borderColor: "hsl(340,25%,90%)", boxShadow: "0 4px 14px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(0,60%,50%)" }}>
            <TrendingDown className="h-3.5 w-3.5" />Despesas
          </div>
          <div className="text-3xl font-bold font-serif text-foreground">{formatCurrency(totalExpenses)}</div>
          <div className="text-xs text-muted-foreground mt-1">{expenses?.length ?? 0} lançamentos</div>
        </div>

        <div className="rounded-2xl p-5 relative overflow-hidden bg-white border"
          style={{ borderColor: profit >= 0 ? "hsl(150,40%,80%)" : "hsl(0,40%,80%)", boxShadow: "0 4px 14px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider"
            style={{ color: profit >= 0 ? "hsl(150,50%,35%)" : "hsl(0,60%,45%)" }}>
            <DollarSign className="h-3.5 w-3.5" />Lucro Líquido
          </div>
          <div className="text-3xl font-bold font-serif"
            style={{ color: profit >= 0 ? "hsl(150,50%,32%)" : "hsl(0,60%,40%)" }}>
            {formatCurrency(profit)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {profit >= 0 ? "✓ Saldo positivo" : "⚠ Despesas acima da receita"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="receitas">
        <TabsList className="rounded-2xl p-1 h-11 gap-1 bg-muted/50">
          <TabsTrigger value="receitas" className="rounded-xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />Receitas
          </TabsTrigger>
          <TabsTrigger value="despesas" className="rounded-xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <TrendingDown className="h-3.5 w-3.5 mr-1.5" />Despesas
          </TabsTrigger>
          <TabsTrigger value="resumo" className="rounded-xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />Resumo
          </TabsTrigger>
        </TabsList>

        {/* ── RECEITAS ── */}
        <TabsContent value="receitas" className="mt-4">
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(340,25%,90%)" }}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "hsl(340,25%,92%)" }}>
              <h2 className="font-serif text-xl font-bold">Pagamentos Recebidos</h2>
              <Button size="sm" className="rounded-xl text-white text-xs"
                style={{ background: "linear-gradient(135deg,hsl(338,60%,38%),hsl(320,55%,32%))" }}
                onClick={() => { paymentForm.reset(); setIsAddPaymentOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" />Registrar
              </Button>
            </div>

            {/* By-method mini summary */}
            <div className="px-5 py-3 border-b flex gap-4 overflow-x-auto" style={{ borderColor: "hsl(340,25%,92%)" }}>
              {Object.entries(methodConfig).map(([m, c]) => (
                <div key={m} className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{c.label}</div>
                    <div className="text-sm font-bold">{formatCurrency(byMethod[m] || 0)}</div>
                  </div>
                </div>
              ))}
            </div>

            {loadingPayments ? (
              <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : payments && payments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow style={{ background: "hsl(22,60%,98%)" }}>
                      {["Data", "Cliente", "Serviço", "Profissional", "Forma", "Valor"].map(h => (
                        <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                          style={h === "Valor" ? { textAlign: "right" } : {}}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(p => {
                      const mc = methodConfig[p.paymentMethod];
                      return (
                        <TableRow key={p.id} className="hover:bg-muted/20">
                          <TableCell className="py-3.5">
                            <div className="font-medium text-sm">{format(new Date(p.paidAt), "d/MM", { locale: ptBR })}</div>
                            <div className="text-[11px] text-muted-foreground">{format(new Date(p.paidAt), "H:mm")}</div>
                          </TableCell>
                          <TableCell className="py-3.5 font-semibold text-sm">{p.clientName}</TableCell>
                          <TableCell className="py-3.5 text-sm text-muted-foreground">{p.serviceName}</TableCell>
                          <TableCell className="py-3.5 text-sm text-muted-foreground">{p.employeeName}</TableCell>
                          <TableCell className="py-3.5">
                            {mc && (
                              <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full w-fit"
                                style={{ background: mc.bg, color: mc.color }}>
                                {mc.icon}{mc.label}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5 text-right font-bold text-base" style={{ color: "hsl(338,60%,38%)" }}>
                            {formatCurrency(p.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Wallet className="h-10 w-10 text-muted-foreground/25 mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum pagamento neste mês.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── DESPESAS ── */}
        <TabsContent value="despesas" className="mt-4">
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(340,25%,90%)" }}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "hsl(340,25%,92%)" }}>
              <h2 className="font-serif text-xl font-bold">Despesas do Mês</h2>
              <Button size="sm" className="rounded-xl text-white text-xs"
                style={{ background: "linear-gradient(135deg,hsl(0,60%,45%),hsl(0,55%,38%))" }}
                onClick={() => { expenseForm.reset({ category: "supplies", paidAt: format(new Date(), "yyyy-MM-dd") }); setIsAddExpenseOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1" />Nova Despesa
              </Button>
            </div>

            {/* By-category mini summary */}
            {expenses && expenses.length > 0 && (
              <div className="px-5 py-3 border-b flex gap-4 overflow-x-auto" style={{ borderColor: "hsl(340,25%,92%)" }}>
                {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, total]) => {
                  const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.other;
                  const CatIcon = cfg.Icon;
                  return (
                    <div key={cat} className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cfg.bg, color: cfg.color }}>
                        <CatIcon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{cfg.label}</div>
                        <div className="text-sm font-bold">{formatCurrency(total)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {loadingExpenses ? (
              <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : expenses && expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow style={{ background: "hsl(22,60%,98%)" }}>
                      {["Data", "Descrição", "Categoria", "Observação", "Valor", ""].map((h, i) => (
                        <TableHead key={i} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                          style={h === "Valor" ? { textAlign: "right" } : {}}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map(e => {
                      const cfg = CATEGORY_CONFIG[e.category] ?? CATEGORY_CONFIG.other;
                      const CatIcon = cfg.Icon;
                      return (
                        <TableRow key={e.id} className="hover:bg-muted/20">
                          <TableCell className="py-3.5">
                            <div className="font-medium text-sm">{format(new Date(e.paidAt), "d/MM", { locale: ptBR })}</div>
                          </TableCell>
                          <TableCell className="py-3.5 font-semibold text-sm">{e.description}</TableCell>
                          <TableCell className="py-3.5">
                            <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full w-fit"
                              style={{ background: cfg.bg, color: cfg.color }}>
                              <CatIcon className="h-3 w-3" />{cfg.label}
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5 text-sm text-muted-foreground italic max-w-[160px] truncate">
                            {e.notes || "—"}
                          </TableCell>
                          <TableCell className="py-3.5 text-right font-bold text-base text-foreground">
                            {formatCurrency(e.amount)}
                          </TableCell>
                          <TableCell className="py-3.5 text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors ml-auto">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover Despesa</AlertDialogTitle>
                                  <AlertDialogDescription>Deseja remover "{e.description}"?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteExpense(e.id)} className="rounded-xl bg-destructive hover:bg-destructive/90">Remover</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground/25 mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma despesa registrada neste mês.</p>
                <button onClick={() => setIsAddExpenseOpen(true)} className="mt-3 text-xs font-semibold text-primary underline underline-offset-2">
                  Registrar primeira despesa
                </button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── RESUMO ── */}
        <TabsContent value="resumo" className="mt-4 space-y-4">
          {/* Profit summary card */}
          <div className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{ background: profit >= 0 ? "linear-gradient(135deg,hsl(150,55%,35%),hsl(170,50%,28%))" : "linear-gradient(135deg,hsl(0,60%,45%),hsl(0,55%,36%))", boxShadow: "0 8px 28px rgba(0,0,0,0.12)" }}>
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-10" style={{ background: "radial-gradient(circle,white,transparent 70%)" }} />
            <div className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Lucro Líquido — {monthLabel}</div>
            <div className="text-5xl font-black font-serif mb-3">{formatCurrency(profit)}</div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-white/50 text-[11px] font-bold uppercase tracking-wider mb-1">Receitas</div>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              </div>
              <div>
                <div className="text-white/50 text-[11px] font-bold uppercase tracking-wider mb-1">Despesas</div>
                <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue by method */}
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "hsl(340,25%,90%)" }}>
              <h3 className="font-serif text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />Receitas por Forma
              </h3>
              <div className="space-y-3">
                {Object.entries(methodConfig).map(([m, c]) => {
                  const v = byMethod[m] || 0;
                  const pct = totalRevenue > 0 ? (v / totalRevenue) * 100 : 0;
                  return (
                    <div key={m}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs" style={{ background: c.bg, color: c.color }}>
                            {c.icon}{c.label}
                          </span>
                        </div>
                        <span className="text-sm font-bold">{formatCurrency(v)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expenses by category */}
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "hsl(340,25%,90%)" }}>
              <h3 className="font-serif text-lg font-bold mb-4 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />Despesas por Categoria
              </h3>
              {Object.keys(byCat).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa registrada.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, total]) => {
                    const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.other;
                    const CatIcon = cfg.Icon;
                    const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                            <CatIcon className="h-3 w-3" />{cfg.label}
                          </div>
                          <span className="text-sm font-bold">{formatCurrency(total)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Add Expense Dialog ── */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Nova Despesa</DialogTitle>
          </DialogHeader>
          <Form {...expenseForm}>
            <form onSubmit={expenseForm.handleSubmit(onSubmitExpense)} className="space-y-4 mt-2">
              <FormField control={expenseForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição *</FormLabel><FormControl><Input className="rounded-xl" placeholder="ex: Tinta para cabelo" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={expenseForm.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$) *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-bold">R$</span>
                        <Input className="pl-9 rounded-xl" placeholder="0,00" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={expenseForm.control} name="paidAt" render={({ field }) => (
                  <FormItem><FormLabel>Data</FormLabel><FormControl><Input type="date" className="rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={expenseForm.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([v, cfg]) => (
                        <SelectItem key={v} value={v}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={expenseForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Observação</FormLabel><FormControl><Textarea className="rounded-xl resize-none" rows={2} placeholder="Fornecedor, nota fiscal..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" className="w-full rounded-xl h-11 text-white font-semibold"
                style={{ background: "linear-gradient(135deg,hsl(0,60%,45%),hsl(0,55%,38%))" }}
                disabled={createExpense.isPending}>
                {createExpense.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Despesa
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Add Payment Dialog ── */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="space-y-4 mt-2">
              <FormField control={paymentForm.control} name="appointmentId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Agendamento Concluído</FormLabel>
                  <Select onValueChange={onAptChange} value={field.value?.toString()}>
                    <FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o atendimento" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {completedApts?.map(a => (
                        <SelectItem key={a.id} value={a.id.toString()}>
                          {format(new Date(a.startsAt), "d/MM", { locale: ptBR })} — {a.clientName} ({a.serviceName})
                        </SelectItem>
                      ))}
                      {(!completedApts?.length) && <SelectItem value="none" disabled>Nenhum atendimento concluído</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={paymentForm.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">R$</span>
                        <Input className="pl-9 rounded-xl" placeholder="0,00" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={paymentForm.control} name="paymentMethod" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="pix">Pix</SelectItem>
                        <SelectItem value="card">Cartão</SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full rounded-xl h-11 text-white font-semibold"
                style={{ background: "linear-gradient(135deg,hsl(338,60%,38%),hsl(320,55%,32%))" }}
                disabled={createPayment.isPending}>
                {createPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Pagamento
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
