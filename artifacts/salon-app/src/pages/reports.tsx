import { useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Scissors,
  Download, Calendar, CreditCard, Banknote, Smartphone,
  ArrowUpRight, BarChart3, Percent, ChevronDown, ChevronUp,
  Loader2, FileText,
} from "lucide-react";
import { salonHeaders } from "@/contexts/salon-auth-context";
import { API_PREFIX } from "@/lib/api-url";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FinancialReport {
  period: { from: string; to: string };
  summary: { totalRevenue: string; totalExpenses: string; netProfit: string };
  byService: { serviceId: number; serviceName: string; count: number; revenue: string }[];
  byEmployee: { employeeId: number; employeeName: string; commissionPct: number; count: number; revenue: string; commissionAmount: string }[];
  byMethod: { method: string; count: number; revenue: string }[];
  expensesByCategory: { category: string; total: string; count: number }[];
}

interface CommissionReport {
  employee: { id: number; name: string; commissionPct: number };
  totalRevenue: string;
  commissionAmount: string;
  appointmentCount: number;
  appointments: { id: number; startsAt: string; serviceName: string; clientName: string; paymentAmount: string; commissionAmount: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (v: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(String(v)));

const METHOD_LABEL: Record<string, string> = {
  cash: "Dinheiro", pix: "Pix", credit: "Crédito", debit: "Débito", transfer: "Transferência", card: "Cartão",
};
const METHOD_ICON: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  pix: <Smartphone className="h-4 w-4" />,
  credit: <CreditCard className="h-4 w-4" />,
  debit: <CreditCard className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  transfer: <ArrowUpRight className="h-4 w-4" />,
};
const CAT_LABEL: Record<string, string> = {
  supplies: "Insumos", rent: "Aluguel", utilities: "Água/Luz", salaries: "Salários",
  marketing: "Marketing", equipment: "Equipamentos", other: "Outros",
};

function fetchReport(path: string, from: string, to: string) {
  return fetch(`${API_PREFIX}/reports/${path}?from=${from}&to=${to}`, {
    headers: salonHeaders(), credentials: "include",
  }).then(r => r.json());
}

// ─── Export CSV ───────────────────────────────────────────────────────────────
function exportCSV(filename: string, rows: string[][], headers: string[]) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [tab, setTab] = useState<"financial" | "commissions">("financial");
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return {
      from: format(startOfMonth(now), "yyyy-MM-dd"),
      to: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  });
  const [expandedEmp, setExpandedEmp] = useState<number | null>(null);

  const { data: financial, isLoading: loadingF } = useQuery<FinancialReport>({
    queryKey: ["reports", "financial", period.from, period.to],
    queryFn: () => fetchReport("financial", period.from, period.to),
    enabled: tab === "financial",
  });

  const { data: commissions, isLoading: loadingC } = useQuery<CommissionReport[]>({
    queryKey: ["reports", "commissions", period.from, period.to],
    queryFn: () => fetchReport("commissions", period.from, period.to),
    enabled: tab === "commissions",
  });

  const setPreset = (months: number) => {
    const d = subMonths(new Date(), months);
    setPeriod({ from: format(startOfMonth(d), "yyyy-MM-dd"), to: format(endOfMonth(d), "yyyy-MM-dd") });
  };

  const exportFinancial = () => {
    if (!financial) return;
    exportCSV("relatorio-financeiro.csv",
      financial.byService.map(s => [s.serviceName, String(s.count), s.revenue]),
      ["Serviço", "Atendimentos", "Receita"]);
  };

  const exportCommissions = () => {
    if (!commissions) return;
    const rows = commissions.flatMap(c =>
      c.appointments.map(a => [
        c.employee.name,
        format(new Date(a.startsAt), "dd/MM/yyyy"),
        a.clientName,
        a.serviceName,
        a.paymentAmount,
        `${c.employee.commissionPct}%`,
        a.commissionAmount,
      ])
    );
    exportCSV("comissoes.csv", rows,
      ["Funcionária", "Data", "Cliente", "Serviço", "Valor", "Comissão %", "Comissão R$"]);
  };

  const loading = tab === "financial" ? loadingF : loadingC;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[2.6rem] font-serif font-bold leading-none"
            style={{ background: "linear-gradient(135deg,hsl(338,62%,30%),hsl(338,60%,55%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Análise financeira e comissões da equipe</p>
        </div>
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={tab === "financial" ? exportFinancial : exportCommissions}
          className="flex items-center gap-2 px-4 h-10 rounded-2xl text-sm font-semibold text-white shadow-md hover:opacity-90"
          style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
          <Download className="h-4 w-4" /> Exportar CSV
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([["financial", "Financeiro", BarChart3], ["commissions", "Comissões", Percent]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all"
            style={tab === key
              ? { background: "hsl(338,62%,38%)", color: "white" }
              : { background: "hsl(338,60%,96%)", color: "hsl(338,60%,38%)" }}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        {[["Mês atual", 0], ["Mês passado", 1], ["2 meses atrás", 2]].map(([label, months]) => (
          <button key={String(months)} onClick={() => setPreset(Number(months))}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
            style={{ borderColor: "hsl(340,20%,88%)", background: "hsl(338,60%,97%)", color: "hsl(338,60%,38%)" }}>
            {label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-2">
          <input type="date" value={period.from} onChange={e => setPeriod(p => ({ ...p, from: e.target.value }))}
            className="px-3 py-1.5 rounded-xl text-xs border outline-none" style={{ borderColor: "hsl(340,20%,88%)" }} />
          <span className="text-xs text-muted-foreground">até</span>
          <input type="date" value={period.to} onChange={e => setPeriod(p => ({ ...p, to: e.target.value }))}
            className="px-3 py-1.5 rounded-xl text-xs border outline-none" style={{ borderColor: "hsl(340,20%,88%)" }} />
        </div>
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tab === "financial" && financial ? (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Receita Total", value: financial.summary.totalRevenue, Icon: TrendingUp, color: "hsl(338,62%,38%)", bg: "linear-gradient(135deg,hsl(338,60%,38%),hsl(318,55%,32%))", text: "white" },
              { label: "Despesas", value: financial.summary.totalExpenses, Icon: TrendingDown, color: "hsl(0,60%,45%)", bg: "linear-gradient(135deg,hsl(0,60%,45%),hsl(0,55%,38%))", text: "white" },
              { label: "Lucro Líquido", value: financial.summary.netProfit, Icon: DollarSign, color: parseFloat(financial.summary.netProfit) >= 0 ? "hsl(142,55%,35%)" : "hsl(0,60%,45%)", bg: parseFloat(financial.summary.netProfit) >= 0 ? "linear-gradient(135deg,hsl(142,55%,38%),hsl(162,50%,32%))" : "linear-gradient(135deg,hsl(0,60%,45%),hsl(0,55%,38%))", text: "white" },
            ].map(({ label, value, Icon, bg, text }) => (
              <div key={label} className="rounded-2xl p-5 text-white shadow-lg" style={{ background: bg }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-white/20"><Icon className="h-5 w-5" /></div>
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</span>
                </div>
                <div className="text-3xl font-bold">{fmt$(value)}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por serviço */}
            <div className="bg-white rounded-3xl border shadow-sm p-6" style={{ borderColor: "hsl(340,20%,90%)" }}>
              <div className="flex items-center gap-2 mb-5">
                <Scissors className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-lg font-semibold">Receita por Serviço</h2>
              </div>
              <div className="space-y-3">
                {financial.byService.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado no período</p>}
                {financial.byService.map((s, i) => {
                  const max = parseFloat(financial.byService[0]?.revenue ?? "1");
                  const pct = (parseFloat(s.revenue) / max) * 100;
                  return (
                    <div key={s.serviceId}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{s.serviceName}</span>
                        <div className="flex gap-3">
                          <span className="text-muted-foreground">{s.count}x</span>
                          <span className="font-bold text-primary">{fmt$(s.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(340,20%,92%)" }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }}
                          style={{ background: "linear-gradient(90deg,hsl(338,62%,38%),hsl(35,70%,52%))" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Por funcionária */}
            <div className="bg-white rounded-3xl border shadow-sm p-6" style={{ borderColor: "hsl(340,20%,90%)" }}>
              <div className="flex items-center gap-2 mb-5">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-lg font-semibold">Receita por Funcionária</h2>
              </div>
              <div className="space-y-3">
                {financial.byEmployee.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado no período</p>}
                {financial.byEmployee.map(e => (
                  <div key={e.employeeId} className="flex items-center justify-between p-3 rounded-2xl" style={{ background: "hsl(338,60%,97%)" }}>
                    <div>
                      <p className="font-semibold text-sm">{e.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{e.count} atendimentos · {e.commissionPct}% comissão</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{fmt$(e.revenue)}</p>
                      <p className="text-xs text-muted-foreground">Comissão: {fmt$(e.commissionAmount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Por método de pagamento */}
            <div className="bg-white rounded-3xl border shadow-sm p-6" style={{ borderColor: "hsl(340,20%,90%)" }}>
              <div className="flex items-center gap-2 mb-5">
                <CreditCard className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-lg font-semibold">Por Forma de Pagamento</h2>
              </div>
              <div className="space-y-2">
                {financial.byMethod.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado no período</p>}
                {financial.byMethod.map(m => (
                  <div key={m.method} className="flex items-center justify-between p-3 rounded-2xl" style={{ background: "hsl(338,60%,97%)" }}>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg" style={{ background: "hsl(338,60%,92%)", color: "hsl(338,60%,38%)" }}>
                        {METHOD_ICON[m.method] ?? <DollarSign className="h-4 w-4" />}
                      </div>
                      <span className="font-medium text-sm">{METHOD_LABEL[m.method] ?? m.method}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{fmt$(m.revenue)}</p>
                      <p className="text-xs text-muted-foreground">{m.count} pagamentos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Despesas por categoria */}
            <div className="bg-white rounded-3xl border shadow-sm p-6" style={{ borderColor: "hsl(340,20%,90%)" }}>
              <div className="flex items-center gap-2 mb-5">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-lg font-semibold">Despesas por Categoria</h2>
              </div>
              <div className="space-y-2">
                {financial.expensesByCategory.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhuma despesa no período</p>}
                {financial.expensesByCategory.map(e => (
                  <div key={e.category} className="flex items-center justify-between p-3 rounded-2xl" style={{ background: "hsl(0,0%,97%)" }}>
                    <span className="font-medium text-sm">{CAT_LABEL[e.category] ?? e.category}</span>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{fmt$(e.total)}</p>
                      <p className="text-xs text-muted-foreground">{e.count} lançamentos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : tab === "commissions" && commissions ? (
        <div className="space-y-4">
          {/* Resumo de comissões */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl p-5 shadow-lg text-white" style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-2">Total em Comissões</p>
              <p className="text-3xl font-bold">
                {fmt$(commissions.reduce((s, c) => s + parseFloat(c.commissionAmount), 0).toFixed(2))}
              </p>
            </div>
            <div className="rounded-2xl p-5 shadow-sm bg-white border" style={{ borderColor: "hsl(340,20%,90%)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Funcionárias</p>
              <p className="text-3xl font-bold">{commissions.filter(c => c.appointmentCount > 0).length}</p>
              <p className="text-xs text-muted-foreground">com atendimentos</p>
            </div>
            <div className="rounded-2xl p-5 shadow-sm bg-white border" style={{ borderColor: "hsl(340,20%,90%)" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Atendimentos</p>
              <p className="text-3xl font-bold">{commissions.reduce((s, c) => s + c.appointmentCount, 0)}</p>
              <p className="text-xs text-muted-foreground">no período</p>
            </div>
          </div>

          {/* Lista de funcionárias */}
          <div className="space-y-3">
            {commissions.map(c => (
              <div key={c.employee.id} className="bg-white rounded-3xl border shadow-sm overflow-hidden" style={{ borderColor: "hsl(340,20%,90%)" }}>
                <button className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedEmp(expandedEmp === c.employee.id ? null : c.employee.id)}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
                      {c.employee.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{c.employee.name}</p>
                      <p className="text-xs text-muted-foreground">{c.employee.commissionPct}% comissão · {c.appointmentCount} atendimentos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Receita gerada</p>
                      <p className="font-bold">{fmt$(c.totalRevenue)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Comissão</p>
                      <p className="font-bold text-primary">{fmt$(c.commissionAmount)}</p>
                    </div>
                    {expandedEmp === c.employee.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedEmp === c.employee.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="overflow-hidden border-t" style={{ borderColor: "hsl(340,20%,92%)" }}>
                      <div className="p-4 space-y-2">
                        {c.appointments.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">Nenhum atendimento pago no período</p>
                        )}
                        {c.appointments.map(a => (
                          <div key={a.id} className="flex items-center justify-between p-3 rounded-2xl text-sm"
                            style={{ background: "hsl(338,60%,97%)" }}>
                            <div>
                              <p className="font-medium">{a.clientName} · {a.serviceName}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(a.startsAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{fmt$(a.paymentAmount)}</p>
                              <p className="text-xs text-primary font-bold">+{fmt$(a.commissionAmount)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
