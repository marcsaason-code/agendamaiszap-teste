import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
}

export type BusinessHours = Record<string, DaySchedule>;

const DAYS = [
  { key: "mon", label: "Segunda" },
  { key: "tue", label: "Terça" },
  { key: "wed", label: "Quarta" },
  { key: "thu", label: "Quinta" },
  { key: "fri", label: "Sexta" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

const TIME_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export const DEFAULT_HOURS: BusinessHours = {
  mon: { enabled: true, open: "08:00", close: "18:00" },
  tue: { enabled: true, open: "08:00", close: "18:00" },
  wed: { enabled: true, open: "08:00", close: "18:00" },
  thu: { enabled: true, open: "08:00", close: "18:00" },
  fri: { enabled: true, open: "08:00", close: "18:00" },
  sat: { enabled: true, open: "08:00", close: "13:00" },
  sun: { enabled: false, open: "08:00", close: "12:00" },
};

interface Props {
  userId: string;
  initialHours: BusinessHours;
  onSaved: () => void;
}

const BusinessHoursCard = ({ userId, initialHours, onSaved }: Props) => {
  const [hours, setHours] = useState<BusinessHours>(initialHours);
  const [saving, setSaving] = useState(false);

  // Sync state when parent data loads/changes
  useEffect(() => {
    setHours(initialHours);
  }, [initialHours]);

  const updateDay = (day: string, field: keyof DaySchedule, value: string | boolean) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error, count } = await supabase
      .from("profiles")
      .update({ business_hours: hours })
      .eq("id", userId)
      .select();
    if (error) {
      console.error("Erro ao salvar horários:", error);
      toast.error("Erro ao salvar horários: " + error.message);
    } else {
      toast.success("Horários salvos!");
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" /> Horário de atendimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {DAYS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <Switch
              checked={hours[key]?.enabled ?? false}
              onCheckedChange={(v) => updateDay(key, "enabled", v)}
            />
            <span className="text-sm font-medium text-foreground w-20 shrink-0">{label}</span>
            {hours[key]?.enabled ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Select value={hours[key].open} onValueChange={(v) => updateDay(key, "open", v)}>
                  <SelectTrigger className="h-8 text-xs w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">às</span>
                <Select value={hours[key].close} onValueChange={(v) => updateDay(key, "close", v)}>
                  <SelectTrigger className="h-8 text-xs w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Fechado</span>
            )}
          </div>
        ))}
        <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-gold text-primary-foreground mt-2">
          {saving ? "Salvando..." : "Salvar horários"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BusinessHoursCard;
