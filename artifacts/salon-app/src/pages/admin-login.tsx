import { useState } from "react";
import { motion } from "framer-motion";
import { Flower2, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";

export default function AdminLogin({ redirectTo = "/admin/dashboard" }: { redirectTo?: string }) {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Preencha e-mail e senha"); return; }
    setBusy(true);
    setError("");
    const result = await login(email, password);
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Credenciais inválidas");
    else setLocation(redirectTo);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(160deg,hsl(338,60%,97%) 0%,hsl(22,55%,95%) 50%,hsl(278,40%,97%) 100%)" }}
    >
      {/* decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(338,80%,75%) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(278,70%,70%) 0%, transparent 70%)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-xl ring-4 ring-white"
            style={{ background: "linear-gradient(135deg,hsl(338,62%,50%),hsl(318,55%,40%))" }}>
            <Flower2 className="h-10 w-10 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-bold" style={{ color: "hsl(338,55%,28%)" }}>Luminee</h1>
          <p className="text-muted-foreground text-sm mt-1.5">Acesso administrativo ao sistema</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="px-7 pt-6 pb-4"
            style={{ background: "linear-gradient(135deg,hsl(338,60%,96%),hsl(22,55%,95%))" }}>
            <h2 className="font-serif text-xl font-bold" style={{ color: "hsl(338,55%,30%)" }}>Entrar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Use suas credenciais de administrador</p>
          </div>

          <div className="p-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email" type="email" placeholder="Seu e-mail"
                  value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                  className="pl-9 rounded-xl" autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password" type={showPw ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                  className="pl-9 pr-10 rounded-xl" autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600 font-medium text-center bg-red-50 rounded-xl py-2 px-3">
                {error}
              </motion.p>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl text-base font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 mt-2"
              style={{ background: "linear-gradient(135deg,hsl(338,62%,40%),hsl(318,55%,34%))" }}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar no sistema"}
            </motion.button>
          </div>
        </form>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          Luminee · Sistema de Gestão de Salão
        </p>
      </motion.div>
    </div>
  );
}
