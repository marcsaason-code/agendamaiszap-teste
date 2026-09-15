import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Clock, DollarSign, Tag } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import StaffCard, { type Staff } from "@/components/services/StaffCard";
import ExpiredBanner from "@/components/ExpiredBanner";

interface Service {
  id: string;
  name: string;
  duration: number;
  price?: number;
  category?: string;
}

const Services = () => {
  const { user, subscriptionStatus } = useAuth();
  const isExpired = subscriptionStatus === "expired";
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (user) {
      fetchServices();
      fetchStaff();
    }
  }, [user]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at");
    if (data) setServices(data);
  };

  const fetchStaff = async () => {
    const { data } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", user!.id)
      .order("name");
    if (data) setStaff(data);
  };

  const openNew = () => {
    setEditing(null);
    setName("");
    setDuration("");
    setPrice("");
    setCategory("");
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setName(s.name);
    setDuration(String(s.duration));
    setPrice(s.price ? String(s.price) : "");
    setCategory(s.category || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name || !duration) {
      toast.error("Preencha nome e duração");
      return;
    }
    if (editing) {
      await supabase.from("services").update({
        name, duration: Number(duration),
        price: price ? Number(price) : null,
        category: category || null,
      }).eq("id", editing.id);
      toast.success("Serviço atualizado");
    } else {
      await supabase.from("services").insert({
        user_id: user!.id, name, duration: Number(duration),
        price: price ? Number(price) : null,
        category: category || null,
      });
      toast.success("Serviço criado");
    }
    setDialogOpen(false);
    fetchServices();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("services").delete().eq("id", id);
    setServices((prev) => prev.filter((s) => s.id !== id));
    toast.success("Serviço removido");
  };

  return (
    <DashboardLayout>
      {isExpired && <ExpiredBanner />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
        {!isExpired && (
          <Button onClick={openNew} className="bg-gradient-gold text-primary-foreground">
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        )}
      </div>

      {isExpired ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">O cadastro de serviços e atendentes está bloqueado. Assine para continuar.</p>
        </div>
      ) : (
        <>

      <div className="grid gap-3 mb-8">
        {services.map((s) => (
          <div key={s.id} className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{s.name}</p>
              <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.duration}min</span>
                {s.price && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> R${s.price}</span>}
                {s.category && <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {s.category}</span>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(s.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum serviço cadastrado. Clique em "Novo" para começar.</p>
        )}
      </div>

      {/* Staff / Atendentes */}
      {user && (
        <StaffCard userId={user.id} staff={staff} onRefresh={fetchStaff} />
      )}
      </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="Ex: Corte Feminino, Manicure..." />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1" placeholder="Ex: Cabelo, Unhas, Estética..." />
            </div>
            <div>
              <Label>Duração (min)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="bg-gradient-gold text-primary-foreground">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Services;
