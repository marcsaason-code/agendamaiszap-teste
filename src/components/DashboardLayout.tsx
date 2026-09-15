import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Sparkles, BarChart3, LogOut, Crown, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import logoNome from "@/assets/logo-nome-branco.png";

const navItems = [
  { label: "Agenda", icon: CalendarDays, path: "/dashboard" },
  { label: "Serviços", icon: Sparkles, path: "/dashboard/services" },
  { label: "Métricas", icon: BarChart3, path: "/dashboard/metrics" },
  { label: "Assinatura", icon: Crown, path: "/dashboard/subscription" },
  { label: "Config", icon: Settings, path: "/dashboard/settings" },
];

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success("Desconectado");
    navigate("/login");
  };


  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card p-4 gap-1">
        <img src={logoNome} alt="Agenda+Zap" className="h-7 mb-6 px-2 self-start" />
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              location.pathname === item.path
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
        <div className="mt-auto space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-around border-t border-border bg-card py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-0.5 text-xs",
              location.pathname === item.path ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </nav>

      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">{children}</main>
    </div>
  );
};

export default DashboardLayout;
