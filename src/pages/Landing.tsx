import { MessageCircle, Bell, CalendarDays, BarChart3, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import logoVertical from "@/assets/logo-vert-cor.png";
import logoIcone from "@/assets/logo-icone.png";

const features = [
  { icon: MessageCircle, title: "Atendimento automático no WhatsApp", desc: "Um agente inteligente conversa com seus clientes e marca os horários sozinho, 24 horas por dia, direto no WhatsApp." },
  { icon: Bell, title: "Lembretes automáticos", desc: "Seus clientes recebem confirmações e lembretes no WhatsApp, reduzindo faltas e esquecimentos." },
  { icon: CalendarDays, title: "Agenda online", desc: "Toda a sua agenda organizada em um só lugar, com serviços, profissionais e horários sempre atualizados." },
  { icon: BarChart3, title: "Métricas", desc: "Acompanhe agendamentos, serviços mais procurados e horários de pico do seu negócio." },
];

const planFeatures = [
  "Atendimento automático no WhatsApp",
  "Lembretes e confirmações automáticas",
  "Agendamentos online ilimitados",
  "Cadastro de serviços e profissionais",
  "Link exclusivo para clientes",
  "Dashboard com métricas e relatórios",
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50 to-white text-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center">
        {/* Marca d'água do ícone */}
        <img
          src={logoIcone}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute -top-10 left-1/2 -translate-x-1/2 w-[520px] max-w-none opacity-[0.06]"
        />

        <div className="relative">
          <img src={logoVertical} alt="Agenda+Zap" className="h-32 md:h-40 mx-auto mb-6" />
          <h1 className="text-3xl md:text-5xl font-bold mb-4 max-w-3xl mx-auto">
            Seu WhatsApp e agenda <span className="text-gradient-gold">em um só lugar</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            O Agenda+Zap cuida de todo o ciclo do agendamento. Do primeiro "Olá" até o lembrete do atendimento.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/register")} className="bg-gradient-gold text-white font-semibold px-8 py-3 text-base shadow-sm">
              Começar grátis
            </Button>
            <Button variant="outline" onClick={() => navigate("/login")} className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50 px-8 py-3 text-base">
              Entrar
            </Button>
          </div>
        </div>
      </section>

      {/* Highlight */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-center gap-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-3 flex items-center gap-2 text-sm text-slate-700">
            <MessageCircle className="h-4 w-4 text-emerald-600" /> Agendamento pelo WhatsApp
          </div>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-3 flex items-center gap-2 text-sm text-slate-700">
            <Clock className="h-4 w-4 text-emerald-600" /> Configuração em minutos
          </div>
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-3 flex items-center gap-2 text-sm text-slate-700">
            <Check className="h-4 w-4 text-emerald-600" /> Sem fidelidade
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-10 text-gradient-gold">
          Tudo que o seu negócio precisa
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-center">
              <f.icon className="mx-auto mb-3 h-8 w-8 text-emerald-600" />
              <h3 className="font-semibold mb-2 text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white border border-slate-200 rounded-xl shadow-md p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-1">Plano Único</h3>
          <p className="text-3xl font-bold text-gradient-gold mb-1">R$169,00<span className="text-base text-slate-500 font-normal">/mês</span></p>
          <p className="text-sm text-slate-500 mb-6">3 dias de teste gratuito</p>
          <ul className="text-left space-y-2 mb-6">
            {planFeatures.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Button onClick={() => navigate("/register")} className="w-full bg-gradient-gold text-white font-semibold shadow-sm">
            Começar teste grátis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-slate-500 border-t border-slate-200">
        © 2026 Agenda+Zap. Todos os direitos reservados.
      </footer>
    </div>
  );
};

export default Landing;
