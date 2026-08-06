"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { GameStatus, UserGame } from "@/lib/types";
import { GAME_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  game: UserGame | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
};

export function EditGameDialog({
  game,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: Props) {
  const [status, setStatus] = useState<GameStatus>("wishlist");
  const [hoursPlayed, setHoursPlayed] = useState(0);
  const [finishDate, setFinishDate] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!game || !open) return;
    setStatus(game.status);
    setHoursPlayed(Number(game.hours_played) || 0);
    setFinishDate(game.finish_date ?? new Date().toISOString().slice(0, 10));
    setRating(game.rating ?? "");
    setError(null);
  }, [game, open]);

  async function handleSave() {
    if (!game) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_games")
      .update({
        status,
        hours_played: hoursPlayed,
        finish_date: status === "completed" ? finishDate || null : null,
        rating: rating === "" ? null : rating,
      })
      .eq("id", game.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  async function handleDelete() {
    if (!game) return;
    if (!confirm(`¿Eliminar «${game.title}»?`)) return;

    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("user_games")
      .delete()
      .eq("id", game.id);

    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onOpenChange(false);
    onDeleted();
  }

  if (!game) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Editar juego</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!saving && !deleting) void handleSave();
          }}
        >
        <div className="flex gap-3">
          <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]">
            {game.cover_url && (
              <Image
                src={game.cover_url}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
                unoptimized
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-snug">{game.title}</p>
                <p className="text-sm text-[var(--muted)]">
                  {game.developers.join(", ") || game.platforms.slice(0, 2).join(", ")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Eliminar juego"
                title="Eliminar juego"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="shrink-0 text-[var(--danger)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>¿Dónde está?</Label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(GAME_STATUS_LABELS) as GameStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  status === s
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                )}
              >
                <span
                  className={cn(
                    "block text-sm font-medium",
                    status === s ? "text-[var(--accent)]" : "",
                  )}
                >
                  {GAME_STATUS_LABELS[s]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {status === "playing" && (
          <div className="space-y-2">
            <Label htmlFor="hours-played">Horas jugadas</Label>
            <Input
              id="hours-played"
              type="number"
              min={0}
              step={0.5}
              value={hoursPlayed}
              onChange={(e) => setHoursPlayed(Number(e.target.value))}
            />
          </div>
        )}

        {status === "completed" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="game-finish">Fecha de finalización</Label>
              <Input
                id="game-finish"
                type="date"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="game-rating">Valoración (1–5)</Label>
              <Input
                id="game-rating"
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) =>
                  setRating(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Opcional"
              />
            </div>
          </>
        )}

        {error && (
          <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={saving || deleting}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
        </form>
      </DialogBody>
    </Dialog>
  );
}
