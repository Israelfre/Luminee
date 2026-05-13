import { useState } from "react";
import { motion } from "framer-motion";
import { Flower2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useSalonAuth } from "@/contexts/salon-auth-context";
import { toast } from "sonner";

export default function SalonLogin() {
  const { login } = useSalonAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    setBusy(true);
    const result = await login(email.trim(), password.trim());
    if (!result.ok) {
      toast.error(result.error ?? "E-mail ou senha incorretos");
    }
    setBusy(false);
  };

  const inputCls = "w-full rounded-xl border border-pink-200 bg-white/70 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(160deg,hsl(338,60%,97%) 0%,hsl(22,55%,95%) 50%,hsl(278,40%,97%) 100%)" }}>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(338,80%,75%) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(278,70%,70%) 0%, transparent 70%)" }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md">

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl"
            style={{ background: "linear-gradient(135deg,hsl(338,62%,55%),hsl(318,55%,45%))" }}>
            <Flower2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-bold" style={{ color: "hsl(338,55%,30%)" }}>Luminee</h1>
          <p className="text-gray-500 text-sm mt-1">Acesse o painel do seu salão</p>
          <p className="text-gray-400 text-xs mt-2 max-w-sm mx-auto">
            Conta de <strong className="text-gray-500">salão</strong> (cadastro do negócio). Administrador da plataforma: use{" "}
            <Link href="/admin" className="text-pink-600 hover:text-pink-700 underline font-medium">
              /admin
            </Link>
            .
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/60 p-8">
          <h2 className="font-semibold text-gray-800 text-lg mb-6">Entrar</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  className={`${inputCls} pr-11`}
                  required
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={busy}
              className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ background: busy ? "hsl(338,40%,70%)" : "linear-gradient(135deg,hsl(338,62%,55%),hsl(318,55%,45%))" }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
