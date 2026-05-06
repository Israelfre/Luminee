import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Scissors, 
  UserSquare2, 
  Wallet, 
  Settings,
  Menu,
  X,
  Flower2,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { useGetSalon, getGetSalonQueryKey } from "@workspace/api-client-react";
import { useSalonAuth } from "@/contexts/salon-auth-context";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const navItems = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/appointments", label: "Agendamentos", icon: CalendarDays },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/services", label: "Serviços", icon: Scissors },
  { href: "/employees", label: "Equipe", icon: UserSquare2 },
  { href: "/financials", label: "Financeiro", icon: Wallet },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useSalonAuth();
  const [, setLocation] = useLocation();
  const handleSignOut = async () => {
    await logout();
    setLocation("/");
  };
  const { data: salon } = useGetSalon({
    query: { queryKey: getGetSalonQueryKey(), retry: false }
  });

  const salonName = salon?.name || "Luminee";
  const logoUrl = salon?.logoUrl;

  return (
    <div className="flex h-screen overflow-hidden bg-background w-full">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "linear-gradient(170deg, hsl(var(--sidebar)) 0%, color-mix(in hsl, hsl(var(--sidebar)) 85%, black) 100%)"
        }}
      >
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(var(--secondary)) 0%, transparent 70%)" }} />
        <div className="pointer-events-none absolute bottom-24 -left-8 w-36 h-36 rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, hsl(var(--secondary)) 0%, transparent 70%)" }} />

        {/* Logo / Salon Name */}
        <div className="flex h-20 flex-shrink-0 items-center px-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0" onClick={() => setIsSidebarOpen(false)}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={salonName}
                className="w-10 h-10 rounded-xl object-cover flex-shrink-0 ring-2 ring-white/20"
              />
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--primary)) 100%)" }}>
                <Flower2 className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-serif text-lg font-bold text-white leading-tight truncate" title={salonName}>
                {salonName}
              </div>
              <div className="text-[10px] text-white/45 uppercase tracking-[0.15em]">
                gestão de salão
              </div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden ml-auto flex-shrink-0 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-5 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30 px-3 pb-2">Menu</p>
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "text-white"
                    : "text-white/55 hover:text-white hover:bg-white/10"
                )}
                style={isActive ? {
                  background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)",
                  boxShadow: "0 4px 16px -2px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.14)"
                } : {}}
                onClick={() => setIsSidebarOpen(false)}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                    isActive ? "text-white" : "text-white/45"
                  )}
                  style={isActive ? {
                    background: "linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--primary)) 100%)"
                  } : {}}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <span className={isActive ? "font-semibold" : ""}>{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--secondary))" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-3 p-2 rounded-xl">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white/75 truncate">{salon?.name ?? "Meu Salão"}</div>
              <div className="text-[10px] text-white/35">Conta do salão</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/55 hover:text-white hover:bg-white/10 transition-all duration-200 group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg text-white/45 group-hover:text-white transition-colors">
              <LogOut className="h-4 w-4" />
            </div>
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <header className="h-16 flex-shrink-0 border-b border-border/60 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden -ml-2 text-foreground/70"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3 ml-auto">
            {logoUrl ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border"
                style={{ background: "hsl(var(--primary) / 0.06)", borderColor: "hsl(var(--primary) / 0.15)" }}>
                <img src={logoUrl} alt={salonName} className="w-5 h-5 rounded-full object-cover" />
                <span className="text-xs font-semibold" style={{ color: "hsl(var(--primary))" }}>{salonName}</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border"
                style={{ background: "hsl(var(--primary) / 0.06)", borderColor: "hsl(var(--primary) / 0.15)" }}>
                <Flower2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))" }} />
                <span className="text-xs font-semibold" style={{ color: "hsl(var(--primary))" }}>{salonName}</span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
