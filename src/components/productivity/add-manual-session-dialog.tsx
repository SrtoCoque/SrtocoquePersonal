"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  todayISODate,
  type ProductivityTag,
} from "@/lib/productivity";
import { TagSelect } from "@/components/productivity/tag-select";
import { cn } from "@/lib/utils";

export function AddManualSessionDialog({
  open,
  onOpenChange,
  userId,
  tags,
  onSaved,
  onNeedTags,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  tags: ProductivityTag[];
  onSaved: () => void | Promise<void>;
  onNeedTags: () => void;
}) {
  const [tagId, setTagId] = useState("");
  const [day, setDay] = useState(todayISODate());
  const [time, setTime] = useState("09:00");
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDay(todayISODate());
    setTagId(tags[0]?.id ?? "");
    setHours("1");
    setMinutes("0");
    setTime("09:00");
    setNotes("");
    setError(null);
  }, [open, tags]);

  const durationSeconds = Math.round(
    (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60,
  );
  const canSave = Boolean(tagId) && durationSeconds > 0 && Boolean(day) && Boolean(time);

  async function save() {
    if (!tagId) {
      onNeedTags();
      return;
    }
    if (durationSeconds <= 0) {
      setError("Indica una duración mayor que 0");
      return;
    }
    if (!day || !time) {
      setError("Indica día y hora de inicio");
      return;
    }

    setSaving(true);
    setError(null);
    const startedLocal = `${day}T${time}:00`;
    const started = new Date(startedLocal);
    const ended = new Date(started.getTime() + durationSeconds * 1000);
    const notesTrimmed = notes.trim();

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("user_productivity_sessions")
      .insert({
        user_id: userId,
        tag_id: tagId,
        duration_seconds: durationSeconds,
        performed_on: day,
        started_at: Number.isNaN(started.getTime())
          ? null
          : started.toISOString(),
        ended_at: Number.isNaN(ended.getTime()) ? null : ended.toISOString(),
        source: "manual",
        notes: notesTrimmed || null,
      });
    setSaving(false);
    if (insertError) {
      setError(
        insertError.message.includes("user_productivity")
          ? "Falta actualizar Supabase. Ejecuta supabase/schema-productivity.sql"
          : insertError.message,
      );
      return;
    }
    onOpenChange(false);
    await onSaved();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;
    void save();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Añadir horas</DialogTitle>
      </DialogHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label>Etiqueta</Label>
            {tags.length === 0 ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start"
                onClick={onNeedTags}
              >
                Crear una etiqueta primero
              </Button>
            ) : (
              <TagSelect
                tags={tags}
                value={tagId}
                onChange={setTagId}
                aria-label="Etiqueta"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="manual-day">Día</Label>
              <Input
                id="manual-day"
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-time">Hora inicio</Label>
              <Input
                id="manual-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="manual-hours">Horas</Label>
              <Input
                id="manual-hours"
                type="number"
                min={0}
                step={1}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-mins">Minutos</Label>
              <Input
                id="manual-mins"
                type="number"
                min={0}
                max={59}
                step={1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-notes">Notas</Label>
            <textarea
              id="manual-notes"
              rows={3}
              value={notes}
              placeholder="Opcional"
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.shiftKey) return;
                e.preventDefault();
                if (canSave && !saving) void save();
              }}
              className={cn(
                "w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm",
                "placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              )}
            />
            <p className="text-xs text-[var(--muted)]">
              Enter guarda · Mayús+Enter nueva línea
            </p>
          </div>
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !canSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
