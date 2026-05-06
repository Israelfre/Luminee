import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Flower2, User, Mail, Phone, Building2, MessageSquare, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface FormData {
  salonName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  message: string;
}

async function submitRegistration(data: FormData): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${basePath}/api/admin/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) return { ok: false, error: body.error ?? "Erro ao enviar cadastro" };
  return { ok: true };
}

export default function SalonRegister() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<FormData>({ salonName: "", ownerName: "", email: "", phone: "", password: "", message: "" });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: "" }));
  };

  const validate = () => {
    const e: Partial<FormData> = {};
    if (form.salonName.trim().length < 2) e.salonName = "Nome do salão obrigatório";
    if (form.ownerName.trim().length < 2) e.ownerName = "Nome do responsável obrigatório";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail válido obrigatório";
    if (!form.phone.trim()) e.phone = "WhatsApp obrigatório";
    if (form.password.length < 6) e.password = "Senha com pelo menos 6 caracteres";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    const result = await submitRegistration(form);
    setSubmitting(false);
    if (!result.ok) { toast.error(result.error ?? "Erro ao enviar"); return; }
    setSuccess(true);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg,hsl(338,65%,97%) 0%,hsl(22,60%,95%) 50%,hsl(278,45%,97%) 100%)" }}>
      {/* Decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, hsl(338,80%,72%) 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(278,70%,68%) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(22,80%,72%) 0%, transparent 70%)" }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: "easeOut" }}
          className="w-full max-w-lg">

          {/* Back button (shown when navigating from admin panel) */}
          <div className="mb-4">
            <button
              onClick={() => setLocation("/")}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao painel
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center shadow-2xl"
              style={{ background: "linear-gradient(135deg,hsl(338,62%,50%),hsl(318,55%,38%))" }}>
              <Flower2 className="h-9 w-9 text-white" />
            </div>
            <h1 className="font-serif text-3xl font-bold" style={{ color: "hsl(338,55%,25%)" }}>
              Luminee
            </h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-xs mx-auto leading-relaxed">
              Gerencie seu salão com facilidade. Preencha o formulário e nossa equipe entrará em contato.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }}
                className="bg-white rounded-3xl shadow-xl p-10 text-center">
                <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center shadow-lg"
                  style={{ background: "linear-gradient(135deg,hsl(142,65%,42%),hsl(168,55%,38%))" }}>
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Cadastro recebido!</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-1">
                  Obrigada, <span className="font-semibold text-foreground">{form.ownerName.split(" ")[0]}</span>!
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Recebemos o cadastro de{" "}
                  <span className="font-semibold" style={{ color: "hsl(338,55%,38%)" }}>{form.salonName}</span>.
                  <br />Em breve nossa equipe entrará em contato pelo e-mail informado. 💕
                </p>
                <div className="mt-6 p-4 rounded-2xl text-sm text-left space-y-1"
                  style={{ background: "hsl(338,60%,97%)", border: "1px solid hsl(338,40%,90%)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(338,45%,50%)" }}>Dados enviados</p>
                  <p className="text-foreground font-medium">{form.salonName}</p>
                  <p className="text-muted-foreground text-xs">{form.email} {form.phone && `· ${form.phone}`}</p>
                </div>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                className="bg-white rounded-3xl shadow-xl overflow-hidden">

                {/* Card header */}
                <div className="px-7 pt-7 pb-5" style={{ background: "linear-gradient(135deg,hsl(338,60%,96%),hsl(22,55%,95%))" }}>
                  <h2 className="font-serif text-xl font-bold" style={{ color: "hsl(338,55%,28%)" }}>Quero conhecer o sistema</h2>
                  <p className="text-xs text-muted-foreground mt-1">Preencha seus dados e entraremos em contato em até 24h</p>
                </div>

                <div className="p-7 space-y-5">
                  {/* Salon name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="salonName" className="text-sm font-semibold">
                      Nome do salão <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="salonName" placeholder="Ex: Studio Bella, Cabelos & Estética..." value={form.salonName}
                        onChange={set("salonName")} className="pl-9 rounded-xl h-11" />
                    </div>
                    {errors.salonName && <p className="text-xs text-red-500">{errors.salonName}</p>}
                  </div>

                  {/* Owner name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="ownerName" className="text-sm font-semibold">
                      Seu nome <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="ownerName" placeholder="Nome do responsável" value={form.ownerName}
                        onChange={set("ownerName")} className="pl-9 rounded-xl h-11" autoComplete="name" />
                    </div>
                    {errors.ownerName && <p className="text-xs text-red-500">{errors.ownerName}</p>}
                  </div>

                  {/* Email + Phone row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm font-semibold">
                        E-mail <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="seu@email.com" value={form.email}
                          onChange={set("email")} className="pl-9 rounded-xl h-11" autoComplete="email" />
                      </div>
                      {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-sm font-semibold">WhatsApp <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="phone" type="tel" placeholder="(11) 99999-9999" value={form.phone}
                          onChange={set("phone")} className="pl-9 rounded-xl h-11" autoComplete="tel" />
                      </div>
                      {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-semibold">
                      Senha <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="password" type={showPw ? "text" : "password"} placeholder="Mínimo 6 caracteres"
                        value={form.password} onChange={set("password")}
                        className="pl-9 pr-10 rounded-xl h-11" autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                  </div>

                  {/* Optional message */}
                  <div className="space-y-1.5">
                    <Label htmlFor="message" className="text-sm font-semibold">
                      Conte um pouco sobre seu salão <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea id="message" placeholder="Número de funcionários, serviços que oferece, cidade..." value={form.message}
                        onChange={set("message")} className="pl-9 rounded-xl resize-none min-h-[80px] text-sm" />
                    </div>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl text-base font-bold mt-1"
                    style={{ background: "linear-gradient(135deg,hsl(338,62%,42%),hsl(318,55%,35%))", border: "none" }}>
                    {submitting
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : <><span>Solicitar demonstração</span><ArrowRight className="h-4 w-4 ml-2" /></>}
                  </Button>

                  <p className="text-[11px] text-muted-foreground text-center">
                    Seus dados são protegidos e usados apenas para entrar em contato com você.
                  </p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="relative z-10 text-center py-4">
        <p className="text-[11px] text-muted-foreground/50">
          © {new Date().getFullYear()} <span className="font-semibold">Luminee</span> · Sistema de Gestão de Salão
        </p>
      </div>
    </div>
  );
}
