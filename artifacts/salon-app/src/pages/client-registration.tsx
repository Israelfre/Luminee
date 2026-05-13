import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Flower2, User, Lock, Mail, Phone, CheckCircle2, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API_PREFIX } from "@/lib/api-url";

interface SalonInfo {
  id: number;
  name: string;
  logoUrl?: string | null;
  whatsapp?: string | null;
}

async function fetchSalonInfo(salonId?: string): Promise<SalonInfo | null> {
  const url = salonId
    ? `${API_PREFIX}/public/salon?salonId=${salonId}`
    : `${API_PREFIX}/public/salon`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function registerClient(data: {
  name: string; email: string; phone: string;
  username: string; password: string; salonId: number;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_PREFIX}/public/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) return { ok: false, error: body.error ?? "Erro desconhecido" };
  return { ok: true };
}

export default function ClientRegistration() {
  const [salon, setSalon] = useState<SalonInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    name: "", email: "", phone: "", username: "", password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const params = new URLSearchParams(window.location.search);
  const salonId = params.get("s") ?? undefined;

  useEffect(() => {
    fetchSalonInfo(salonId).then(info => {
      setSalon(info);
      setLoading(false);
    });
  }, [salonId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Nome completo obrigatório (mín. 2 caracteres)";
    if (!form.username.trim()) e.username = "Escolha um nome de usuário";
    if (!/^[a-z0-9_.-]+$/i.test(form.username)) e.username = "Usuário: apenas letras, números, _ . -";
    if (!form.password || form.password.length < 6) e.password = "Senha com pelo menos 6 caracteres";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!salon) return;

    setSubmitting(true);
    const result = await registerClient({ ...form, salonId: salon.id });
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error ?? "Erro ao cadastrar");
      return;
    }
    setSuccess(true);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: "" }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg,hsl(338,60%,97%),hsl(22,55%,96%))" }}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4"
        style={{ background: "linear-gradient(135deg,hsl(338,60%,97%),hsl(22,55%,96%))" }}>
        <Flower2 className="h-12 w-12 text-primary/40" />
        <h1 className="text-xl font-bold text-foreground">Salão não encontrado</h1>
        <p className="text-muted-foreground text-sm">Este link de cadastro não é válido.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg,hsl(338,60%,97%) 0%,hsl(22,55%,95%) 50%,hsl(278,40%,97%) 100%)" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(338,80%,75%) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(278,70%,70%) 0%, transparent 70%)" }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md">

          <div className="text-center mb-8">
            {salon.logoUrl ? (
              <img src={salon.logoUrl} alt={salon.name}
                className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 ring-4 ring-white shadow-xl" />
            ) : (
              <div className="w-20 h-20 rounded-2xl mx-auto mb-4 ring-4 ring-white shadow-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,hsl(338,62%,55%),hsl(318,55%,45%))" }}>
                <Flower2 className="h-9 w-9 text-white" />
              </div>
            )}
            <h1 className="font-serif text-3xl font-bold" style={{ color: "hsl(338,55%,30%)" }}>{salon.name}</h1>
            <p className="text-muted-foreground mt-2 text-sm">Faça seu cadastro e agende seus serviços com facilidade</p>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
                className="bg-white rounded-3xl shadow-xl p-8 text-center">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,hsl(142,70%,45%),hsl(168,60%,40%))" }}>
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Cadastro realizado!</h2>
                <p className="text-muted-foreground text-sm mb-1">
                  Bem-vinda, <span className="font-semibold text-foreground">{form.name.split(" ")[0]}</span>!
                </p>
                <p className="text-muted-foreground text-sm">
                  Seu cadastro foi enviado para <span className="font-semibold" style={{ color: "hsl(338,55%,38%)" }}>{salon.name}</span>.
                  Em breve entraremos em contato para agendar seu atendimento. 💕
                </p>
                {salon.whatsapp && (
                  <a href={`https://wa.me/${salon.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: "#25D366" }}>
                    Falar no WhatsApp
                  </a>
                )}
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                className="bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="px-6 pt-6 pb-4" style={{ background: "linear-gradient(135deg,hsl(338,60%,96%),hsl(22,55%,95%))" }}>
                  <h2 className="font-serif text-xl font-bold" style={{ color: "hsl(338,55%,30%)" }}>Seu cadastro</h2>
                  <p className="text-xs text-muted-foreground mt-1">Preencha os dados abaixo para se cadastrar</p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm font-semibold">Nome completo <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="name" placeholder="Seu nome completo" value={form.name} onChange={set("name")}
                        className="pl-9 rounded-xl" autoComplete="name" />
                    </div>
                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-semibold">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="seu@email.com" value={form.email} onChange={set("email")}
                        className="pl-9 rounded-xl" autoComplete="email" />
                    </div>
                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-semibold">Telefone / WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" type="tel" placeholder="(11) 99999-9999" value={form.phone} onChange={set("phone")}
                        className="pl-9 rounded-xl" autoComplete="tel" />
                    </div>
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                  </div>

                  <div className="border-t pt-4 mt-2 space-y-4" style={{ borderColor: "hsl(338,25%,92%)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados de acesso</p>

                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-sm font-semibold">Usuário <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="username" placeholder="nome.usuario" value={form.username} onChange={set("username")}
                          className="pl-9 rounded-xl" autoComplete="username" autoCapitalize="none" />
                      </div>
                      {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-sm font-semibold">Senha <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="password" type={showPw ? "text" : "password"} placeholder="Mínimo 6 caracteres"
                          value={form.password} onChange={set("password")}
                          className="pl-9 pr-10 rounded-xl" autoComplete="new-password" />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                    </div>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl text-base font-bold mt-2"
                    style={{ background: "linear-gradient(135deg,hsl(338,62%,40%),hsl(318,55%,34%))", border: "none" }}>
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar minha conta"}
                  </Button>

                  <p className="text-[11px] text-muted-foreground text-center">
                    Seus dados são protegidos e usados apenas pelo salão
                  </p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="relative z-10 text-center py-4">
        <p className="text-[11px] text-muted-foreground/60">
          Powered by <span className="font-semibold">Luminee</span>
        </p>
      </div>
    </div>
  );
}
