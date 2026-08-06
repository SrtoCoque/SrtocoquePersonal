"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { libreExerciseSlug } from "@/lib/sport";

export function AddCustomExerciseDialog({
  open,
  onOpenChange,
  userId,
  category,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  category: string;
  onAdded: (exercise: { slug: string; title: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setError(null);
    setSaving(false);
  }, [open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const name = title.trim();
    if (!name) {
      setError("Pon un nombre al ejercicio");
      return;
    }

    const slug = libreExerciseSlug(name);
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: upsertError } = await supabase
      .from("user_custom_exercises")
      .upsert(
        {
          user_id: userId,
          category,
          exercise_slug: slug,
          title: name,
        },
        { onConflict: "user_id,category,exercise_slug" },
      );

    setSaving(false);
    if (upsertError) {
      const msg = upsertError.message.toLowerCase();
      setError(
        msg.includes("user_custom_exercises") || msg.includes("schema cache")
          ? "Falta crear la tabla en Supabase. Ejecuta supabase/schema-custom-exercises.sql"
          : upsertError.message,
      );
      return;
    }

    onOpenChange(false);
    onAdded({ slug, title: name });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Añadir ejercicio</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <form className="space-y-4" onSubmit={handleSave}>
          <p className="text-sm text-[var(--muted)]">
            Se guarda en esta sección para siempre (sin imagen). Para un
            entreno puntual usa <strong>Libre</strong>.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="custom-ex-title">Nombre</Label>
            <Input
              id="custom-ex-title"
              placeholder="Ej. Face pulls"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>
          {error ? (
            <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando…
              </>
            ) : (
              "Añadir a la sección"
            )}
          </Button>
        </form>
      </DialogBody>
    </Dialog>
  );
}
