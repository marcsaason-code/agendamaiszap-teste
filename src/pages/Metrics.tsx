import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CalendarDays, Users, Scissors, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import ExpiredBanner from "@/components/ExpiredBanner";

const COLORS = ["hsl(38,80%,55%)", "hsl(38,70%,70%)", "hsl(38,90%,40%)", "hsl(30,8%,40%)"];

const Metrics = () => {
  const { user, subscriptionStatus } = useAuth();
  const isExpired = subscriptionStatus === "expired";
  const [appointments, setAppointments] = useState<any[]>([]);
  const [serviceCount, setServiceCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    if (isExpired) return;
    const load = async () => {
      const { data: appts } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "confirmed");
      if (appts) setAppointments(appts);

      const { count } = await supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setServiceCount(count || 0);
    };
    load();
  }, [user, isExpired]);

  const totalAppointments = appointments.length;
  const uniqueClients = new Set(appointments.map((a) => a.client_name)).size;

  const serviceCounts: Record<string, number> = {};
  appointments.forEach((a) => {
    serviceCounts[a.service_name] = (serviceCounts[a.service_name] || 0) + 1;
  });
  const serviceData = Object.entries(serviceCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const topService = serviceData[0]?.name || "-";

  const hourCounts: Record<string, number> = {};
  appointments.forEach((a) => {
    const hour = a.time.split(":")[0] + ":00";
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const hourData = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  const stats = [
    { label: "Total de agendamentos", value: totalAppointments, icon: CalendarDays },
    { label: "Clientes atendidos", value: uniqueClients, icon: Users },
    { label: "Serviço mais popular", value: topService, icon: Scissors },
    { label: "Total de serviços", value: serviceCount, icon: Clock },
  ];

  return (
    <DashboardLayout>
      {isExpired && <ExpiredBanner />}

      <h1 className="text-2xl font-bold text-foreground mb-6">Métricas</h1>

      {isExpired ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">As métricas estão bloqueadas. Assine para continuar acompanhando seus relatórios.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {stats.map((s) => (
              <Card key={s.label} className="glass-card p-4 text-center">
                <s.icon className="mx-auto h-5 w-5 text-primary mb-2" />
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Horários mais agendados</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourData}>
                  <XAxis dataKey="hour" tick={{ fill: "hsl(30,10%,55%)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(30,10%,55%)", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(38,80%,55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Serviços mais solicitados</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={serviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {serviceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Metrics;
