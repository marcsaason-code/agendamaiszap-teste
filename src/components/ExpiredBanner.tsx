import { useNavigate } from "react-router-dom";
import { AlertTriangle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

const ExpiredBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="glass-card p-6 mb-6 border-destructive bg-destructive/5">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
          <div>
            <p className="font-semibold text-foreground">Período de teste encerrado</p>
            <p className="text-sm text-muted-foreground mt-1">
              As funcionalidades de agenda, serviços, atendentes e compartilhamento estão bloqueadas. 
              Assine o plano para continuar usando o Agenda+Zap.
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/dashboard/subscription")}
          className="bg-gradient-gold text-primary-foreground shrink-0"
        >
          <Crown className="h-4 w-4 mr-2" /> Assinar agora
        </Button>
      </div>
    </div>
  );
};

export default ExpiredBanner;
