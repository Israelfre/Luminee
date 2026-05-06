import {
  useListAppointments,
  getListAppointmentsQueryKey,
  listAppointments,
  useListEmployees,
  getListEmployeesQueryKey,
  useListClients,
  getListClientsQueryKey,
  useListServices,
  getListServicesQueryKey,
  useCreateAppointment,
  useUpdateAppointment,
  useCreatePayment,
  useGetSalon,
  getGetSalonQueryKey,
  getListPaymentsQueryKey,
  useListPayments,
  AppointmentDetailStatus,
  AppointmentDetail,
} from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { useQueryClient, useQueries } from "@tanstack/react-query";
import {
  format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks,
  isToday as dateFnsIsToday, parseISO, getHours, getMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Scissors, Clock, MessageCircle, Bell, Banknote,
  CreditCard, Smartphone, ArrowLeftRight, Check, AlertCircle,
  ChevronDown, CalendarDays, Loader2, ChevronLeft, ChevronRight,
  LayoutList, Calendar, TimerReset,
} from "lucide-react";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Types & constants ────────────────────────────────────────────────────────

const schema = z.object({
  clientId: z.coerce.number().min(1, "Obrigatório"),
  serviceId: z.coerce.number().min(1, "Obrigatório"),
  employeeId: z.coerce.number().min(1, "Obrigatório"),
  date: z.date({ required_error: "Obrigatório" }),
  time: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "HH:MM"),
  notes: z.string().optional(),
});
type FormVals = z.infer<typeof schema>;

const PAY_METHODS = [
  { v: "cash",     label: "Dinheiro",   Icon: Banknote },
  { v: "pix",      label: "Pix",        Icon: Smartphone },
  { v: "credit",   label: "Crédito",    Icon: CreditCard },
  { v: "debit",    label: "Débito",     Icon: CreditCard },
  { v: "transfer", label: "Transf.",    Icon: ArrowLeftRight },
];
const PM_LABEL: Record<string, string> = {
  cash: "Dinheiro", pix: "Pix", credit: "Crédito", debit: "Débito", transfer: "Transferência",
};

const STATUS_META = {
  scheduled:  { label: "Agendado",   dot: "#f59e0b", bg: "#fef3c7", text: "#92400e" },
  confirmed:  { label: "Confirmado", dot: "#3b82f6", bg: "#eff6ff", text: "#1e40af" },
  completed:  { label: "Concluído",  dot: "#10b981", bg: "#ecfdf5", text: "#065f46" },
  cancelled:  { label: "Cancelado",  dot: "#f43f5e", bg: "#fff1f2", text: "#9f1239" },
} as const;
type StatusKey = keyof typeof STATUS_META;

const APT_COLORS = [
  { bg: "hsl(338,62%,38%)", text: "#fff" },
  { bg: "hsl(222,60%,48%)", text: "#fff" },
  { bg: "hsl(160,60%,35%)", text: "#fff" },
  { bg: "hsl(38,90%,48%)",  text: "#fff" },
  { bg: "hsl(280,55%,45%)", text: "#fff" },
  { bg: "hsl(4,72%,48%)",   text: "#fff" },
];

// Hour range shown in grid
const HOUR_START = 8;
const HOUR_END   = 20;
const PX_PER_MIN = 1.2; // pixels per minute in the grid

function smi(s: string) { return STATUS_META[s as StatusKey] ?? STATUS_META.scheduled; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toCard = (m: string) => m === "credit" || m === "debit" || m === "transfer" ? "card" : m;
const fmt$ = (v?: string | null, fallback = "0") => `R$\u00a0${parseFloat(v ?? fallback).toFixed(2)}`;

function waLink(number: string, msg: string) {
  const n = number.replace(/\D/g, "");
  return `https://wa.me/${n.startsWith("55") ? n : "55" + n}?text=${encodeURIComponent(msg)}`;
}
function waMsg(c: string, s: string, e: string, t: string, salon: string) {
  return `Olá ${c}! 🌸\n\nLembrete do seu horário em *${salon}*:\n\n📅 ${format(new Date(t), "EEEE, d 'de' MMMM", { locale: ptBR })} às ${format(new Date(t), "HH:mm")}\n✂️ ${s}  |  👩 ${e}\n\nEstamos te esperando! 💅`;
}

// Generate all 30-min time slots between HOUR_START and HOUR_END
function allSlots(): string[] {
  const slots: string[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

// Given a list of appointments for the employee on that day, return set of busy slot strings
function busySlotsForEmployee(apts: AppointmentDetail[], employeeId: number, durationMin: number): Set<string> {
  const busy = new Set<string>();
  const slots = allSlots();
  for (const slot of slots) {
    const [sh, sm] = slot.split(":").map(Number);
    const slotStart = sh * 60 + sm;
    const slotEnd   = slotStart + durationMin;
    for (const apt of apts) {
      if (apt.employeeId !== employeeId) continue;
      if (apt.status === "cancelled") continue;
      const as = new Date(apt.startsAt);
      const ae = new Date(apt.endsAt);
      const aptStart = getHours(as) * 60 + getMinutes(as);
      const aptEnd   = getHours(ae) * 60 + getMinutes(ae);
      // Overlap if slotStart < aptEnd AND slotEnd > aptStart
      if (slotStart < aptEnd && slotEnd > aptStart) {
        busy.add(slot);
        break;
      }
    }
  }
  return busy;
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PayModal({ apt, onClose, onPayNow, onPayLater, busy }: {
  apt: AppointmentDetail;
  onClose(): void;
  onPayNow(m: string, amt: string): void;
  onPayLater(amt: string): void;
  busy: boolean;
}) {
  const def = parseFloat(apt.paymentAmount ?? apt.servicePrice ?? "0").toFixed(2);
  const [method, setMethod] = useState("pix");
  const [amt, setAmt] = useState(def);

  return (
    <Dialog open onOpenChange={() => !busy && onClose()}>
      <DialogContent className="p-0 overflow-hidden rounded-3xl sm:max-w-[440px]">
        <div className="px-7 pt-7 pb-5" style={{ background: "linear-gradient(135deg,hsl(338,60%,96%),hsl(22,55%,95%))" }}>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-foreground">Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            {[["Cliente", apt.clientName], ["Serviço", apt.serviceName], ["Profissional", apt.employeeName]].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k}</p>
                <p className="mt-0.5 font-semibold text-foreground leading-tight">{v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-7 py-6 space-y-5">
          <div>
            <p className="text-sm font-semibold mb-2">Valor cobrado</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm select-none">R$</span>
              <Input type="number" step="0.01" min="0" value={amt} onChange={e => setAmt(e.target.value)}
                className="pl-11 h-12 rounded-2xl text-xl font-black border-2 focus:border-primary/50" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Forma de pagamento</p>
            <div className="grid grid-cols-5 gap-2">
              {PAY_METHODS.map(({ v, label, Icon }) => {
                const on = method === v;
                return (
                  <motion.button key={v} type="button" onClick={() => setMethod(v)} whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-[11px] font-bold transition-colors"
                    style={on ? { borderColor: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary))" } : { borderColor: "hsl(var(--border) / 0.6)", color: "hsl(var(--muted-foreground))" }}>
                    <Icon className="h-4 w-4" />{label}
                  </motion.button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onPayLater(amt)} disabled={busy}
              className="h-12 rounded-2xl font-semibold text-sm border-2 border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
              Pagar depois
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onPayNow(method, amt)} disabled={busy}
              className="h-12 rounded-2xl font-semibold text-sm text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirmar
            </motion.button>
          </div>
          <p className="text-[11px] text-center text-muted-foreground leading-snug">
            "Pagar depois" salva como dívida e aparece no perfil da cliente.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Appointment Card (list view) ─────────────────────────────────────────────

function AptCard({ apt, onStatus, onPay, onWa }: {
  apt: AppointmentDetail;
  onStatus(a: AppointmentDetail, s: AppointmentDetailStatus): void;
  onPay(a: AppointmentDetail): void;
  onWa(a: AppointmentDetail): void;
}) {
  const sm = smi(apt.status);
  const paid = apt.paymentStatus === "paid";
  const pending = apt.paymentStatus === "pending";
  const needsPay = apt.status === "completed" && !paid;
  const contact = apt.clientWhatsapp || apt.clientPhone;
  const price = parseFloat(apt.servicePrice ?? "0").toFixed(2);

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="group relative bg-white hover:bg-slate-50/60 transition-colors border-b border-border/25 last:border-b-0">
      <div className="flex items-stretch gap-0">
        <div className="w-1 flex-shrink-0 rounded-l-sm self-stretch" style={{ background: sm.dot }} />
        <div className="flex-shrink-0 w-[72px] flex flex-col items-center justify-center py-4 border-r border-border/20">
          <span className="text-[22px] font-black leading-none tabular-nums" style={{ color: sm.dot }}>
            {format(new Date(apt.startsAt), "H:mm")}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />{format(new Date(apt.endsAt), "H:mm")}
          </span>
        </div>
        <div className="flex-1 min-w-0 px-4 py-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[15px] text-foreground">{apt.clientName}</span>
            {contact && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: "#dcfce7", color: "#15803d" }}>
                <MessageCircle className="h-2.5 w-2.5" />WA
              </span>
            )}
            {paid && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                <Check className="h-2.5 w-2.5" />
                Pago · {PM_LABEL[apt.paymentMethod ?? ""] ?? apt.paymentMethod} · {fmt$(apt.paymentAmount)}
              </span>
            )}
            {pending && (
              <button onClick={() => onPay(apt)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                <AlertCircle className="h-2.5 w-2.5" />
                Devendo {fmt$(apt.paymentAmount ?? apt.servicePrice)} · clique para quitar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-sm">
            <Scissors className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">{apt.serviceName}</span>
            <span className="font-bold text-foreground">R$&nbsp;{price}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-muted-foreground">
              com <span className="text-foreground font-medium">{apt.employeeName}</span>
            </span>
            {apt.notes && (
              <span className="text-xs text-muted-foreground/60 italic truncate max-w-[180px]">· "{apt.notes}"</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 pr-4 py-3.5">
          {needsPay && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => onPay(apt)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ background: pending ? "linear-gradient(135deg,#dc2626,#b91c1c)" : "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
              <Banknote className="h-3.5 w-3.5" />{pending ? "Quitar" : "Pagar"}
            </motion.button>
          )}
          {!!contact && apt.status !== "completed" && apt.status !== "cancelled" && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => onWa(apt)}
              className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-green-50 transition-colors">
              <MessageCircle className="h-4 w-4" style={{ color: "#25D366" }} />
            </motion.button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold border-2 transition-colors hover:opacity-80"
                style={{ background: sm.bg, color: sm.text, borderColor: `${sm.dot}50` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: sm.dot }} />
                {sm.label}<ChevronDown className="h-3 w-3 opacity-60" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl min-w-[155px] shadow-lg">
              {Object.entries(STATUS_META).map(([k, v]) => (
                <DropdownMenuItem key={k} className="flex items-center gap-2.5 rounded-xl cursor-pointer"
                  onClick={() => onStatus(apt, k as AppointmentDetailStatus)}>
                  <span className="h-2 w-2 rounded-full" style={{ background: v.dot }} />{v.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Week Calendar View ────────────────────────────────────────────────────────

function WeekCalendar({ weekStart, allApts, onSelectSlot, onSelectApt, onStatus, onPay, onWa, employeeFilter }: {
  weekStart: Date;
  allApts: (AppointmentDetail[] | undefined)[];
  onSelectSlot(date: Date, time: string): void;
  onSelectApt(apt: AppointmentDetail): void;
  onStatus(apt: AppointmentDetail, s: AppointmentDetailStatus): void;
  onPay(apt: AppointmentDetail): void;
  onWa(apt: AppointmentDetail): void;
  employeeFilter: number | null;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const totalMinutes = (HOUR_END - HOUR_START) * 60;
  const gridHeight = totalMinutes * PX_PER_MIN;

  // Hours labels
  const hourLabels: string[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) {
    hourLabels.push(`${String(h).padStart(2, "0")}:00`);
  }

  return (
    <div className="rounded-3xl border overflow-hidden bg-white shadow-sm" style={{ borderColor: "hsl(340,20%,90%)" }}>
      {/* Day headers */}
      <div className="flex border-b" style={{ borderColor: "hsl(340,20%,90%)" }}>
        {/* corner */}
        <div className="w-14 shrink-0 border-r" style={{ borderColor: "hsl(340,20%,90%)" }} />
        {days.map((day, i) => {
          const today = dateFnsIsToday(day);
          return (
            <div key={i} className="flex-1 min-w-0 py-2.5 text-center border-r last:border-r-0" style={{ borderColor: "hsl(340,20%,90%)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {format(day, "EEE", { locale: ptBR })}
              </div>
              <div className={`mx-auto mt-1 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black transition-colors
                ${today ? "text-white" : "text-foreground"}`}
                style={today ? { background: "hsl(var(--primary))" } : {}}>
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 340px)", minHeight: 300 }}>
        <div className="flex" style={{ height: gridHeight + 1 }}>
          {/* Hours column */}
          <div className="w-14 shrink-0 relative border-r" style={{ borderColor: "hsl(340,20%,90%)" }}>
            {hourLabels.map((h, i) => (
              <div key={h} className="absolute w-full flex items-center justify-end pr-2"
                style={{ top: i * 60 * PX_PER_MIN - 8, height: 16 }}>
                <span className="text-[10px] font-semibold text-muted-foreground/70">{h}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const dayApts = (allApts[dayIdx] ?? []).filter(a =>
              employeeFilter ? a.employeeId === employeeFilter : true
            );

            return (
              <div key={dayIdx} className="flex-1 min-w-0 relative border-r last:border-r-0"
                style={{ borderColor: "hsl(340,20%,90%)" }}>
                {/* Hour lines */}
                {hourLabels.map((_, i) => (
                  <div key={i} className="absolute w-full border-t"
                    style={{ top: i * 60 * PX_PER_MIN, borderColor: "hsl(340,20%,93%)" }} />
                ))}
                {/* Half-hour lines */}
                {hourLabels.slice(0, -1).map((_, i) => (
                  <div key={`h${i}`} className="absolute w-full border-t border-dashed"
                    style={{ top: (i * 60 + 30) * PX_PER_MIN, borderColor: "hsl(340,20%,95%)" }} />
                ))}

                {/* Clickable empty area */}
                <div className="absolute inset-0 cursor-pointer hover:bg-primary/[0.02] transition-colors"
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const relY = e.clientY - rect.top;
                    const totalMin = relY / PX_PER_MIN;
                    const h = Math.floor(totalMin / 60) + HOUR_START;
                    const m = Math.floor((totalMin % 60) / 30) * 30;
                    const clampedH = Math.max(HOUR_START, Math.min(HOUR_END - 1, h));
                    onSelectSlot(day, `${String(clampedH).padStart(2, "0")}:${m === 0 ? "00" : "30"}`);
                  }} />

                {/* Appointment blocks */}
                {dayApts.map((apt, aptIdx) => {
                  if (apt.status === "cancelled") return null;
                  const start = new Date(apt.startsAt);
                  const end = new Date(apt.endsAt);
                  const startMin = (getHours(start) - HOUR_START) * 60 + getMinutes(start);
                  const durationMin = Math.max(30, (end.getTime() - start.getTime()) / 60000);
                  const top = startMin * PX_PER_MIN;
                  const height = Math.max(28, durationMin * PX_PER_MIN - 2);
                  const color = APT_COLORS[apt.employeeId % APT_COLORS.length];
                  const sm = smi(apt.status);

                  return (
                    <motion.div key={apt.id}
                      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02, zIndex: 20 }}
                      onClick={(e) => { e.stopPropagation(); onSelectApt(apt); }}
                      className="absolute left-0.5 right-0.5 rounded-lg overflow-hidden cursor-pointer shadow-sm"
                      style={{ top, height, background: color.bg, zIndex: 10 }}>
                      <div className="px-1.5 py-1 h-full flex flex-col justify-start">
                        <div className="text-[10px] font-black text-white/90 leading-none flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: sm.dot }} />
                          {format(start, "H:mm")}
                        </div>
                        {height > 32 && (
                          <div className="text-[11px] font-bold text-white leading-tight mt-0.5 truncate">
                            {apt.clientName}
                          </div>
                        )}
                        {height > 46 && (
                          <div className="text-[10px] text-white/75 truncate">{apt.serviceName}</div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Detail Popup ─────────────────────────────────────────────────

const EXTEND_OPTIONS = [15, 30, 45, 60, 90, 120];

function AptPopup({ apt, onClose, onStatus, onPay, onWa, onExtend, extendBusy }: {
  apt: AppointmentDetail;
  onClose(): void;
  onStatus(a: AppointmentDetail, s: AppointmentDetailStatus): void;
  onPay(a: AppointmentDetail): void;
  onWa(a: AppointmentDetail): void;
  onExtend(a: AppointmentDetail, extraMin: number): void;
  extendBusy: boolean;
}) {
  const sm = smi(apt.status);
  const paid = apt.paymentStatus === "paid";
  const pending = apt.paymentStatus === "pending";
  const contact = apt.clientWhatsapp || apt.clientPhone;
  const [showExtend, setShowExtend] = useState(false);

  const currentDuration = Math.round(
    (new Date(apt.endsAt).getTime() - new Date(apt.startsAt).getTime()) / 60000
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ background: "linear-gradient(135deg,hsl(338,60%,96%),hsl(22,55%,95%))" }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="font-serif text-xl font-bold">{apt.clientName}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{apt.serviceName}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold mt-1"
              style={{ background: sm.bg, color: sm.text }}>
              {sm.label}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold text-foreground">{format(new Date(apt.startsAt), "HH:mm")}</span>
              <span>–</span>
              <span className="font-semibold text-foreground">{format(new Date(apt.endsAt), "HH:mm")}</span>
              <span className="text-xs text-muted-foreground/70">({currentDuration}min)</span>
            </div>
            <div className="text-muted-foreground truncate text-xs">com {apt.employeeName}</div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Extend time panel */}
          {apt.status !== "completed" && apt.status !== "cancelled" && (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "hsl(340,25%,90%)" }}>
              <button
                onClick={() => setShowExtend(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-sm font-semibold"
                style={{ color: "hsl(var(--primary))" }}>
                <div className="flex items-center gap-2">
                  <TimerReset className="h-4 w-4" />
                  Estender tempo de atendimento
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showExtend ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showExtend && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: "hidden" }}>
                    <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "hsl(340,25%,92%)" }}>
                      <p className="text-xs text-muted-foreground mb-3">
                        Adicionar tempo ao atendimento atual — término passa de{" "}
                        <span className="font-bold text-foreground">{format(new Date(apt.endsAt), "HH:mm")}</span>
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {EXTEND_OPTIONS.map(min => (
                          <motion.button key={min} whileTap={{ scale: 0.95 }}
                            disabled={extendBusy}
                            onClick={() => onExtend(apt, min)}
                            className="h-10 rounded-xl text-sm font-bold border-2 transition-all hover:shadow-sm disabled:opacity-50"
                            style={{ borderColor: "hsl(338,50%,80%)", color: "hsl(338,60%,38%)", background: "hsl(338,60%,97%)" }}>
                            {extendBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : `+${min}min`}
                          </motion.button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        O bloco na agenda será atualizado automaticamente
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Payment status */}
          <div className="flex flex-wrap items-center gap-2">
            {paid && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-700">
                <Check className="h-3 w-3" />Pago — {PM_LABEL[apt.paymentMethod ?? ""] ?? apt.paymentMethod} — {fmt$(apt.paymentAmount)}
              </span>
            )}
            {pending && (
              <button onClick={() => { onClose(); onPay(apt); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                <AlertCircle className="h-3 w-3" />Devendo {fmt$(apt.paymentAmount ?? apt.servicePrice)} — quitar
              </button>
            )}
            {!paid && !pending && apt.status === "completed" && (
              <button onClick={() => { onClose(); onPay(apt); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90"
                style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
                <Banknote className="h-3 w-3" />Registrar pagamento
              </button>
            )}
          </div>

          {apt.notes && (
            <p className="text-sm text-muted-foreground italic border-l-2 pl-3" style={{ borderColor: "hsl(var(--primary)/0.3)" }}>
              "{apt.notes}"
            </p>
          )}

          {/* Status actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {!!contact && apt.status !== "completed" && apt.status !== "cancelled" && (
              <button onClick={() => onWa(apt)}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: "#25D366" }}>
                <MessageCircle className="h-3.5 w-3.5" />WhatsApp
              </button>
            )}
            {Object.entries(STATUS_META).filter(([k]) => k !== apt.status).map(([k, v]) => (
              <button key={k} onClick={() => { onStatus(apt, k as AppointmentDetailStatus); onClose(); }}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-bold border-2 hover:opacity-80 transition-opacity"
                style={{ background: v.bg, color: v.text, borderColor: `${v.dot}40` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: v.dot }} />{v.label}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Booking form with slot blocking ─────────────────────────────────────────

function BookingForm({ form, onSubmit, isPending, clients, services, employees, dayApts }: {
  form: ReturnType<typeof useForm<FormVals>>;
  onSubmit(d: FormVals): void;
  isPending: boolean;
  clients: { id: number; name: string }[] | undefined;
  services: { id: number; name: string; price: string | null; durationMinutes: number }[] | undefined;
  employees: { id: number; name: string }[] | undefined;
  dayApts: AppointmentDetail[] | undefined;
}) {
  const watchEmployeeId = useWatch({ control: form.control, name: "employeeId" });
  const watchServiceId  = useWatch({ control: form.control, name: "serviceId" });
  const watchTime       = useWatch({ control: form.control, name: "time" });

  const selectedService = services?.find(s => s.id === Number(watchServiceId));
  const durationMin = selectedService?.durationMinutes ?? 60;

  const busySlots = useMemo(() => {
    if (!watchEmployeeId || !dayApts) return new Set<string>();
    return busySlotsForEmployee(dayApts, Number(watchEmployeeId), durationMin);
  }, [watchEmployeeId, dayApts, durationMin]);

  const slots = allSlots();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data</FormLabel>
            <FormControl>
              <Input type="date" className="rounded-xl"
                value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                onChange={e => field.onChange(new Date(e.target.value + "T12:00:00"))} />
            </FormControl><FormMessage />
          </FormItem>
        )} />

        {/* Time picker with slot blocking */}
        <FormField control={form.control} name="time" render={({ field }) => (
          <FormItem>
            <FormLabel>Horário</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecionar horário" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-60">
                {slots.map(slot => {
                  const isBusy = busySlots.has(slot);
                  return (
                    <SelectItem key={slot} value={slot} disabled={isBusy}
                      className={isBusy ? "opacity-40 line-through cursor-not-allowed" : ""}>
                      {slot}{isBusy ? " — ocupado" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {/* Visual slot grid */}
      {watchEmployeeId && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Disponibilidade do profissional
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {slots.map(slot => {
              const isBusy = busySlots.has(slot);
              const isSelected = watchTime === slot;
              return (
                <button key={slot} type="button"
                  disabled={isBusy}
                  onClick={() => !isBusy && form.setValue("time", slot, { shouldValidate: true })}
                  className="h-8 rounded-lg text-[11px] font-semibold transition-all border"
                  style={
                    isBusy
                      ? { background: "hsl(0,0%,95%)", color: "hsl(0,0%,70%)", borderColor: "hsl(0,0%,90%)", textDecoration: "line-through", cursor: "not-allowed" }
                      : isSelected
                        ? { background: "hsl(var(--primary))", color: "#fff", borderColor: "hsl(var(--primary))" }
                        : { background: "hsl(338,60%,97%)", color: "hsl(338,60%,38%)", borderColor: "hsl(338,40%,88%)" }
                  }>
                  {slot}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            <span className="inline-block w-2.5 h-2.5 rounded bg-muted mr-1 align-middle" />Ocupado
            &nbsp;&nbsp;
            <span className="inline-block w-2.5 h-2.5 rounded mr-1 align-middle" style={{ background: "hsl(338,60%,97%)", border: "1px solid hsl(338,40%,88%)" }} />Disponível
          </p>
        </div>
      )}

      {([
        { name: "clientId" as const, label: "Cliente", items: clients?.map(c => ({ v: String(c.id), l: c.name })) },
        { name: "serviceId" as const, label: "Serviço", items: services?.map(s => ({ v: String(s.id), l: `${s.name} — R$\u00a0${parseFloat(s.price ?? "0").toFixed(2)} (${s.durationMinutes}min)` })) },
        { name: "employeeId" as const, label: "Profissional", items: employees?.map(e => ({ v: String(e.id), l: e.name })) },
      ]).map(({ name, label, items }) => (
        <FormField key={name} control={form.control} name={name} render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select onValueChange={field.onChange} value={String(field.value ?? "")}>
              <FormControl>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder={`Selecione ${label.toLowerCase()}`} /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {items?.map(i => <SelectItem key={i.v} value={i.v}>{i.l}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      ))}

      <FormField control={form.control} name="notes" render={({ field }) => (
        <FormItem>
          <FormLabel>Observações</FormLabel>
          <FormControl><Textarea className="rounded-xl resize-none" rows={2} placeholder="Preferências, alergias..." {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <Button type="submit" disabled={isPending} className="w-full h-11 rounded-2xl text-white font-semibold"
        style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirmar Agendamento
      </Button>
    </form>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Appointments() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<"list" | "week">("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [payAppt, setPayAppt] = useState<AppointmentDetail | null>(null);
  const [selectedApt, setSelectedApt] = useState<AppointmentDetail | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [extendBusy, setExtendBusy] = useState(false);
  const [empFilter, setEmpFilter] = useState<number | null>(null);
  const qc = useQueryClient();
  const dateStr = format(date, "yyyy-MM-dd");

  const currentMonth = format(date, "yyyy-MM");

  // Day appointments (used in list view + form conflict checking)
  const { data: apts, isLoading } = useListAppointments({ date: dateStr },
    { query: { queryKey: getListAppointmentsQueryKey({ date: dateStr }) } });

  // Week appointments (7 queries in parallel)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekResults = useQueries({
    queries: weekDays.map(day => ({
      queryKey: getListAppointmentsQueryKey({ date: format(day, "yyyy-MM-dd") }),
      queryFn: () => listAppointments({ date: format(day, "yyyy-MM-dd") }),
    })),
  });
  const weekApts = weekResults.map(r => r.data);

  const { data: monthPayments } = useListPayments({ month: currentMonth },
    { query: { queryKey: getListPaymentsQueryKey({ month: currentMonth }) } });
  const { data: employees } = useListEmployees({ query: { queryKey: getListEmployeesQueryKey() } });
  const { data: clients }   = useListClients(undefined, { query: { queryKey: getListClientsQueryKey() } });
  const { data: services }  = useListServices(undefined, { query: { queryKey: getListServicesQueryKey() } });
  const { data: salon }     = useGetSalon({ query: { queryKey: getGetSalonQueryKey() } });

  const createApt = useCreateAppointment();
  const updateApt = useUpdateAppointment();
  const createPay = useCreatePayment();

  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { date, time: "09:00", notes: "" },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ date: dateStr }) });
    weekDays.forEach(day => qc.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ date: format(day, "yyyy-MM-dd") }) }));
  };

  const onSubmit = (d: FormVals) => {
    const dt = new Date(d.date);
    const [h, m] = d.time.split(":").map(Number);
    dt.setHours(h, m, 0, 0);
    createApt.mutate({ data: { clientId: d.clientId, serviceId: d.serviceId, employeeId: d.employeeId, startsAt: dt.toISOString(), notes: d.notes } }, {
      onSuccess: () => { toast.success("Agendamento criado!"); refresh(); setIsAddOpen(false); form.reset({ date, time: "09:00", notes: "" }); },
      onError: () => toast.error("Erro ao criar"),
    });
  };

  const handleStatus = (apt: AppointmentDetail, status: AppointmentDetailStatus) => {
    if (status === "completed" && apt.paymentStatus === "not_due") {
      setPayAppt(apt);
    } else {
      updateApt.mutate({ id: apt.id, data: { status } }, {
        onSuccess: () => { toast.success("Status atualizado"); refresh(); },
      });
    }
  };

  const handlePayNow = async (method: string, amt: string) => {
    if (!payAppt) return;
    setPayBusy(true);
    try {
      await createPay.mutateAsync({ data: { appointmentId: payAppt.id, amount: amt, paymentMethod: toCard(method) as "cash" | "pix" | "card" } });
      await updateApt.mutateAsync({ id: payAppt.id, data: { status: "completed", paymentStatus: "paid", paymentMethod: method as "cash" | "pix" | "credit" | "debit" | "transfer", paymentAmount: amt } });
      toast.success(`Pagamento de R$\u00a0${parseFloat(amt).toFixed(2)} registrado! ✅`);
      refresh();
      qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      setPayAppt(null);
    } catch { toast.error("Erro ao registrar pagamento"); }
    finally { setPayBusy(false); }
  };

  const handlePayLater = async (amt: string) => {
    if (!payAppt) return;
    setPayBusy(true);
    try {
      await updateApt.mutateAsync({ id: payAppt.id, data: { status: "completed", paymentStatus: "pending", paymentAmount: amt } });
      toast.warning(`${payAppt.clientName} marcada como devedora`);
      refresh();
      setPayAppt(null);
    } catch { toast.error("Erro ao salvar"); }
    finally { setPayBusy(false); }
  };

  const handleExtend = async (apt: AppointmentDetail, extraMin: number) => {
    setExtendBusy(true);
    try {
      const newEndsAt = new Date(new Date(apt.endsAt).getTime() + extraMin * 60000).toISOString();
      await updateApt.mutateAsync({ id: apt.id, data: { endsAt: newEndsAt } });
      toast.success(`+${extraMin}min adicionados — término agora às ${format(new Date(newEndsAt), "HH:mm")} 🕐`);
      refresh();
      // Update the selected apt to reflect new endsAt immediately
      setSelectedApt(a => a ? { ...a, endsAt: newEndsAt } : a);
    } catch { toast.error("Erro ao estender tempo"); }
    finally { setExtendBusy(false); }
  };

  const handleWa = (apt: AppointmentDetail) => {
    const n = apt.clientWhatsapp || apt.clientPhone;
    if (!n) { toast.error("Sem contato cadastrado"); return; }
    window.open(waLink(n, waMsg(apt.clientName, apt.serviceName, apt.employeeName, apt.startsAt, salon?.name ?? "Luminee")), "_blank");
  };

  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
  const reminderApts = (apts ?? []).filter(a => (a.clientWhatsapp || a.clientPhone) && a.status !== "completed" && a.status !== "cancelled");
  const pendingCount = (apts ?? []).filter(a => a.paymentStatus === "pending").length;

  const statusCounts = Object.fromEntries(
    Object.keys(STATUS_META).map(k => [k, (apts ?? []).filter(a => a.status === k).length])
  );

  const monthRevenue = (monthPayments ?? []).reduce((s, p) => s + parseFloat(p.amount), 0);
  const monthTransactions = (monthPayments ?? []).length;
  const monthLabel = format(date, "MMMM", { locale: ptBR });

  // Handle clicking on a slot in week view → open form pre-filled
  const handleSelectSlot = (day: Date, time: string) => {
    form.reset({ date: day, time, notes: "" });
    setDate(day);
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-5">
      <AnimatePresence>
        {payAppt && (
          <PayModal apt={payAppt} onClose={() => setPayAppt(null)}
            onPayNow={handlePayNow} onPayLater={handlePayLater} busy={payBusy} />
        )}
        {selectedApt && (
          <AptPopup apt={selectedApt} onClose={() => setSelectedApt(null)}
            onStatus={handleStatus} onPay={setPayAppt} onWa={handleWa}
            onExtend={handleExtend} extendBusy={extendBusy} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[2.6rem] font-serif font-bold leading-none"
            style={{ background: "linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary)/0.55))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Agendamentos
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm capitalize">
            {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {pendingCount > 0 && (
              <span className="ml-2 font-semibold" style={{ color: "#b91c1c" }}>
                · {pendingCount} pagamento{pendingCount > 1 ? "s" : ""} pendente{pendingCount > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center rounded-2xl border p-1 gap-1" style={{ borderColor: "hsl(340,25%,88%)" }}>
            {([
              { k: "week", Icon: Calendar, label: "Agenda" },
              { k: "list", Icon: LayoutList, label: "Lista" },
            ] as const).map(({ k, Icon, label }) => (
              <button key={k} onClick={() => setView(k)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold transition-all"
                style={view === k
                  ? { background: "hsl(var(--primary))", color: "#fff" }
                  : { color: "hsl(var(--muted-foreground))" }}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>

          {/* Add button */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <motion.button whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-5 h-11 rounded-2xl text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
                <Plus className="h-4 w-4" />Novo Agendamento
              </motion.button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] rounded-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Agendar Atendimento</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <BookingForm form={form} onSubmit={onSubmit} isPending={createApt.isPending}
                  clients={clients} services={services} employees={employees}
                  dayApts={apts} />
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Monthly stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: `Receita em ${monthLabel}`, value: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(monthRevenue), sub: `${monthTransactions} pagamento${monthTransactions !== 1 ? "s" : ""}`, color: "hsl(338,60%,38%)", bg: "hsl(338,60%,96%)" },
          { label: "Agendados hoje",    value: `${statusCounts["scheduled"] ?? 0}`,  sub: "aguardando confirmação", color: "#d97706", bg: "#fffbeb" },
          { label: "Concluídos hoje",   value: `${statusCounts["completed"] ?? 0}`,  sub: "atendimentos finalizados", color: "#059669", bg: "#ecfdf5" },
          { label: "Cancelados hoje",   value: `${statusCounts["cancelled"] ?? 0}`,  sub: "não compareceu", color: "#dc2626", bg: "#fef2f2" },
        ].map(({ label, value, sub, color, bg }) => (
          <div key={label} className="rounded-2xl px-4 py-3.5 border bg-white"
            style={{ borderColor: "hsl(340,25%,91%)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
            <div className="text-2xl font-black" style={{ color }}>{value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* WhatsApp banner */}
      <AnimatePresence>
        {isToday && reminderApts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-green-200/80 overflow-hidden"
            style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)" }}>
            <div className="px-4 py-2.5 flex items-center gap-2 border-b border-green-200/60">
              <Bell className="h-3.5 w-3.5 text-green-700" />
              <span className="text-sm font-semibold text-green-800">
                {reminderApts.length} cliente{reminderApts.length > 1 ? "s" : ""} aguardando lembrete de WhatsApp hoje
              </span>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {reminderApts.map(a => {
                const n = a.clientWhatsapp || a.clientPhone;
                const link = waLink(n!, waMsg(a.clientName, a.serviceName, a.employeeName, a.startsAt, salon?.name ?? "Luminee"));
                return (
                  <a key={a.id} href={link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white hover:shadow-md hover:-translate-y-0.5 transition-all"
                    style={{ background: "#25D366" }}>
                    <MessageCircle className="h-3 w-3" />
                    {a.clientName} · {format(new Date(a.startsAt), "H:mm")}
                  </a>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WEEK VIEW ───────────────────────────────────────────────────────── */}
      {view === "week" && (
        <div className="space-y-3">
          {/* Week navigation + employee filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekStart(w => subWeeks(w, 1))}
                className="h-9 w-9 flex items-center justify-center rounded-xl border hover:bg-muted/40 transition-colors"
                style={{ borderColor: "hsl(340,25%,88%)" }}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                className="px-4 h-9 rounded-xl border text-sm font-semibold hover:bg-muted/40 transition-colors"
                style={{ borderColor: "hsl(340,25%,88%)" }}>
                Hoje
              </button>
              <button onClick={() => setWeekStart(w => addWeeks(w, 1))}
                className="h-9 w-9 flex items-center justify-center rounded-xl border hover:bg-muted/40 transition-colors"
                style={{ borderColor: "hsl(340,25%,88%)" }}>
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-muted-foreground ml-1 capitalize">
                {format(weekStart, "d MMM", { locale: ptBR })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: ptBR })}
              </span>
            </div>

            {/* Employee filter */}
            {employees && employees.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => setEmpFilter(null)}
                  className="px-3 h-8 rounded-xl text-xs font-semibold border transition-all"
                  style={empFilter === null
                    ? { background: "hsl(var(--primary))", color: "#fff", borderColor: "hsl(var(--primary))" }
                    : { borderColor: "hsl(340,25%,88%)", color: "hsl(var(--muted-foreground))" }}>
                  Todas
                </button>
                {employees.map((emp, i) => (
                  <button key={emp.id} onClick={() => setEmpFilter(empFilter === emp.id ? null : emp.id)}
                    className="px-3 h-8 rounded-xl text-xs font-semibold border transition-all"
                    style={empFilter === emp.id
                      ? { background: APT_COLORS[emp.id % APT_COLORS.length].bg, color: "#fff", borderColor: APT_COLORS[emp.id % APT_COLORS.length].bg }
                      : { borderColor: "hsl(340,25%,88%)", color: "hsl(var(--muted-foreground))" }}>
                    {emp.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <WeekCalendar
            weekStart={weekStart}
            allApts={weekApts}
            onSelectSlot={handleSelectSlot}
            onSelectApt={setSelectedApt}
            onStatus={handleStatus}
            onPay={setPayAppt}
            onWa={handleWa}
            employeeFilter={empFilter}
          />
        </div>
      )}

      {/* ── LIST VIEW ───────────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-[270px_1fr] gap-5 items-start">
          {/* Calendar picker card */}
          <motion.div layout className="rounded-3xl border shadow-sm overflow-hidden bg-white sticky top-5"
            style={{ borderColor: "hsl(340,20%,90%)" }}>
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,hsl(var(--primary)),hsl(var(--secondary)))" }} />
            <div className="p-3 flex justify-center">
              <CalendarPicker mode="single" selected={date} onSelect={d => d && setDate(d)} className="rounded-2xl" locale={ptBR} />
            </div>
            <div className="border-t px-4 py-3 grid grid-cols-2 gap-2" style={{ borderColor: "hsl(340,20%,92%)" }}>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: v.dot }} />
                  <span className="text-muted-foreground">{v.label.toLowerCase()}</span>
                  <span className="font-bold ml-auto">{statusCounts[k] ?? 0}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Day list */}
          <div className="rounded-3xl border shadow-sm overflow-hidden bg-white" style={{ borderColor: "hsl(340,20%,90%)" }}>
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,hsl(var(--secondary)),hsl(var(--primary)))" }} />
            <div className="px-5 py-4 border-b" style={{ borderColor: "hsl(340,20%,92%)" }}>
              <h2 className="font-serif font-bold text-lg capitalize" style={{ color: "hsl(var(--primary))" }}>
                {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {apts?.length ?? 0} atendimento{apts?.length !== 1 ? "s" : ""}
              </p>
            </div>

            {isLoading ? (
              <div className="flex h-60 items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Loader2 className="h-8 w-8 text-primary" />
                </motion.div>
              </div>
            ) : apts && apts.length > 0 ? (
              <motion.div layout>
                {apts.map((apt, i) => (
                  <motion.div key={apt.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <AptCard apt={apt} onStatus={handleStatus} onPay={setPayAppt} onWa={handleWa} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg,hsl(22,60%,95%),hsl(340,40%,95%))" }}>
                  <CalendarDays className="h-9 w-9 text-primary/25" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-muted-foreground/60">Agenda livre</h3>
                <p className="text-sm text-muted-foreground max-w-xs mt-2">Nenhum atendimento marcado para este dia.</p>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setIsAddOpen(true)}
                  className="mt-5 flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-semibold border-2 border-primary/30 text-primary hover:bg-primary/5 transition-colors">
                  <Plus className="h-3.5 w-3.5" />Agendar agora
                </motion.button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
