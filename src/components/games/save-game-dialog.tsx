"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  GameDestinationFields,
  gameDestinationToStatus,
  type GameDestination,
} from "@/components/games/game-destination-fields";
import { createClient } from "@/lib/supabase/client";
import type { GameShelfStatus, RawgGameResult } from "@/lib/types";

type Props = {
  game: RawgGameResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved?: () => void;
};

export function SaveGameDialog({
  game,
  open,
  onOpenChange,
  userId,
  onSaved,
}: Props) {
  const [destination, setDestination] = useState<GameDestination | null>(null);
  const [shelfStatus, setShelfStatus] = useState<GameShelfStatus>("owned");
  const [finishDate, setFinishDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDestination(null);
    setShelfStatus("owned");
    setFinishDate(new Date().toISOString().slice(0, 10));
    setError(null);
    setDone(false);
  }, [open, game?.rawgId]);

  async function handleSave() {
    if (!game || !destination) return;
    setSaving(true);
    setError(null);

    const status = gameDestinationToStatus(destination, shelfStatus);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("user_games").insert({
      user_id: userId,
      rawg_id: game.rawgId,
      title: game.title,
      developers: game.developers,
      cover_url: game.coverUrl,
      platforms: game.platforms,
      released: game.released,
      metacritic: game.metacritic,
      status,
      hours_played: 0,
      playtime_estimate: game.playtimeEstimate,
      finish_date: status === "completed" ? finishDate : null,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setDone(true);
    onSaved?.();
    setTimeout(() => onOpenChange(false), 700);
  }

  if (!game) return null;

  const canSave = destination === "wishlist" || destination === "shelf";
  const saveLabel =
    destination === "wishlist"
      ? "Añadir a Wishlist"
      : destination === "shelf"
        ? "Añadir a la estantería"
        : "Elige una opción";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Guardar juego</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <div className="flex gap-4">
          <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-3)] shadow-md">
            {game.coverUrl ? (
              <Image
                src={game.coverUrl}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug">
              {game.title}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {game.platforms.slice(0, 3).join(", ") || "Plataformas desconocidas"}
            </p>
            {game.metacritic ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                Metacritic {game.metacritic}
              </p>
            ) : null}
          </div>
        </div>

        <GameDestinationFields
          destination={destination}
          onDestinationChange={setDestination}
          shelfStatus={shelfStatus}
          onShelfStatusChange={setShelfStatus}
          finishDate={finishDate}
          onFinishDateChange={setFinishDate}
        />

        {error && (
          <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        {done && (
          <p className="rounded-lg bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--accent)]">
            Guardado correctamente
          </p>
        )}

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={!canSave || saving || done}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saveLabel}
        </Button>
      </DialogBody>
    </Dialog>
  );
}
