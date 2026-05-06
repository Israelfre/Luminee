import { 
  useGetDashboardSummary, 
  getGetDashboardSummaryQueryKey,
  useGetRevenueTrend,
  getGetRevenueTrendQueryKey,
  useGetTopServices,
  getGetTopServicesQueryKey,
  useGetUpcomingAppointments,
  getGetUpcomingAppointmentsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, TrendingUp, Users, Scissors, Loader2, Flower2, Star } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";

function formatCurrency(amount: string | number) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

const statusLabel: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusStyle: Record<string, string> = {
  scheduled: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  const { data: revenueTrend, isLoading: loadingTrend } = useGetRevenueTrend({
    query: { queryKey: getGetRevenueTrendQueryKey() }
  });
  const { data: topServices } = useGetTopServices({
    query: { queryKey: getGetTopServicesQueryKey() }
  });
  const { data: upcomingApps } = useGetUpcomingAppointments({
    query: { queryKey: getGetUpcomingAppointmentsQueryKey() }
  });

  if (loadingSummary || loadingTrend) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full opacity-20 animate-pulse" 
            style={{ background: "linear-gradient(135deg, hsl(338,60%,38%), hsl(35,70%,58%))" }} />
          <Loader2 className="h-8 w-8 animate-spin text-primary absolute inset-0 m-auto" />
        </div>
        <p className="text-muted-foreground text-sm">Carregando painel…</p>
      </div>
    );
  }

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground capitalize mb-1">{today}</p>
          <h1 className="text-4xl font-serif font-bold" 
            style={{ background: "linear-gradient(135deg, hsl(338,60%,32%), hsl(338,55%,48%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Bem-vinda de volta! ✨
          </h1>
          <p className="text-muted-foreground mt-1">Veja o que está acontecendo no seu salão hoje.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border"
          style={{ background: "linear-gradient(135deg, hsl(22,60%,97%), hsl(340,40%,96%))", borderColor: "hsl(340,25%,88%)" }}>
          <Flower2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Tudo certo por aqui</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Receita */}
        <div className="rounded-2xl p-5 text-white relative overflow-hidden shadow-lg"
          style={{ background: "linear-gradient(135deg, hsl(338,60%,38%) 0%, hsl(320,55%,30%) 100%)" }}>
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-xl bg-white/15">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Receita Hoje</span>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(summary?.todayRevenue || "0")}</div>
          <div className="text-xs text-white/60 mt-1.5">Mensal: {formatCurrency(summary?.monthRevenue || "0")}</div>
        </div>

        {/* Agendamentos */}
        <div className="rounded-2xl p-5 text-white relative overflow-hidden shadow-lg"
          style={{ background: "linear-gradient(135deg, hsl(35,70%,52%) 0%, hsl(20,65%,48%) 100%)" }}>
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }} />
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-xl bg-white/15">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Agendamentos</span>
          </div>
          <div className="text-3xl font-bold">{summary?.todayAppointments || 0}</div>
          <div className="text-xs text-white/60 mt-1.5">{summary?.completedToday || 0} concluídos hoje</div>
        </div>

        {/* Clientes */}
        <Card className="bella-card-glow border-border/50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-xl" style={{ background: "hsl(338,60%,95%)" }}>
                <Users className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Clientes</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{summary?.totalClients || 0}</div>
            <div className="text-xs text-muted-foreground mt-1.5">+{summary?.newClientsThisMonth || 0} novos este mês</div>
          </CardContent>
        </Card>

        {/* Equipe */}
        <Card className="bella-card-glow border-border/50 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 rounded-xl" style={{ background: "hsl(35,70%,93%)" }}>
                <Scissors className="h-5 w-5" style={{ color: "hsl(35,70%,45%)" }} />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Equipe</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{summary?.totalEmployees || 0}</div>
            <div className="text-xs text-muted-foreground mt-1.5">Profissionais ativas</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Revenue chart */}
        <Card className="lg:col-span-4 border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-xl">Receita — Últimos 7 Dias</CardTitle>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "hsl(338,60%,95%)", color: "hsl(338,60%,38%)" }}>
                <TrendingUp className="h-3 w-3" /> Receita
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend || []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(338,60%,38%)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="hsl(338,60%,38%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(new Date(val), 'd MMM', { locale: ptBR })}
                    axisLine={false} tickLine={false}
                    tick={{ fill: 'hsl(338,18%,48%)', fontSize: 11 }} dy={8}
                  />
                  <YAxis 
                    tickFormatter={(val) => `R$${val}`}
                    axisLine={false} tickLine={false}
                    tick={{ fill: 'hsl(338,18%,48%)', fontSize: 11 }} dx={-6}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(value), "Receita"]}
                    labelFormatter={(label) => format(new Date(label), "d 'de' MMMM", { locale: ptBR })}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(340,25%,90%)', boxShadow: '0 8px 24px rgba(160,60,90,0.12)', fontFamily: 'Nunito, sans-serif', fontSize: 13 }}
                  />
                  <Area 
                    type="monotone" dataKey="revenue" 
                    stroke="hsl(338,60%,38%)" strokeWidth={2.5}
                    fillOpacity={1} fill="url(#colorRevenue)" 
                    dot={{ fill: 'hsl(338,60%,38%)', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(338,60%,38%)', stroke: 'white', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top services */}
        <Card className="lg:col-span-3 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="font-serif text-xl">Serviços em Alta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {topServices?.map((service, index) => (
                <div key={service.serviceId} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                    style={{ background: index === 0 ? "linear-gradient(135deg, hsl(35,70%,52%), hsl(20,65%,48%))" : index === 1 ? "linear-gradient(135deg, hsl(338,60%,40%), hsl(320,55%,35%))" : "hsl(338,20%,75%)" }}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{service.serviceName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="h-1.5 rounded-full flex-1 overflow-hidden" style={{ background: "hsl(340,25%,92%)" }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ 
                            width: `${Math.min(100, (service.count / (topServices[0]?.count || 1)) * 100)}%`,
                            background: "linear-gradient(90deg, hsl(338,60%,38%), hsl(35,70%,52%))"
                          }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{service.count}x</span>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-primary">{formatCurrency(service.revenue)}</div>
                </div>
              ))}
              {(!topServices || topServices.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum dado ainda</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming appointments */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-xl">Próximos Atendimentos</CardTitle>
            <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary bg-primary/5">
              Hoje
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {upcomingApps && upcomingApps.length > 0 ? (
            <div className="divide-y divide-border/40">
              {upcomingApps.map((app, idx) => (
                <div key={app.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-shrink-0 w-14 text-center">
                    <div className="text-xs text-muted-foreground">{format(new Date(app.startsAt), 'a', { locale: ptBR })}</div>
                    <div className="text-2xl font-bold font-serif text-primary leading-none">{format(new Date(app.startsAt), 'H:mm')}</div>
                  </div>
                  <div className="w-px h-10 bg-gradient-to-b from-transparent via-border to-transparent" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{app.clientName}</p>
                    <p className="text-sm text-muted-foreground truncate">{app.serviceName} <span className="text-primary/70">·</span> {app.employeeName}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyle[app.status] || "bg-muted text-muted-foreground"}`}>
                    {statusLabel[app.status] ?? app.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 rounded-full mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(22,60%,95%), hsl(340,40%,95%))" }}>
                <Calendar className="h-7 w-7 text-primary/60" />
              </div>
              <h3 className="font-serif text-lg font-medium">Nenhum agendamento hoje</h3>
              <p className="text-sm text-muted-foreground mt-1">A agenda está livre por enquanto.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
