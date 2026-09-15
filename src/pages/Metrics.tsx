import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { CalendarDays, Users, Scissors, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import ExpiredBanner from "@/components/ExpiredBanner";

type Appointment = {
  id: string;
  client_name: string;
  service_name: string;
  date: string;
  time: string;
  status: string;
};

type HourChartItem = {
  hour: string;
  count: number;
};

type ServiceChartItem = {
  name: string;
  value: number;
};

const BAR_COLORS = [
  "hsl(38,80%,55%)",
  "hsl(42, 88%, 62%)",
  "hsl(34, 82%, 48%)",
  "hsl(145, 63%, 42%)",
  "hsl(220, 68%, 56%)",
];

const formatCount = (value: number) => `${value}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0];
  return (
    <div className="rounded-xl border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      {label ? <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p> : null}
      <p className="text-sm font-semibold text-foreground">{item.name}: {item.value}</p>
    </div>
  );
};

const EmptyChart = ({ text }: { text: string }) => (
  <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-border bg-background/20 px-6 text-center">
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>
);

const Metrics = () => {
  const { user, subscriptionStatus } = useAuth();
  const isExpired = subscriptionStatus === "expired";
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serviceCount, setServiceCount] = useState(0);

  useEffect(() => {
    if (!user || isExpired) return;

    const load = async () => {
      const { data: appts } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "confirmed");

      if (appts) setAppointments(appts as Appointment[]);

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

  const serviceData: ServiceChartItem[] = Object.entries(serviceCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const topService = serviceData[0]?.name || "-";

  const hourCounts: Record<string, number> = {};
  appointments.forEach((a) => {
    const hour = `${a.time.split(":")[0]}:00`;
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const hourData: HourChartItem[] = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  const peakHour = [...hourData].sort((a, b) => b.count - a.count)[0]?.hour || "-";

  const stats = [
    { label: "Total de agendamentos", value: totalAppointments, icon: CalendarDays },
    { label: "Clientes atendidos", value: uniqueClients, icon: Users },
    { label: "Serviço mais popular", value: topService, icon: Scissors },
    { label: "Horário de pico", value: peakHour, icon: Clock },
  ];

  return (
    <DashboardLayout>
      {isExpired && <ExpiredBanner />}

      <h1 className="text-2xl font-bold text-foreground mb-6">Métricas</h1>

      {isExpired ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">
            As métricas estão bloqueadas. Assine para continuar acompanhando seus relatórios.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {stats.map((s) => (
              <Card key={s.label} className="glass-card p-4 text-center">
                <s.icon className="mx-auto h-5 w-5 text-primary mb-2" />
                <p className="text-xl font-bold text-foreground break-words">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="glass-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">Horários mais agendados</h3>
                <p className="text-xs text-muted-foreground mt-1">Visualize os horários com maior volume de agendamentos.</p>
              </div>

              {hourData.length === 0 ? (
                <EmptyChart text="Ainda não há agendamentos suficientes para gerar esse gráfico." />
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="hour"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickFormatter={formatCount}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Agendamentos" radius={[8, 8, 0, 0]}>
                        {hourData.map((entry, index) => (
                          <Cell
                            key={`hour-${entry.hour}`}
                            fill={index === 0 ? "hsl(38,80%,55%)" : "hsl(38,70%,58%)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="glass-card p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">Serviços mais solicitados</h3>
                <p className="text-xs text-muted-foreground mt-1">Veja quais serviços recebem mais pedidos dos clientes.</p>
              </div>

              {serviceData.length === 0 ? (
                <EmptyChart text="Ainda não há serviços agendados suficientes para gerar esse gráfico." />
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={serviceData}
                      layout="vertical"
                      margin={{ top: 5, right: 24, left: 24, bottom: 0 }}
                    >
                      <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tickFormatter={formatCount}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={90}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Solicitações" radius={[0, 8, 8, 0]}>
                        {serviceData.map((entry, index) => (
                          <Cell key={`service-${entry.name}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Card className="glass-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Resumo dos serviços</p>
              <p className="text-lg font-semibold text-foreground">{topService}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {serviceData[0]?.value
                  ? `Foi solicitado ${serviceData[0].value}x e lidera entre os agendamentos.`
                  : "Nenhum serviço agendado até agora."}
              </p>
            </Card>

            <Card className="glass-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Resumo dos horários</p>
              <p className="text-lg font-semibold text-foreground">{peakHour}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {peakHour !== "-"
                  ? `Este é o horário com maior concentração de agendamentos.`
                  : "Ainda não há agendamentos suficientes para identificar um horário de pico."}
              </p>
            </Card>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Metrics;
