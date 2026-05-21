import { useState } from "react";
import {
  useListClients, getListClientsQueryKey,
  useCreateClient, useUpdateClient, useDeleteClient,
  useGetClientAppointments, getGetClientAppointmentsQueryKey,
  useUpdateAppointment, useCreatePayment,
  getListPaymentsQueryKey,
  getClient, AppointmentDetail,
  useGetSalon, getGetSalonQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Plus, Search, User, Phone, Mail, FileText,
  CalendarDays, Trash2, Heart, MessageCircle, AlertCircle,
  Banknote, CreditCard, Smartphone, ArrowLeftRight, Check,
  ChevronRight, Star, Pencil, UserCheck, Zap, Gift,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { salonHeaders } from "@/contexts/salon-auth-context";
import { API_PREFIX } from "@/lib/api-url";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── Constants ────────────────────────────────────────────────────────────────

const cSchema = z.object({
  name: z.string().min(2, "Obrigatório"),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  whatsapp: z.string().optional(),
  notes: z.string().optional(),
});
type CForm = z.infer<typeof cSchema>;

const PAY_METHODS = [
  { v: "cash",     label: "Dinheiro",  Icon: Banknote },
  { v: "pix",      label: "Pix",       Icon: Smartphone },
  { v: "credit",   label: "Crédito",   Icon: CreditCard },
  { v: "debit",    label: "Débito",    Icon: CreditCard },
  { v: "transfer", label: "Transf.",   Icon: ArrowLeftRight },
];
const PM_LABEL: Record<string, string> = {
  cash: "Dinheiro", pix: "Pix", credit: "Crédito", debit: "Débito", transfer: "Transferência",
};
const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendado", confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado",
};

const GRADIENTS = [
  ["hsl(338,65%,42%)", "hsl(315,60%,35%)"],
  ["hsl(28,75%,48%)", "hsl(15,70%,42%)"],
  ["hsl(278,55%,46%)", "hsl(300,50%,38%)"],
  ["hsl(198,60%,42%)", "hsl(220,55%,36%)"],
  ["hsl(162,52%,38%)", "hsl(178,48%,32%)"],
];
const grad = (id: number) => {
  const [a, b] = GRADIENTS[Math.abs(id) % GRADIENTS.length];
  return `linear-gradient(135deg,${a},${b})`;
};
const initial = (name: string) => name.charAt(0).toUpperCase();
const toCard = (m: string) => m === "credit" || m === "debit" || m === "transfer" ? "card" : m;
const fmt$ = (v?: string | null) => `R$\u00a0${parseFloat(v ?? "0").toFixed(2)}`;

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PayModal({ apt, onClose, onConfirm, busy }: {
  apt: AppointmentDetail; onClose(): void;
  onConfirm(m: string, a: string): void; busy: boolean;
}) {
  const [method, setMethod] = useState("pix");
  const [amt, setAmt] = useState(parseFloat(apt.paymentAmount ?? apt.servicePrice ?? "0").toFixed(2));

  return (
    <Dialog open onOpenChange={() => !busy && onClose()}>
      <DialogContent className="p-0 overflow-hidden rounded-3xl sm:max-w-[420px]">
        <div className="px-6 pt-6 pb-5" style={{ background: "linear-gradient(135deg,hsl(338,60%,96%),hsl(22,55%,95%))" }}>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Quitar Dívida</DialogTitle>
          </DialogHeader>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[["Serviço", apt.serviceName], ["Data", format(new Date(apt.startsAt), "d/MM/yyyy")]].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k}</p>
                <p className="mt-0.5 font-semibold">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">Valor (R$)</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm select-none">R$</span>
              <Input type="number" step="0.01" min="0" value={amt} onChange={e => setAmt(e.target.value)}
                className="pl-11 h-12 rounded-2xl text-xl font-black border-2 focus:border-primary/50" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2.5">Forma de pagamento</p>
            <div className="grid grid-cols-5 gap-2">
              {PAY_METHODS.map(({ v, label, Icon }) => {
                const on = method === v;
                return (
                  <motion.button key={v} type="button" onClick={() => setMethod(v)} whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-[11px] font-bold transition-colors"
                    style={on ? { borderColor: "hsl(338,62%,38%)", background: "hsl(338,62%,38% / 0.08)", color: "hsl(338,62%,38%)" } : { borderColor: "hsl(var(--border)/0.6)", color: "hsl(var(--muted-foreground))" }}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </motion.button>
                );
              })}
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => onConfirm(method, amt)} disabled={busy}
            className="w-full h-12 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirmar {fmt$(amt)}
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Client Form ──────────────────────────────────────────────────────────────

function ClientFormFields({ form, onSubmit, busy, label }: {
  form: ReturnType<typeof useForm<CForm>>;
  onSubmit(d: CForm): void;
  busy: boolean; label: string;
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Nome *</FormLabel>
            <FormControl><Input className="rounded-xl" placeholder="Nome completo" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          {([["phone", "Telefone", "(11) 9xxxx-xxxx"], ["whatsapp", "WhatsApp", "(11) 9xxxx-xxxx"]] as const).map(([n, l, p]) => (
            <FormField key={n} control={form.control} name={n} render={({ field }) => (
              <FormItem><FormLabel>{l}</FormLabel>
                <FormControl><Input className="rounded-xl" placeholder={p} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          ))}
        </div>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>E-mail</FormLabel>
            <FormControl><Input type="email" className="rounded-xl" placeholder="email@exemplo.com" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Observações</FormLabel>
            <FormControl><Textarea className="rounded-xl resize-none" rows={3} placeholder="Alergias, preferências..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={busy}
          className="w-full h-11 rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {label}
        </motion.button>
      </form>
    </Form>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Clients() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"todos" | "ativo" | "gratuito">("todos");
  const [selId, setSelId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [payApt, setPayApt] = useState<AppointmentDetail | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [planBusy, setPlanBusy] = useState<number | null>(null);
  const qc = useQueryClient();
  const { data: salon } = useGetSalon({ query: { queryKey: getGetSalonQueryKey(), retry: false } });

    ? `${window.location.origin}${basePath}/cadastro?s=${salon.id}`
    : `${window.location.origin}${basePath}/cadastro`;

    );
  };

  const { data: clients, isLoading } = useListClients(
    search ? { search } : undefined,
    { query: { queryKey: getListClientsQueryKey(search ? { search } : undefined) } }
  );
  const { data: detail } = useQuery({
    queryKey: ["client", selId],
    queryFn: () => getClient(selId!),
    enabled: !!selId,
  });
  const { data: history } = useGetClientAppointments(selId!, {
    query: { enabled: !!selId, queryKey: getGetClientAppointmentsQueryKey(selId!) },
  });

  const filteredClients = clients?.filter(c => {
    if (planFilter === "todos") return true;
    return (c as unknown as { plan?: string }).plan === planFilter;
  });

  const togglePlan = async (id: number, currentPlan: string) => {
    const newPlan = currentPlan === "ativo" ? "gratuito" : "ativo";
    setPlanBusy(id);
    try {
      await fetch(`${API_PREFIX}/clients/${id}/plan`, {
        method: "PATCH",
        headers: salonHeaders(),
        credentials: "include",
        body: JSON.stringify({ plan: newPlan }),
      });
      toast.success(`Plano alterado para ${newPlan === "ativo" ? "Ativo ⚡" : "Gratuito 🎁"}`);
      qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
    } catch { toast.error("Erro ao alterar plano"); }
    finally { setPlanBusy(null); }
  };

  const createCl = useCreateClient();
  const updateCl = useUpdateClient();
  const deleteCl = useDeleteClient();
  const updateApt = useUpdateAppointment();
  const createPay = useCreatePayment();

  const form = useForm<CForm>({
    resolver: zodResolver(cSchema),
    defaultValues: { name: "", phone: "", email: "", whatsapp: "", notes: "" },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
    if (selId) {
      qc.invalidateQueries({ queryKey: getGetClientAppointmentsQueryKey(selId) });
      qc.invalidateQueries({ queryKey: ["client", selId] });
    }
  };

  const onAdd = (d: CForm) => {
    createCl.mutate({ data: d }, {
      onSuccess: () => { toast.success("Cliente cadastrada!"); invalidate(); setAddOpen(false); form.reset(); },
      onError: () => toast.error("Erro ao cadastrar"),
    });
  };

  const onEdit = (d: CForm) => {
    if (!selId) return;
    updateCl.mutate({ id: selId, data: d }, {
      onSuccess: () => { toast.success("Cliente atualizada!"); invalidate(); setEditOpen(false); },
      onError: () => toast.error("Erro ao atualizar"),
    });
  };

  const onDelete = (id: number) => {
    deleteCl.mutate({ id }, {
      onSuccess: () => {
        toast.success("Cliente removida");
        invalidate();
        if (selId === id) setSelId(null);
      },
      onError: () => toast.error("Erro ao remover"),
    });
  };

  const onPayConfirm = async (method: string, amt: string) => {
    if (!payApt) return;
    setPayBusy(true);
    try {
      await createPay.mutateAsync({ data: { appointmentId: payApt.id, amount: amt, paymentMethod: toCard(method) as "cash" | "pix" | "card" } });
      await updateApt.mutateAsync({ id: payApt.id, data: { paymentStatus: "paid", paymentMethod: method as "cash" | "pix" | "credit" | "debit" | "transfer", paymentAmount: amt } });
      toast.success(`Pagamento de ${fmt$(amt)} registrado! ✅`);
      invalidate();
      qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      setPayApt(null);
    } catch { toast.error("Erro ao registrar"); }
    finally { setPayBusy(false); }
  };

  const debts = (history ?? []).filter(a => a.paymentStatus === "pending");
  const totalDebt = debts.reduce((s, a) => s + parseFloat(a.paymentAmount ?? a.servicePrice ?? "0"), 0);
  const completedCnt = (history ?? []).filter(a => a.status === "completed").length;
  const detailGrad = grad(selId ?? 0);

  return (
    <div className="space-y-5">
      <AnimatePresence>
        {payApt && <PayModal apt={payApt} onClose={() => setPayApt(null)} onConfirm={onPayConfirm} busy={payBusy} />}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[2.6rem] font-serif font-bold leading-none"
            style={{ background: "linear-gradient(135deg,hsl(338,62%,30%),hsl(338,60%,55%))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Clientes
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Gerencie sua carteira de clientes</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome..." className="pl-9 rounded-2xl"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { form.reset(); setAddOpen(true); }}
            className="flex items-center gap-2 px-4 h-10 rounded-2xl text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity whitespace-nowrap"
            style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
            <Plus className="h-4 w-4" />Nova Cliente
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* Client list */}
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col"
          style={{ height: "calc(100vh - 11rem)", borderColor: "hsl(340,20%,90%)" }}>
          <div className="px-4 py-3 border-b flex-shrink-0 space-y-2"
            style={{ borderColor: "hsl(340,20%,92%)" }}>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4" style={{ color: "hsl(338,62%,45%)" }} />
              <span className="font-semibold text-sm">{filteredClients?.length ?? 0} clientes</span>
            </div>
            <div className="flex gap-1">
              {([
                { key: "todos", label: "Todos", Icon: null },
                { key: "ativo", label: "Ativos", Icon: Zap },
                { key: "gratuito", label: "Gratuitos", Icon: Gift },
              ] as const).map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setPlanFilter(key)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={planFilter === key
                    ? { background: key === "ativo" ? "hsl(142,60%,92%)" : key === "gratuito" ? "hsl(220,60%,94%)" : "hsl(338,60%,94%)", color: key === "ativo" ? "hsl(142,55%,30%)" : key === "gratuito" ? "hsl(220,55%,38%)" : "hsl(338,60%,38%)" }
                    : { background: "transparent", color: "hsl(var(--muted-foreground))" }}>
                  {Icon && <Icon className="h-2.5 w-2.5" />}
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredClients && filteredClients.length > 0 ? (
              <div>
                {filteredClients.map((c, i) => {
                  const on = selId === c.id;
                  const cAny = c as unknown as { plan?: string; selfRegistered?: boolean };
                  const plan = cAny.plan ?? "gratuito";
                  const isAtivo = plan === "ativo";
                  return (
                    <motion.button key={c.id} onClick={() => setSelId(c.id)}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border/20 transition-all duration-150 ${on ? "border-l-[3px] border-l-primary" : "border-l-[3px] border-l-transparent hover:bg-slate-50"}`}
                      style={on ? { background: "hsl(338,60%,97%)" } : {}}>
                      <div className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-sm"
                        style={{ background: grad(c.id) }}>
                        {initial(c.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                          {cAny.selfRegistered && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0"
                              style={{ background: "hsl(338,60%,95%)", color: "hsl(338,60%,38%)" }}>
                              <UserCheck className="h-2.5 w-2.5" />Auto
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3" />{c.phone || "Sem telefone"}
                          {c.whatsapp && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-bold"
                              style={{ background: "#dcfce7", color: "#15803d" }}>
                              <MessageCircle className="h-2 w-2" />WA
                            </span>
                          )}
                        </p>
                      </div>
                      {/* Plan toggle */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={e => { e.stopPropagation(); togglePlan(c.id, plan); }}
                        disabled={planBusy === c.id}
                        title={isAtivo ? "Clique para tornar Gratuito" : "Clique para tornar Ativo"}
                        className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold flex-shrink-0 transition-all hover:scale-105"
                        style={isAtivo
                          ? { background: "hsl(142,60%,92%)", color: "hsl(142,55%,30%)" }
                          : { background: "hsl(220,55%,93%)", color: "hsl(220,50%,40%)" }}>
                        {planBusy === c.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : isAtivo ? <><Zap className="h-3 w-3" />Ativo</> : <><Gift className="h-3 w-3" />Grátis</>}
                      </motion.button>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/30" />
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                <User className="h-8 w-8 text-muted-foreground/25 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma cliente encontrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence mode="wait">
          {selId && detail ? (
            <motion.div key={selId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col"
              style={{ height: "calc(100vh - 11rem)", borderColor: "hsl(340,20%,90%)" }}>
              {/* Header */}
              <div className="flex-shrink-0 relative" style={{ background: detailGrad, minHeight: 100 }}>
                {/* Subtle radial highlight */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(circle at 80% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)" }} />
                <div className="absolute top-3 right-3 flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }}
                    className="h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                    onClick={() => { form.reset({ name: detail.name, phone: detail.phone ?? "", email: detail.email ?? "", whatsapp: detail.whatsapp ?? "", notes: detail.notes ?? "" }); setEditOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />Editar
                  </motion.button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <motion.button whileTap={{ scale: 0.95 }}
                        className="h-8 w-8 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-red-400/25 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir {detail.name}?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(detail.id)} className="rounded-xl bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Avatar + name overlap */}
              <div className="flex-shrink-0 px-6 pb-4 relative z-10" style={{ marginTop: "-2.5rem" }}>
                <div className="flex items-end gap-4">
                  <div className="w-20 h-20 rounded-2xl border-4 border-white flex items-center justify-center text-3xl font-serif font-bold text-white shadow-xl flex-shrink-0"
                    style={{ background: detailGrad }}>
                    {initial(detail.name)}
                  </div>
                  <div className="pb-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-serif font-bold text-foreground">{detail.name}</h2>
                      {debts.length > 0 && (
                        <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: "#fee2e2", color: "#b91c1c" }}>
                          <AlertCircle className="h-3 w-3" />Devedora · {fmt$(totalDebt.toFixed(2))}
                        </motion.span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cliente desde {format(new Date(detail.createdAt), "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* Stats pills */}
                <div className="flex gap-2 mt-3">
                  {[
                    { Icon: Star, v: completedCnt, l: "Atendimentos concluídos" },
                    { Icon: CalendarDays, v: history?.length ?? 0, l: "Total de agendamentos" },
                  ].map(({ Icon, v, l }) => (
                    <div key={l} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm"
                      style={{ background: "hsl(22,60%,97%)" }}>
                      <Icon className="h-3.5 w-3.5 text-primary/50" />
                      <span className="font-black text-foreground">{v}</span>
                      <span className="text-xs text-muted-foreground">{l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
                {/* Debts banner */}
                <AnimatePresence>
                  {debts.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="rounded-2xl overflow-hidden border-2" style={{ borderColor: "#fca5a5" }}>
                      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "#fee2e2" }}>
                        <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#b91c1c" }} />
                        <span className="font-bold text-sm" style={{ color: "#b91c1c" }}>
                          {debts.length} dívida{debts.length > 1 ? "s" : ""} · Total {fmt$(totalDebt.toFixed(2))}
                        </span>
                      </div>
                      <div style={{ background: "#fff5f5" }}>
                        {debts.map((a, i) => (
                          <div key={a.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-red-100" : ""}`}>
                            <div>
                              <p className="font-semibold text-sm">{a.serviceName}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(a.startsAt), "d/MM/yyyy 'às' H:mm")}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-sm" style={{ color: "#b91c1c" }}>{fmt$(a.paymentAmount ?? a.servicePrice)}</span>
                              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setPayApt(a)}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold text-white"
                                style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
                                <Banknote className="h-3.5 w-3.5" />Quitar
                              </motion.button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Contact */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Contato</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Phone */}
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm"
                        style={{ background: "hsl(22,60%,97%)" }}>
                        <Phone className="h-4 w-4 text-primary/50 flex-shrink-0" />
                        <span className="truncate text-sm">{detail.phone || <em className="text-muted-foreground text-xs not-italic">Sem telefone</em>}</span>
                      </div>
                      {/* Email */}
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm"
                        style={{ background: "hsl(22,60%,97%)" }}>
                        <Mail className="h-4 w-4 text-primary/50 flex-shrink-0" />
                        <span className="truncate text-sm">{detail.email || <em className="text-muted-foreground text-xs not-italic">Sem e-mail</em>}</span>
                      </div>
                    </div>
                    {/* WhatsApp */}
                    {detail.whatsapp ? (
                      <a href={`https://wa.me/${detail.whatsapp.replace(/\D/g, "").startsWith("55") ? detail.whatsapp.replace(/\D/g, "") : "55" + detail.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Olá " + detail.name + "! 🌸 Entrando em contato.")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm hover:shadow-sm hover:-translate-y-0.5 transition-all"
                        style={{ background: "#dcfce7" }}>
                        <MessageCircle className="h-4 w-4 flex-shrink-0" style={{ color: "#16a34a" }} />
                        <span className="font-medium text-green-800 flex-1">{detail.whatsapp}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#25D366" }}>
                          Conversa
                        </span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm"
                        style={{ background: "hsl(22,60%,97%)" }}>
                        <MessageCircle className="h-4 w-4 text-muted-foreground/25 flex-shrink-0" />
                        <em className="text-muted-foreground text-xs not-italic">Sem WhatsApp — edite para adicionar</em>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {detail.notes && (
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Observações</h3>
                    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-2xl text-sm"
                      style={{ background: "hsl(40,80%,97%)", border: "1px solid hsl(40,60%,89%)", color: "hsl(40,50%,30%)" }}>
                      <FileText className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-60" />
                      <p>{detail.notes}</p>
                    </div>
                  </div>
                )}

                {/* History */}
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                    Histórico de Atendimentos ({history?.length ?? 0})
                  </h3>
                  {history && history.length > 0 ? (
                    <div className="space-y-2">
                      {[...history].reverse().map((a, i) => {
                        const paid = a.paymentStatus === "paid";
                        const pend = a.paymentStatus === "pending";
                        const sc = a.status === "completed" ? ["bg-emerald-100", "text-emerald-700"]
                          : a.status === "cancelled" ? ["bg-red-100", "text-red-600"]
                          : ["bg-amber-100", "text-amber-700"];
                        return (
                          <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                            className="flex items-center gap-3 p-3.5 rounded-2xl border transition-all hover:shadow-sm"
                            style={{ borderColor: pend ? "#fca5a5" : "hsl(340,20%,91%)", background: pend ? "#fff5f5" : "white" }}>
                            {/* Date bubble */}
                            <div className="text-center px-2.5 py-2 rounded-xl min-w-[48px] flex-shrink-0"
                              style={{ background: "linear-gradient(135deg,hsl(338,60%,95%),hsl(22,60%,95%))" }}>
                              <p className="text-[9px] font-black uppercase text-muted-foreground leading-none">{format(new Date(a.startsAt), "MMM", { locale: ptBR })}</p>
                              <p className="text-xl font-black font-serif leading-none mt-0.5" style={{ color: "hsl(338,62%,38%)" }}>
                                {format(new Date(a.startsAt), "d")}
                              </p>
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{a.serviceName}</p>
                              <p className="text-xs text-muted-foreground">{a.employeeName} · {format(new Date(a.startsAt), "H:mm")}</p>
                              {paid && a.paymentMethod && (
                                <p className="text-[10px] text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
                                  <Check className="h-2.5 w-2.5" />
                                  Pago · {PM_LABEL[a.paymentMethod] ?? a.paymentMethod} · {fmt$(a.paymentAmount ?? a.servicePrice)}
                                </p>
                              )}
                            </div>
                            {/* Right */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {pend && (
                                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setPayApt(a)}
                                  className="h-7 px-2.5 rounded-xl text-[11px] font-bold text-white flex items-center gap-1"
                                  style={{ background: "#dc2626" }}>
                                  <Banknote className="h-3 w-3" />Quitar
                                </motion.button>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc[0]} ${sc[1]}`}>
                                {STATUS_LABEL[a.status] ?? a.status}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed text-center"
                      style={{ borderColor: "hsl(340,25%,89%)" }}>
                      <CalendarDays className="h-8 w-8 text-muted-foreground/25 mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum atendimento ainda</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-3xl border shadow-sm flex flex-col items-center justify-center text-center p-10"
              style={{ height: "calc(100vh - 11rem)", borderColor: "hsl(340,20%,90%)" }}>
              <div className="w-24 h-24 rounded-full mb-5 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,hsl(22,60%,95%),hsl(340,40%,93%))" }}>
                <User className="h-12 w-12 text-primary/20" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-muted-foreground/50">Selecione uma cliente</h2>
              <p className="text-muted-foreground/40 mt-2 max-w-xs text-sm">
                Clique em uma cliente da lista para ver seu perfil completo e histórico.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Nova Cliente</DialogTitle></DialogHeader>
          <ClientFormFields form={form} onSubmit={onAdd} busy={createCl.isPending} label="Salvar Cliente" />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="font-serif text-2xl">Editar Cliente</DialogTitle></DialogHeader>
          <ClientFormFields form={form} onSubmit={onEdit} busy={updateCl.isPending} label="Atualizar Cliente" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
