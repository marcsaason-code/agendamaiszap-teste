import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CalendarDays, Clock, User, Phone, Sparkles, X, Pencil, Crown, AlertTriangle, Plus } from "lucide-react";
import ExpiredBanner from "@/components/ExpiredBanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface Appointment {
  id: string;
  client_name: string;
  client_phone?: string | null;
  service_name: string;
  date: string;
  time: string;
  status: string;
  staff_name?: string;
}

interface Service {
  id: string;
  name: string;
  price: number | null;
}

interface StaffMember {
  id: string;
  name: string;
  role: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, subscriptionStatus, trialDaysRemaining } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // --- Novo agendamento (criação manual) ---
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newServiceId, setNewServiceId] = useState("");
  const [newStaffId, setNewStaffId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const hasStaff = staffList.length > 0;

  const formatPhone = (phone?: string | null) => {
    if (!phone) return "Telefone não informado";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  useEffect(() => {
    if (!user) return;
    if (subscriptionStatus !== "expired") {
      fetchAppointments();
    }
  }, [user, subscriptionStatus]);

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user!.id)
      .order("time");
    if (data) setAppointments(data);
  };

  // Carrega serviços e profissionais ao abrir o modal de criação
  useEffect(() => {
    if (!creating || !user) return;
    const loadOptions = async () => {
      const [{ data: svcs }, { data: staff }] = await Promise.all([
        supabase.from("services").select("id, name, price").eq("user_id", user.id).order("name"),
        supabase.from("staff").select("id, name, role").eq("user_id", user.id).order("name"),
      ]);
      if (svcs) setServices(svcs);
      if (staff) setStaffList(staff);
    };
    loadOptions();
  }, [creating, user]);

  const openCreate = () => {
    setNewDate(format(selectedDate, "yyyy-MM-dd"));
    setCreating(true);
  };

  const resetCreateForm = () => {
    setNewName("");
    setNewPhone("");
    setNewServiceId("");
    setNewStaffId("");
    setNewDate("");
    setNewTime("");
  };

  const handleCreate = async () => {
    if (!user) return;

    if (!newName.trim() || !newPhone.trim() || !newServiceId || !newDate || !newTime) {
      toast.error("Preencha nome, telefone, serviço, data e hora.");
      return;
    }

    // Profissional é obrigatório quando o negócio tem atendentes cadastrados
    if (hasStaff && !newStaffId) {
      toast.error("Selecione o profissional.");
      return;
    }

    const service = services.find((s) => s.id === newServiceId);
    const staffMember = staffList.find((s) => s.id === newStaffId);

    // Impede horário ocupado para o MESMO serviço e profissional (regra do app)
    const conflict = appointments.some(
      (a) =>
        a.status === "confirmed" &&
        a.date === newDate &&
        String(a.time).slice(0, 5) === newTime &&
        a.service_name === (service?.name ?? "") &&
        (!hasStaff || a.staff_name === (staffMember?.name ?? "")),
    );
    if (conflict) {
      toast.error("Esse horário já está ocupado para este serviço/profissional.");
      return;
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      client_name: newName.trim(),
      client_phone: newPhone.trim(),
      service_id: newServiceId,
      service_name: service?.name ?? "",
      date: newDate,
      time: newTime,
      status: "confirmed",
    };

    if (staffMember) {
      insertData.staff_id = staffMember.id;
      insertData.staff_name = staffMember.name;
    }

    setSaving(true);
    const { data, error } = await supabase.from("appointments").insert(insertData).select().single();
    setSaving(false);

    if (error) {
      toast.error("Não foi possível criar o agendamento.");
      return;
    }

    if (data) setAppointments((prev) => [...prev, data as Appointment]);
    toast.success("Agendamento criado");
    resetCreateForm();
    setCreating(false);
  };

  const isExpired = subscriptionStatus === "expired";

  const trialProgress = ((3 - trialDaysRemaining) / 3) * 100;
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const dayAppointments = appointments
    .filter((a) => a.date === dateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const handleCancel = async (id: string) => {
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
    toast.success("Agendamento cancelado");
  };

  const handleEdit = (id: string) => {
    const appt = appointments.find((a) => a.id === id);
    if (appt) {
      setEditingId(id);
      setEditTime(appt.time);
      setEditName(appt.client_name);
      setEditPhone(appt.client_phone ?? "");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    await supabase
      .from("appointments")
      .update({ time: editTime, client_name: editName, client_phone: editPhone.trim() })
      .eq("id", editingId);
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === editingId
          ? { ...a, time: editTime, client_name: editName, client_phone: editPhone.trim() }
          : a,
      )
    );
    setEditingId(null);
    toast.success("Agendamento atualizado");
  };

  return (
    <DashboardLayout>
      {subscriptionStatus === "trial" && (
        <div className="glass-card p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Teste grátis — {trialDaysRemaining} {trialDaysRemaining === 1 ? "dia" : "dias"} restantes
              </p>
              <Progress value={trialProgress} className="w-40 h-2 mt-1" />
            </div>
          </div>
          <Button size="sm" onClick={() => navigate("/dashboard/subscription")} className="bg-gradient-gold text-primary-foreground text-xs">
            Assinar
          </Button>
        </div>
      )}

      {isExpired && <ExpiredBanner />}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        {!isExpired && (
          <Button onClick={openCreate} className="bg-gradient-gold text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" /> Novo agendamento
          </Button>
        )}
      </div>

      {isExpired ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">A agenda está bloqueada. Assine para continuar acompanhando seus agendamentos.</p>
        </div>
      ) : (
        <>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => d && setSelectedDate(d)}
          locale={ptBR}
          modifiers={{
            booked: appointments
              .filter((a) => a.status === "confirmed")
              .map((a) => {
                const [y, m, d] = a.date.split("-").map(Number);
                return new Date(y, m - 1, d);
              }),
          }}
          modifiersClassNames={{
            booked:
              "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-destructive",
          }}
          className="glass-card p-3"
        />

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
          </h2>
          {dayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum agendamento neste dia.</p>
          ) : (
            dayAppointments.map((a) => (
              <div key={a.id} className={cn("glass-card p-4 flex items-center justify-between", a.status === "cancelled" && "opacity-50")}>
                <div className="flex items-center gap-4">
                  <div className="text-primary font-mono text-sm font-bold">{a.time}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> {a.client_name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Phone className="h-3 w-3" /> {formatPhone(a.client_phone)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" /> {a.service_name}
                      {a.staff_name ? ` • ${a.staff_name}` : ""}
                    </p>
                  </div>
                </div>
                {a.status === "confirmed" && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(a.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleCancel(a.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                {a.status === "cancelled" && <span className="text-xs text-destructive">Cancelado</span>}
              </div>
            ))
          )}
        </div>
      </div>
      </>
      )}

      {/* Modal: editar agendamento */}
      <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do cliente</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Telefone do cliente</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="mt-1"
                placeholder="Ex: (11) 99999-9999"
                inputMode="tel"
              />
            </div>
            <div>
              <Label>Horário</Label>
              <Input value={editTime} onChange={(e) => setEditTime(e.target.value)} className="mt-1" placeholder="HH:MM" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit} className="bg-gradient-gold text-primary-foreground">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: novo agendamento (criação manual) */}
      <Dialog
        open={creating}
        onOpenChange={(o) => {
          setCreating(o);
          if (!o) resetCreateForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do cliente</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1"
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="mt-1"
                placeholder="Ex: (11) 99999-9999"
              />
            </div>
            <div>
              <Label>Serviço</Label>
              <select
                value={newServiceId}
                onChange={(e) => setNewServiceId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione um serviço</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.price != null ? ` — R$ ${Number(s.price).toFixed(2)}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {hasStaff && (
              <div>
                <Label>Profissional</Label>
                <select
                  value={newStaffId}
                  onChange={(e) => setNewStaffId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione um profissional</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.role ? ` — ${s.role}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-gradient-gold text-primary-foreground">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Dashboard;
