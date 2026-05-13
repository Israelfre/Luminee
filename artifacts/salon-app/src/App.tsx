import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster as SonnerToaster } from "sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "./lib/queryClient";

import Dashboard from "./pages/dashboard";
import Appointments from "./pages/appointments";
import Clients from "./pages/clients";
import Services from "./pages/services";
import Employees from "./pages/employees";
import Financials from "./pages/financials";
import Settings from "./pages/settings";
import ClientRegistration from "./pages/client-registration";
import SalonRegister from "./pages/salon-register";
import AdminLogin from "./pages/admin-login";
import AdminDashboard from "./pages/admin-dashboard";
import SalonLogin from "./pages/salon-login";
import { Layout } from "./components/layout";
import { ThemeProvider } from "./contexts/theme-context";
import { AuthProvider, useAuth } from "./contexts/auth-context";
import { SalonAuthProvider, useSalonAuth } from "./contexts/salon-auth-context";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function AdminRoutes() {
  const { loggedIn, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-7 h-7 border-4 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }
  if (!loggedIn) return <AdminLogin redirectTo="/admin" />;
  return <AdminDashboard />;
}

function SalonRoutes() {
  const { loggedIn, loading } = useSalonAuth();
  const [location] = useLocation();
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,hsl(338,60%,97%),hsl(22,55%,96%))" }}
      >
        <div
          className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{ borderColor: "hsl(338,62%,50%)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }
  if (!loggedIn) return <SalonLogin />;
  return (
    <ThemeProvider>
      <Layout>
        <Switch location={location}>
          <Route path="/" component={() => <Redirect to="/dashboard" />} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/appointments" component={Appointments} />
          <Route path="/clients" component={Clients} />
          <Route path="/services" component={Services} />
          <Route path="/employees" component={Employees} />
          <Route path="/financials" component={Financials} />
          <Route path="/settings" component={Settings} />
          <Route component={() => <Redirect to="/dashboard" />} />
        </Switch>
      </Layout>
    </ThemeProvider>
  );
}

function Router() {
  const [location] = useLocation();

  if (location === "/cadastro" || location.startsWith("/cadastro?")) return <ClientRegistration />;
  if (location === "/registrar") return <SalonRegister />;
  if (location === "/admin" || location.startsWith("/admin/")) return <AdminRoutes />;

  return <SalonRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <SalonAuthProvider>
            <WouterRouter base={basePath}>
              <Router />
            </WouterRouter>
          </SalonAuthProvider>
        </AuthProvider>
        <Toaster />
        <SonnerToaster richColors position="top-center" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
