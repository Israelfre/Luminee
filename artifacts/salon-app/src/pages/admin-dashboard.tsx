import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, adminHeaders, getAdminToken } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import {
  LogOut, Users, Plus, Link2, Pencil, Trash2,
  RefreshCw, Zap, Gift, Clock, XCircle, Eye, EyeOff,
  X, Check, Loader2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { API_PREFIX } from "@/lib/api-url";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SalonRow {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  password?: string | null;
  logoUrl?: string;
  createdAt: string;
  clerkUserId: string | null;
  clients: number;
  clientsAtivos: number;
  clientesGratuitos: number;
  appointments: number;
  plan?: string;
}

function initial(name: string) {
  return name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function colorFor(id: number) {
  const colors = ["#7c3aed","#2563eb","#059669","#d97706","#db2777","#0891b2"];
  return colors[id % colors.length];
}

function PlanBadge({ plan }: { plan?: string }) {
  const isAtivo = plan === "ativo";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isAtivo ? "bg-green-500/20 text-green-400" : "bg-zinc-700 text-zinc-300"}`}>
      {isAtivo ? <><Zap className="h-2.5 w-2.5" />Ativo</> : <><Gift className="h-2.5 w-2.5" />Gratuito</>}
    </span>
  );
}

interface NewClientModalProps {
  onClose: () => void;
  onSaved: () => void;
}
function NewClientModal({ onClose, onSaved }: NewClientModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [plan, setPlan] = useState<"gratuito" | "ativo">("gratuito");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    if (password && password.length < 6) { toast.error("Senha com pelo menos 6 caracteres"); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API_PREFIX}/admin/salons`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), password: password.trim(), plan }),
      });
      if (!r.ok) throw new Error();
      toast.success("Cliente criado!");
      onSaved();
      onClose();
    } catch { toast.error("Erro ao criar cliente"); }
    finally { setBusy(false); }
  };

  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-white text-lg">Novo Cliente</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          {[
            { label: "Nome *", value: name, set: setName, placeholder: "Nome do salão" },
            { label: "E-mail", value: email, set: setEmail, placeholder: "email@exemplo.com" },
            { label: "Telefone", value: phone, set: setPhone, placeholder: "(11) 99999-9999" },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label}>
              <label className="block text-xs text-zinc-400 mb-1">{label}</label>
              <input value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                className={inputCls} />
            </div>
          ))}

          {/* Password */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Senha</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className={`${inputCls} pr-9`}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Plano</label>
            <div className="flex gap-2">
              {(["gratuito", "ativo"] as const).map(p => (
                <button key={p} onClick={() => setPlan(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${plan === p ? (p === "ativo" ? "bg-green-600 border-green-500 text-white" : "bg-zinc-700 border-zinc-600 text-white") : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}>
                  {p === "ativo" ? "⚡ Ativo" : "🎁 Gratuito"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Cancelar</button>
          <button onClick={save} disabled={busy}
            className="flex-1 py-2 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white flex items-center justify-center gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Criar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <p className="text-white text-sm font-medium mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors">
            Remover
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [salons, setSalons] = useState<SalonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPw, setShowPw] = useState<Record<number, boolean>>({});
  const [newModal, setNewModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [planBusy, setPlanBusy] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      if (!token) { setLocation("/"); return; }
      const r = await fetch(`${API_PREFIX}/admin/salons`, { credentials: "include", headers: adminHeaders() });
      if (r.status === 401) { setLocation("/"); return; }
      setSalons(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleLogout = async () => { await logout(); setLocation("/"); };

  const copyLink = (id: number) => {
    const link = `${window.location.origin}${basePath}/cadastro?s=${id}`;
    navigator.clipboard.writeText(link).then(() => toast.success("Link copiado!"));
  };

  const deleteSalon = async (id: number) => {
    setConfirmDelete(id);
  };

  const confirmDoDelete = async () => {
    if (confirmDelete === null) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    setDeletingId(id);
    try {
      await fetch(`${API_PREFIX}/admin/salons/${id}`, { method: "DELETE", headers: adminHeaders() });
      toast.success("Cliente removido");
      load();
    } catch { toast.error("Erro ao remover"); }
    finally { setDeletingId(null); }
  };

  const togglePlan = async (s: SalonRow) => {
    const newPlan = s.plan === "ativo" ? "gratuito" : "ativo";
    setPlanBusy(s.id);
    try {
      await fetch(`${API_PREFIX}/admin/salons/${s.id}/plan`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ plan: newPlan }),
      });
      setSalons(prev => prev.map(x => x.id === s.id ? { ...x, plan: newPlan } : x));
      toast.success(`Plano → ${newPlan === "ativo" ? "Ativo" : "Gratuito"}`);
    } catch { toast.error("Erro ao alterar plano"); }
    finally { setPlanBusy(null); }
  };

  const total = salons.length;
  const ativos = salons.filter(s => s.plan === "ativo").length;
  const gratuitos = salons.filter(s => s.plan === "gratuito" || !s.plan).length;

  return (
    <div className="min-h-screen" style={{ background: "#0f0f0f" }}>
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div>
            <p className="font-bold text-white text-sm leading-none">Luminee — Admin</p>
            <p className="text-zinc-500 text-xs mt-0.5">Painel de Controle</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation("/registrar")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-400 hover:border-pink-500 hover:text-pink-400 transition-all"
              title="Ver página de cadastro">
              <ExternalLink className="h-3.5 w-3.5" /> Ver Cadastro
            </button>
            <span className="text-zinc-700 text-xs">|</span>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-all">
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: total, color: "text-white" },
            { label: "Ativos", value: ativos, color: "text-green-400" },
            { label: "Vencendo", value: 0, color: "text-yellow-400" },
            { label: "Expirados", value: 0, color: "text-red-400" },
            { label: "Gratuitos", value: gratuitos, color: "text-zinc-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Registration link bar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <Link2 className="h-4 w-4 text-pink-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-zinc-500 mb-0.5">Link de cadastro para novos salões</p>
            <p className="text-xs text-zinc-300 font-mono truncate select-all">
              {typeof window !== "undefined" ? `${window.location.origin}${basePath}/registrar` : `${basePath}/registrar`}
            </p>
          </div>
          <button
            onClick={() => {
              const link = `${window.location.origin}${basePath}/registrar`;
              navigator.clipboard.writeText(link).then(() => toast.success("Link copiado!"));
            }}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-pink-600/20 text-pink-400 border border-pink-800 hover:bg-pink-600/30 transition-all">
            <Link2 className="h-3.5 w-3.5" /> Copiar
          </button>
        </div>

        {/* Clients table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              <span className="font-semibold text-white text-sm">Clientes do Sistema</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button onClick={() => setNewModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white transition-all">
                <Plus className="h-3.5 w-3.5" /> Novo Cliente
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-5 w-5 animate-spin text-zinc-600" />
            </div>
          ) : salons.length === 0 ? (
            <div className="py-16 text-center text-zinc-600 text-sm">Nenhum cliente cadastrado</div>
          ) : (
            <div>
              {salons.map((s, i) => (
                <motion.div key={s.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 px-5 py-4 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: colorFor(s.id) }}>
                    {s.logoUrl
                      ? <img src={s.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      : initial(s.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{s.name}</span>
                      <button onClick={() => togglePlan(s)} disabled={planBusy === s.id} title="Clique para alternar plano">
                        {planBusy === s.id
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-700 text-zinc-400"><Loader2 className="h-2.5 w-2.5 animate-spin" /></span>
                          : <PlanBadge plan={s.plan} />}
                      </button>
                    </div>
                    {s.email && <p className="text-xs text-zinc-500">{s.email}</p>}
                    <div className="flex items-center gap-3">
                      {s.password ? (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <span className="font-mono">{showPw[s.id] ? s.password : "••••••••"}</span>
                          <button onClick={() => setShowPw(p => ({ ...p, [s.id]: !p[s.id] }))}
                            className="text-zinc-600 hover:text-zinc-400 transition-colors">
                            {showPw[s.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-700 italic">sem senha</span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                        {s.clients} cliente{s.clients !== 1 ? "s" : ""}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                        {s.appointments} agend.
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => copyLink(s.id)} title="Copiar link de cadastro"
                      className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700 transition-all">
                      <Link2 className="h-4 w-4" />
                    </button>
                    <button title="Editar" disabled
                      className="p-2 rounded-lg text-zinc-600 cursor-not-allowed">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteSalon(s.id)} disabled={deletingId === s.id}
                      className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      {deletingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {newModal && <NewClientModal onClose={() => setNewModal(false)} onSaved={load} />}
        {confirmDelete !== null && (
          <ConfirmModal
            message={`Remover o cliente "${salons.find(s => s.id === confirmDelete)?.name}"?`}
            onConfirm={confirmDoDelete}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
