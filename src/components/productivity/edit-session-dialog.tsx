"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
  type ProductivitySessionWithTag,
  type ProductivityTag,
} from "@/lib/productivity";
import { TagSelect } from "@/components/productivity/tag-select";
import { cn } from "@/lib/utils";

function durationParts(seconds: number): { hours: string; minutes: string } {
  const h = Math.floor(Math.max(0, seconds) / 3600);
  const m = Math.floor((Math.max(0, seconds) % 3600) / 60);
  return { hours: String(h), minutes: String(m) };
}

function timeFromISO(iso: string | null, fallbackDay: string): string {
  if (iso) {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/Madrid",
      }).format(new Date(iso));
    } catch {
      /* fall through */
    }
  }
  void fallbackDay;
  return "09:00";
}

export function EditSessionDialog({
  open,
  onOpenChange,
  userId,
  tags,
  session,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  tags: ProductivityTag[];
  session: ProductivitySessionWithTag | null;
  onSaved: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
}) {
  const [tagId, setTagId] = useState("");
  const [day, setDay] = useState(todayISODate());
  const [time, setTime] = useState("09:00");
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !session) return;
    const dayValue = session.performed_on.slice(0, 10);
    const parts = durationParts(session.duration_seconds);
    setTagId(session.tag_id);
    setDay(dayValue);
    setTime(timeFromISO(session.started_at, dayValue));
    setHours(parts.hours);
    setMinutes(parts.minutes);
    setNotes(session.notes ?? "");
    setError(null);
    setSaving(false);
    setDeleting(false);
  }, [open, session]);

  const durationSeconds = Math.round(
    (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60,
  );
  const canSave =
    Boolean(session) &&
    Boolean(tagId) &&
    durationSeconds > 0 &&
    Boolean(day) &&
    Boolean(time);

  async function save() {
    if (!session || !canSave) return;

    setSaving(true);
    setError(null);
    const startedLocal = `${day}T${time}:00`;
    const started = new Date(startedLocal);
    const ended = new Date(started.getTime() + durationSeconds * 1000);
    const notesTrimmed = notes.trim();

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_productivity_sessions")
      .update({
        tag_id: tagId,
        duration_seconds: durationSeconds,
        performed_on: day,
        started_at: Number.isNaN(started.getTime())
          ? null
          : started.toISOString(),
        ended_at: Number.isNaN(ended.getTime()) ? null : ended.toISOString(),
        notes: notesTrimmed || null,
      })
      .eq("id", session.id)
      .eq("user_id", userId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onOpenChange(false);
    await onSaved();
  }

  async function remove() {
    if (!session) return;
    if (!confirm("¿Borrar esta sesión?")) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("user_productivity_sessions")
      .delete()
      .eq("id", session.id)
      .eq("user_id", userId);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onOpenChange(false);
    await onDeleted();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;
    void save();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Editar sesión</DialogTitle>
      </DialogHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label>Etiqueta</Label>
            <TagSelect
              tags={tags}
              value={tagId}
              onChange={setTagId}
              aria-label="Etiqueta"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-day">Día</Label>
              <Input
                id="edit-day"
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-time">Hora inicio</Label>
              <Input
                id="edit-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-hours">Horas</Label>
              <Input
                id="edit-hours"
                type="number"
                min={0}
                step={1}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-mins">Minutos</Label>
              <Input
                id="edit-mins"
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
            <Label htmlFor="edit-notes">Notas</Label>
            <textarea
              id="edit-notes"
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
          {session ? (
            <p className="text-xs text-[var(--muted)]">
              Origen:{" "}
              {session.source === "timer" ? "Cronómetro" : "Manual"}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : null}
        </DialogBody>
        <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-[var(--danger)]"
            disabled={deleting || saving}
            onClick={() => void remove()}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Borrar
          </Button>
          <div className="flex gap-2">
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
          </div>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
