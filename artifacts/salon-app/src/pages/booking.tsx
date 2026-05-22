import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfDay, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Flower2, ChevronRight, ChevronLeft, Check, Loader2,
  Scissors, User, Calendar, Clock, Phone, Mail, ArrowLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { API_PREFIX } from "@/lib/api-url";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SalonInfo { id: number; name: string; logoUrl?: string | null }
interface Service { id: number; name: string; description?: string | null; price: string; durationMinutes: number; category: string }
interface Employee { id: number; name: string; specialties: string[] }
interface Slot { time: string; available: boolean }
interface BookingResult { ok: boolean; appointment: { date: string; time: string; serviceName: string; employeeName: string; clientName: string } }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (v: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(String(v)));

const api = (path: string) => fetch(`${API_PREFIX}/public/${path}`).then(r => r.json());

const STEPS = ["Serviço", "Profissional", "Data & Hora", "Seus Dados", "Confirmado"];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Booking() {
  const params = new URLSearchParams(window.location.search);
  const salonId = params.get("s") ?? "1";

  const [step, setStep] = useState(0);
  const [salon, setSalon] = useState<SalonInfo | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api(`salon?salonId=${salonId}`).then(setSalon);
    api(`booking/${salonId}/services`).then(setServices);
    api(`booking/${salonId}/employees`).then(setEmployees);
  }, [salonId]);

  useEffect(() => {
    if (!selectedService || !selectedEmployee) return;
    setLoadingSlots(true);
    setSelectedTime(null);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    api(`booking/${salonId}/slots?date=${dateStr}&serviceId=${selectedService.id}&employeeId=${selectedEmployee.id}`)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedService, selectedEmployee]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Nome obrigatório";
    if (!form.phone.trim()) e.phone = "Telefone obrigatório";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    return e;
  };

  const handleBook = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_PREFIX}/public/booking/${salonId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: form.name, clientPhone: form.phone, clientEmail: form.email,
          serviceId: selectedService!.id, employeeId: selectedEmployee!.id,
          date: format(selectedDate, "yyyy-MM-dd"), time: selectedTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao agendar"); return; }
      setResult(data);
      setStep(4);
    } catch { toast.error("Erro de conexão"); }
    finally { setSubmitting(false); }
  };

  // Gera próximos 14 dias
  const dates = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i + 0));

  const labelDate = (d: Date) => {
    if (isToday(d)) return "Hoje";
    if (isTomorrow(d)) return "Amanhã";
    return format(d, "EEE", { locale: ptBR });
  };

  const canNext = [
    !!selectedService,
    !!selectedEmployee,
    !!selectedTime,
    true,
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg,hsl(338,60%,97%),hsl(22,55%,96%))" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md border-b" style={{ background: "rgba(255,255,255,0.85)", borderColor: "hsl(340,20%,90%)" }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {salon?.logoUrl
            ? <img src={salon.logoUrl} alt="" className="w-10 h-10 rounded-2xl object-cover" />
            : <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}><Flower2 className="h-5 w-5 text-white" /></div>}
          <div>
            <h1 className="font-serif font-bold text-lg leading-none" style={{ color: "hsl(338,62%,30%)" }}>{salon?.name ?? "Salão"}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Agendar horário</p>
          </div>
        </div>

        {/* Progress */}
        {step < 4 && (
          <div className="max-w-2xl mx-auto px-4 pb-3">
            <div className="flex gap-1">
              {STEPS.slice(0, 4).map((s, i) => (
                <div key={s} className="flex-1 h-1.5 rounded-full transition-all"
                  style={{ background: i <= step ? "hsl(338,62%,38%)" : "hsl(340,20%,88%)" }} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{STEPS[step]}</p>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">

          {/* STEP 0 — Serviço */}
          {step === 0 && (
            <motion.div key="service" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-serif text-2xl font-bold mb-4" style={{ color: "hsl(338,62%,30%)" }}>Escolha o serviço</h2>
              <div className="space-y-3">
                {services.map(s => (
                  <motion.button key={s.id} whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedService(s)}
                    className="w-full text-left p-4 rounded-2xl border-2 transition-all"
                    style={selectedService?.id === s.id
                      ? { borderColor: "hsl(338,62%,38%)", background: "hsl(338,62%,97%)" }
                      : { borderColor: "hsl(340,20%,90%)", background: "white" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{s.name}</p>
                        {s.description && <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{s.durationMinutes} min</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-bold text-lg" style={{ color: "hsl(338,62%,38%)" }}>{fmt$(s.price)}</p>
                        {selectedService?.id === s.id && <Check className="h-5 w-5 ml-auto mt-1" style={{ color: "hsl(338,62%,38%)" }} />}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 1 — Profissional */}
          {step === 1 && (
            <motion.div key="employee" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-serif text-2xl font-bold mb-4" style={{ color: "hsl(338,62%,30%)" }}>Escolha a profissional</h2>
              <div className="space-y-3">
                {employees.map(e => (
                  <motion.button key={e.id} whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedEmployee(e)}
                    className="w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4"
                    style={selectedEmployee?.id === e.id
                      ? { borderColor: "hsl(338,62%,38%)", background: "hsl(338,62%,97%)" }
                      : { borderColor: "hsl(340,20%,90%)", background: "white" }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
                      {e.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{e.name}</p>
                      {e.specialties.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{e.specialties.join(", ")}</p>
                      )}
                    </div>
                    {selectedEmployee?.id === e.id && <Check className="h-5 w-5" style={{ color: "hsl(338,62%,38%)" }} />}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Data & Hora */}
          {step === 2 && (
            <motion.div key="datetime" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-serif text-2xl font-bold mb-4" style={{ color: "hsl(338,62%,30%)" }}>Escolha a data e horário</h2>

              {/* Date picker */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
                {dates.map(d => (
                  <motion.button key={d.toISOString()} whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(d)}
                    className="flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-2xl border-2 min-w-[64px] transition-all"
                    style={format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                      ? { borderColor: "hsl(338,62%,38%)", background: "hsl(338,62%,38%)", color: "white" }
                      : { borderColor: "hsl(340,20%,90%)", background: "white" }}>
                    <span className="text-[10px] font-bold uppercase">{labelDate(d)}</span>
                    <span className="text-xl font-black leading-none mt-0.5">{format(d, "d")}</span>
                    <span className="text-[10px]">{format(d, "MMM", { locale: ptBR })}</span>
                  </motion.button>
                ))}
              </div>

              {/* Time slots */}
              {loadingSlots ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.length === 0 && <p className="col-span-4 text-center text-muted-foreground py-8 text-sm">Nenhum horário disponível nesta data</p>}
                  {slots.map(s => (
                    <motion.button key={s.time} whileTap={{ scale: 0.95 }}
                      disabled={!s.available}
                      onClick={() => s.available && setSelectedTime(s.time)}
                      className="py-2.5 rounded-2xl text-sm font-semibold border-2 transition-all"
                      style={!s.available
                        ? { borderColor: "transparent", background: "hsl(340,10%,94%)", color: "hsl(340,10%,70%)", textDecoration: "line-through" }
                        : selectedTime === s.time
                          ? { borderColor: "hsl(338,62%,38%)", background: "hsl(338,62%,38%)", color: "white" }
                          : { borderColor: "hsl(340,20%,90%)", background: "white", color: "hsl(338,62%,30%)" }}>
                      {s.time}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3 — Dados da cliente */}
          {step === 3 && (
            <motion.div key="data" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: "hsl(338,62%,30%)" }}>Seus dados</h2>
              <p className="text-sm text-muted-foreground mb-5">Confirme seus dados para finalizar o agendamento.</p>

              {/* Resumo */}
              <div className="p-4 rounded-2xl mb-5 space-y-2 text-sm" style={{ background: "hsl(338,60%,97%)", border: "1px solid hsl(338,40%,90%)" }}>
                <div className="flex gap-2"><Scissors className="h-4 w-4 text-primary mt-0.5" /><span><b>{selectedService?.name}</b> · {fmt$(selectedService?.price ?? "0")} · {selectedService?.durationMinutes}min</span></div>
                <div className="flex gap-2"><User className="h-4 w-4 text-primary mt-0.5" /><span>{selectedEmployee?.name}</span></div>
                <div className="flex gap-2"><Calendar className="h-4 w-4 text-primary mt-0.5" /><span>{format(selectedDate, "dd/MM/yyyy (EEEE)", { locale: ptBR })}</span></div>
                <div className="flex gap-2"><Clock className="h-4 w-4 text-primary mt-0.5" /><span>{selectedTime}</span></div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold mb-1 block">Nome completo *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 rounded-2xl" placeholder="Seu nome" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Telefone/WhatsApp *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 rounded-2xl" placeholder="(85) 99999-9999" value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">E-mail (opcional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="email" className="pl-9 rounded-2xl" placeholder="email@exemplo.com" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4 — Confirmado */}
          {step === 4 && result && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: "linear-gradient(135deg,hsl(142,60%,38%),hsl(162,55%,32%))" }}>
                <Check className="h-10 w-10 text-white" />
              </motion.div>
              <h2 className="font-serif text-3xl font-bold mb-2" style={{ color: "hsl(338,62%,30%)" }}>Agendado!</h2>
              <p className="text-muted-foreground mb-6">Seu horário foi confirmado com sucesso.</p>

              <div className="text-left p-5 rounded-3xl space-y-3 text-sm max-w-sm mx-auto"
                style={{ background: "white", border: "1px solid hsl(340,20%,90%)" }}>
                <div className="flex gap-2"><Scissors className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span><b>{result.appointment.serviceName}</b></span></div>
                <div className="flex gap-2"><User className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>{result.appointment.employeeName}</span></div>
                <div className="flex gap-2"><Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>{result.appointment.date}</span></div>
                <div className="flex gap-2"><Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /><span>{result.appointment.time}</span></div>
              </div>

              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => { setStep(0); setSelectedService(null); setSelectedEmployee(null); setSelectedTime(null); setResult(null); setForm({ name: "", phone: "", email: "" }); }}
                className="mt-6 px-6 py-3 rounded-2xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
                Fazer outro agendamento
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Navigation buttons */}
        {step < 4 && (
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold border-2"
                style={{ borderColor: "hsl(340,20%,88%)", color: "hsl(338,60%,38%)" }}>
                <ChevronLeft className="h-4 w-4" /> Voltar
              </motion.button>
            )}
            {step < 3 ? (
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => canNext[step] && setStep(s => s + 1)}
                disabled={!canNext[step]}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white transition-opacity"
                style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))", opacity: canNext[step] ? 1 : 0.4 }}>
                Continuar <ChevronRight className="h-4 w-4" />
              </motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleBook} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg,hsl(338,62%,38%),hsl(318,55%,32%))" }}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmar agendamento
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
