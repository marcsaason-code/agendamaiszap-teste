import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { format, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Sparkles, CalendarDays, Clock, Search, ArrowLeft, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { BusinessHours, DaySchedule } from "@/components/settings/BusinessHoursCard";
import logoVertical from "@/assets/logo-vert-branco.png";

interface Service {
  id: string;
  name: string;
  duration: number;
  price?: number;
  category?: string;
  user_id: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string | null;
}

interface Appointment {
  id: string;
  client_name: string;
  service_name: string;
  date: string;
  time: string;
  status: string;
  staff_name?: string;
}

type ViewMode = "home" | "booking" | "manage";

const DAY_KEY_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function generateTimesFromSchedule(schedule: DaySchedule): string[] {
  if (!schedule.enabled) return [];
  const times: string[] = [];
  const [oh, om] = schedule.open.split(":").map(Number);
  const [ch, cm] = schedule.close.split(":").map(Number);
  let cur = oh * 60 + om;
  const end = ch * 60 + cm;
  while (cur < end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    cur += 30;
  }
  return times;
}

const normalizePhone = (value: string) => value.replace(/\D/g, "");

const PublicBooking = () => {
  const { slug } = useParams();
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [searchPhone, setSearchPhone] = useState("");
  const [foundAppointments, setFoundAppointments] = useState<Appointment[]>([]);
  const [searched, setSearched] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);

  // Total steps depends on whether there are staff members
  const hasStaff = staffList.length > 0;
  const totalSteps = hasStaff ? 5 : 4;

  // Step mapping: with staff → 1:service, 2:staff, 3:date, 4:time, 5:confirm
  // Without staff → 1:service, 2:date, 3:time, 4:confirm
  const getStepLabel = (s: number) => {
    if (hasStaff) {
      return s;
    }
    return s;
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!slug) {
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, business_name, avatar_url, business_hours")
          .eq("slug", slug)
          .maybeSingle();

        if (profile) {
          setOwnerId(profile.id);
          setBusinessName(profile.business_name);
          setAvatarUrl(profile.avatar_url);
          if (profile.business_hours) setBusinessHours(profile.business_hours as BusinessHours);

          const [{ data: svcs }, { data: staffData }] = await Promise.all([
            supabase.from("services").select("*").eq("user_id", profile.id).order("name"),
            supabase.from("staff").select("id, name, role").eq("user_id", profile.id).order("name"),
          ]);

          if (svcs) setServices(svcs);
          if (staffData) setStaffList(staffData);
        }
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [slug]);

  const availableTimes = useMemo(() => {
    if (!selectedDate) return [];
    const dayKey = DAY_KEY_MAP[getDay(selectedDate)];
    if (!businessHours || !businessHours[dayKey]) {
      return [
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
        "11:00", "11:30", "13:00", "13:30", "14:00", "14:30",
        "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
      ];
    }
    return generateTimesFromSchedule(businessHours[dayKey]);
  }, [selectedDate, businessHours]);

  // Fetch existing appointments for the selected date
  useEffect(() => {
    const loadDay = async () => {
      if (!ownerId || !selectedDate) { setDayAppointments([]); return; }
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", ownerId)
        .eq("status", "confirmed")
        .eq("date", format(selectedDate, "yyyy-MM-dd"));
      setDayAppointments(data || []);
    };
    loadDay();
  }, [ownerId, selectedDate]);

  const selectedServiceName = services.find((s) => s.id === selectedService)?.name;
  const selectedStaffName = staffList.find((s) => s.id === selectedStaff)?.name;

  const isSlotTaken = (time: string) => {
    return dayAppointments.some((a) => {
      if (a.time?.slice(0, 5) !== time) return false;
      if (a.service_name !== selectedServiceName) return false;
      if (hasStaff && selectedStaffName && a.staff_name !== selectedStaffName) return false;
      return true;
    });
  };

  const isDateDisabled = (date: Date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    if (!businessHours) return false;
    const dayKey = DAY_KEY_MAP[getDay(date)];
    return businessHours[dayKey] ? !businessHours[dayKey].enabled : false;
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setClientName("");
    setClientPhone("");
    setConfirmed(false);
  };

  // Determine what "date step", "time step", and "confirm step" are
  const dateStep = hasStaff ? 3 : 2;
  const timeStep = hasStaff ? 4 : 3;
  const confirmStep = hasStaff ? 5 : 4;

  const handleConfirm = async () => {
    if (!clientName.trim()) { toast.error("Digite seu nome"); return; }
    const normalizedPhone = normalizePhone(clientPhone);
    if (normalizedPhone.length < 10) { toast.error("Digite um telefone válido com DDD"); return; }
    if (!ownerId) return;
    const service = services.find((s) => s.id === selectedService);
    const staffMember = staffList.find((s) => s.id === selectedStaff);

    const insertData: Record<string, unknown> = {
      user_id: ownerId,
      client_name: clientName.trim(),
      client_phone: normalizedPhone,
      service_id: selectedService,
      service_name: service?.name || "",
      date: format(selectedDate!, "yyyy-MM-dd"),
      time: selectedTime,
      status: "confirmed",
    };

    if (staffMember) {
      insertData.staff_id = staffMember.id;
      insertData.staff_name = staffMember.name;
    }

    const { error } = await supabase.from("appointments").insert(insertData);
    if (error) { toast.error("Erro ao agendar. Tente novamente."); return; }
    setConfirmed(true);
    toast.success("Agendamento confirmado!");
  };

  const handleSearch = async () => {
    const normalizedPhone = normalizePhone(searchPhone);
    if (!ownerId || normalizedPhone.length < 10) {
      toast.error("Digite um telefone válido com DDD");
      return;
    }

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", ownerId)
      .eq("status", "confirmed")
      .eq("client_phone", normalizedPhone);

    if (error) {
      toast.error("Não foi possível buscar seus agendamentos.");
      return;
    }

    setFoundAppointments(data || []);
    setSearched(true);
  };

  const handleCancelAppointment = async (id: string) => {
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    setFoundAppointments((prev) => prev.filter((a) => a.id !== id));
    toast.success("Agendamento cancelado");
  };

  if (viewMode === "home") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          {profileLoading ? (
            <div
              className="h-20 w-20 rounded-full bg-muted animate-pulse mx-auto mb-4"
              aria-label="Carregando imagem do perfil"
            />
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt={businessName}
              className="h-20 w-20 rounded-full object-cover mx-auto mb-4 border-2 border-border"
            />
          ) : (
            <img src={logoVertical} alt="Agenda+Zap" className="h-20 mx-auto mb-4" />
          )}
          <p className="text-muted-foreground mb-8">{businessName || slug?.replace(/-/g, " ") || "Agendamento online"}</p>
          <div className="space-y-3">
            <Button onClick={() => { resetBooking(); setViewMode("booking"); }} className="w-full bg-gradient-gold text-primary-foreground font-semibold py-6 text-base">
              <CalendarDays className="mr-2 h-5 w-5" /> Agendar horário
            </Button>
            <Button variant="outline" onClick={() => { setSearched(false); setSearchPhone(""); setFoundAppointments([]); setViewMode("manage"); }} className="w-full py-6 text-base">
              <Search className="mr-2 h-5 w-5" /> Meus agendamentos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "manage") {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="max-w-md mx-auto">
          <Button variant="ghost" size="sm" onClick={() => setViewMode("home")} className="mb-4 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h2 className="text-xl font-bold text-foreground mb-4">Meus agendamentos</h2>
          <div className="flex gap-2 mb-4">
            <Input
              type="tel"
              inputMode="tel"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Seu telefone com DDD"
            />
            <Button onClick={handleSearch} className="bg-gradient-gold text-primary-foreground">Buscar</Button>
          </div>
          {searched && foundAppointments.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado.</p>
          )}
          {foundAppointments.map((a) => (
            <div key={a.id} className="glass-card p-4 mb-3 flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-foreground">{a.service_name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.date} às {a.time}
                  {a.staff_name && ` • ${a.staff_name}`}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => handleCancelAppointment(a.id)}>
                Cancelar
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-md mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setViewMode("home")} className="mb-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        {confirmed ? (
          <div className="text-center glass-card p-8">
            <Check className="mx-auto h-12 w-12 text-primary mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Confirmado!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {services.find((s) => s.id === selectedService)?.name} — {format(selectedDate!, "dd/MM/yyyy")} às {selectedTime}
              {selectedStaff && ` • com ${staffList.find((s) => s.id === selectedStaff)?.name}`}
            </p>
            <Button onClick={() => setViewMode("home")} className="bg-gradient-gold text-primary-foreground">Voltar ao início</Button>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="flex gap-2 mb-6">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                <div key={s} className={cn("h-1 flex-1 rounded-full", step >= s ? "bg-primary" : "bg-muted")} />
              ))}
            </div>

            {/* Step 1: Service */}
            {step === 1 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4">Escolha o serviço</h2>
                <div className="space-y-2">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedService(s.id);
                        setStep(hasStaff ? 2 : 2);
                      }}
                      className={cn(
                        "w-full glass-card p-4 text-left flex justify-between items-center transition-colors",
                        selectedService === s.id && "border-primary"
                      )}
                    >
                      <div>
                        <p className="font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.duration}min{s.category ? ` • ${s.category}` : ""}</p>
                      </div>
                      {s.price && <span className="text-sm text-primary font-semibold">R${s.price}</span>}
                    </button>
                  ))}
                  {services.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum serviço disponível.</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Staff (only if staff exists) */}
            {step === 2 && hasStaff && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4">Escolha o atendente</h2>
                <div className="space-y-2">
                  {staffList.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStaff(s.id);
                        setStep(3);
                      }}
                      className={cn(
                        "w-full glass-card p-4 text-left flex items-center gap-3 transition-colors",
                        selectedStaff === s.id && "border-primary"
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <UserRound className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{s.name}</p>
                        {s.role && <p className="text-xs text-muted-foreground">{s.role}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date step */}
            {step === dateStep && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4">Escolha a data</h2>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { if (d) { setSelectedDate(d); setStep(timeStep); } }}
                  locale={ptBR}
                  disabled={isDateDisabled}
                  className="glass-card p-3"
                />
              </div>
            )}

            {/* Time step */}
            {step === timeStep && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4">Escolha o horário</h2>
                {availableTimes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum horário disponível nesta data.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimes.map((t) => {
                      const taken = isSlotTaken(t);
                      return (
                        <button
                          key={t}
                          disabled={taken}
                          onClick={() => { if (!taken) { setSelectedTime(t); setStep(confirmStep); } }}
                          title={taken ? "Horário já agendado" : undefined}
                          className={cn(
                            "glass-card p-3 text-sm font-mono text-center transition-colors",
                            taken
                              ? "bg-yellow-200/40 dark:bg-yellow-500/20 border-yellow-400/60 text-yellow-700 dark:text-yellow-300 cursor-not-allowed"
                              : selectedTime === t ? "border-primary text-primary" : "text-foreground"
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Confirm step */}
            {step === confirmStep && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4">Seus dados</h2>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Seu nome" className="mb-3" />
                <Input
                  type="tel"
                  inputMode="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Telefone com DDD"
                  className="mb-4"
                  required
                />
                <div className="glass-card p-4 mb-4 text-sm space-y-1">
                  <p className="text-muted-foreground flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> {services.find((s) => s.id === selectedService)?.name}</p>
                  {selectedStaff && (
                    <p className="text-muted-foreground flex items-center gap-2"><UserRound className="h-3.5 w-3.5" /> {staffList.find((s) => s.id === selectedStaff)?.name}</p>
                  )}
                  <p className="text-muted-foreground flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> {format(selectedDate!, "dd/MM/yyyy")}</p>
                  <p className="text-muted-foreground flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {selectedTime}</p>
                </div>
                <Button onClick={handleConfirm} className="w-full bg-gradient-gold text-primary-foreground font-semibold">
                  Confirmar agendamento
                </Button>
              </div>
            )}

            {step > 1 && !confirmed && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="mt-4 text-muted-foreground">
                Voltar
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PublicBooking;
