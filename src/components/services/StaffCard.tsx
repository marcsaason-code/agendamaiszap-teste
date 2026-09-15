import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export interface Staff {
  id: string;
  name: string;
  role: string | null;
  user_id: string;
}

interface Props {
  userId: string;
  staff: Staff[];
  onRefresh: () => void;
}

const StaffCard = ({ userId, staff, onRefresh }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const openNew = () => {
    setEditing(null);
    setName("");
    setRole("");
    setDialogOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditing(s);
    setName(s.name);
    setRole(s.role || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Preencha o nome do atendente");
      return;
    }
    if (editing) {
      const { error } = await supabase
        .from("staff")
        .update({ name: name.trim(), role: role.trim() || null })
        .eq("id", editing.id);
      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
        return;
      }
      toast.success("Atendente atualizado");
    } else {
      const { error } = await supabase.from("staff").insert({
        user_id: userId,
        name: name.trim(),
        role: role.trim() || null,
      });
      if (error) {
        toast.error("Erro ao criar: " + error.message);
        return;
      }
      toast.success("Atendente cadastrado");
    }
    setDialogOpen(false);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }
    toast.success("Atendente removido");
    onRefresh();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UserRound className="h-4 w-4" /> Atendentes
            </CardTitle>
            <Button size="sm" onClick={openNew} className="bg-gradient-gold text-primary-foreground h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum atendente cadastrado. Adicione para que clientes possam escolher.
            </p>
          )}
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                {s.role && <p className="text-xs text-muted-foreground">{s.role}</p>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar atendente" : "Novo atendente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="Ex: Maria, João..." />
            </div>
            <div>
              <Label>Função (opcional)</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} className="mt-1" placeholder="Ex: Barbeiro, Manicure..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="bg-gradient-gold text-primary-foreground">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StaffCard;
