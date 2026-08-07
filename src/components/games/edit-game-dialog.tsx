"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
import type {
  GamePlaythroughKind,
  GameStatus,
  UserGame,
  UserGamePlaythrough,
} from "@/lib/types";
import {
  GAME_PLAYTHROUGH_KIND_LABELS,
  GAME_STATUS_LABELS,
  isGameOnShelf,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { submitFormOnEnter } from "@/lib/submit-form-on-enter";
import {
  GAME_STOREFRONT_LABELS,
  GameStorefrontIcon,
  GameStorefrontPicker,
  normalizeStorefronts,
  type GameStorefront,
} from "@/components/games/game-storefront";
import {
  normalizeGamePrices,
  pricesDraftToDb,
  pricesToDraft,
  prunePricesDraft,
  type GamePricesDraft,
} from "@/lib/game-prices";

type Props = {
  game: UserGame | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
};

type PlaythroughDraft = {
  start_date: string;
  finish_date: string;
  hours_played: number;
  rating: number | "";
};

type PendingArchive = {
  start_date: string | null;
  finish_date: string | null;
  hours_played: number;
  rating: number | null;
};

function formatDay(iso: string | null): string {
  if (!iso) return "—";
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return iso;
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function EditGameDialog({
  game,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: Props) {
  const [status, setStatus] = useState<GameStatus>("wishlist");
  const [storefronts, setStorefronts] = useState<GameStorefront[]>([]);
  const [prices, setPrices] = useState<GamePricesDraft>({});
  const [hoursPlayed, setHoursPlayed] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [playthroughs, setPlaythroughs] = useState<UserGamePlaythrough[]>([]);
  const [editingPlaythroughId, setEditingPlaythroughId] = useState<string | null>(
    null,
  );
  const [playthroughDraft, setPlaythroughDraft] =
    useState<PlaythroughDraft | null>(null);
  const [pendingArchive, setPendingArchive] = useState<PendingArchive | null>(
    null,
  );
  const [addingPlaythrough, setAddingPlaythrough] = useState(false);
  const [newPlaythroughKind, setNewPlaythroughKind] =
    useState<GamePlaythroughKind>("completed");
  const [newPlaythrough, setNewPlaythrough] = useState<PlaythroughDraft>({
    start_date: "",
    finish_date: "",
    hours_played: 0,
    rating: "",
  });
  const [saving, setSaving] = useState(false);
  const [finishingReplay, setFinishingReplay] = useState(false);
  const [replayFinishReady, setReplayFinishReady] = useState(false);
  const [dropFinishReady, setDropFinishReady] = useState(false);
  const [showAllStatuses, setShowAllStatuses] = useState(false);
  const [savingPlaythrough, setSavingPlaythrough] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!game || !open) return;
    const today = todayISO();
    setStatus(game.status);
    setStorefronts(normalizeStorefronts(game.storefronts));
    setPrices(pricesToDraft(normalizeGamePrices(game.prices)));
    setHoursPlayed(Number(game.hours_played) || 0);
    setStartDate(game.start_date ?? today);
    if (game.status === "replaying") {
      setFinishDate("");
      setReplayFinishReady(false);
      setDropFinishReady(false);
    } else if (game.status === "playing") {
      setFinishDate("");
      setReplayFinishReady(false);
      setDropFinishReady(false);
    } else {
      setFinishDate(game.finish_date ?? today);
      setReplayFinishReady(false);
      setDropFinishReady(false);
    }
    setRating(game.rating ?? "");
    setEditingPlaythroughId(null);
    setPlaythroughDraft(null);
    setPendingArchive(null);
    setAddingPlaythrough(false);
    setShowAllStatuses(false);
    setError(null);

    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_game_playthroughs")
        .select("*")
        .eq("user_game_id", game.id)
        .order("created_at", { ascending: false });
      setPlaythroughs((data as UserGamePlaythrough[]) ?? []);
    })();
  }, [game, open]);

  const statusOptions = useMemo(() => {
    const hideWishlist =
      !showAllStatuses &&
      status !== "wishlist" &&
      !!game &&
      isGameOnShelf(game.status);

    const withReplay =
      game?.status === "completed" ||
      game?.status === "replaying" ||
      status === "replaying" ||
      playthroughs.length > 0;

    const options: GameStatus[] = hideWishlist
      ? ["owned", "playing", "completed"]
      : ["wishlist", "owned", "playing", "completed"];

    // Solo visible si el juego ya está sin terminar (no como opción al elegir estado)
    if (status === "dropped" || game?.status === "dropped") {
      options.push("dropped");
    }

    if (withReplay) options.push("replaying");
    return options;
  }, [game, status, playthroughs.length, showAllStatuses]);

  function selectStatus(next: GameStatus) {
    const today = todayISO();
    // Completado → Rejugando: guardar snapshot del completado (fechas/horas del formulario)
    if (next === "replaying" && status === "completed") {
      setPendingArchive({
        start_date: startDate || game?.start_date || null,
        finish_date: finishDate || game?.finish_date || null,
        hours_played: hoursPlayed || Number(game?.hours_played) || 0,
        rating: rating === "" ? (game?.rating ?? null) : rating,
      });
      setStartDate(today);
      setHoursPlayed(0);
      setFinishDate("");
      setRating("");
      setReplayFinishReady(false);
      setDropFinishReady(false);
    }
    if (next === "completed" && status === "replaying") {
      setFinishDate((prev) => prev || today);
      setReplayFinishReady(true);
    }
    if (next === "dropped") {
      setFinishDate((prev) => prev || today);
      setDropFinishReady(true);
    }
    if (next === "playing") {
      setDropFinishReady(false);
      setFinishDate("");
    }
    setStatus(next);
  }

  function beginFinishReplay() {
    setFinishDate(todayISO());
    setReplayFinishReady(true);
  }

  function beginDropPlaying() {
    setFinishDate(todayISO());
    setDropFinishReady(true);
  }

  function startEditPlaythrough(p: UserGamePlaythrough) {
    setEditingPlaythroughId(p.id);
    setPlaythroughDraft({
      start_date: p.start_date?.slice(0, 10) ?? "",
      finish_date: p.finish_date?.slice(0, 10) ?? "",
      hours_played: Number(p.hours_played) || 0,
      rating: p.rating ?? "",
    });
    setError(null);
  }

  function cancelEditPlaythrough() {
    setEditingPlaythroughId(null);
    setPlaythroughDraft(null);
  }

  async function handleSavePlaythrough() {
    if (!editingPlaythroughId || !playthroughDraft) return;
    setSavingPlaythrough(true);
    setError(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("user_game_playthroughs")
      .update({
        start_date: playthroughDraft.start_date || null,
        finish_date: playthroughDraft.finish_date || null,
        hours_played: playthroughDraft.hours_played,
        rating:
          playthroughDraft.rating === "" ? null : playthroughDraft.rating,
      })
      .eq("id", editingPlaythroughId)
      .select("*")
      .single();
    setSavingPlaythrough(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (data) {
      setPlaythroughs((prev) =>
        prev.map((p) =>
          p.id === editingPlaythroughId ? (data as UserGamePlaythrough) : p,
        ),
      );
    }
    cancelEditPlaythrough();
  }

  async function insertPlaythrough(
    supabase: ReturnType<typeof createClient>,
    current: UserGame,
    kind: GamePlaythroughKind,
    values: {
      start_date: string | null;
      finish_date: string | null;
      hours_played: number;
      rating: number | null;
    },
  ) {
    return supabase
      .from("user_game_playthroughs")
      .insert({
        user_game_id: current.id,
        user_id: current.user_id,
        kind,
        start_date: values.start_date || null,
        finish_date: values.finish_date || todayISO(),
        hours_played: values.hours_played,
        rating: values.rating,
      })
      .select("*")
      .single();
  }

  async function ensureCompletedArchive(
    supabase: ReturnType<typeof createClient>,
    current: UserGame,
    snapshot: PendingArchive,
  ) {
    if (playthroughs.some((p) => p.kind === "completed")) return null;
    const { error: archiveError } = await insertPlaythrough(
      supabase,
      current,
      "completed",
      snapshot,
    );
    return archiveError;
  }

  async function handleFinishReplay() {
    if (!game) return;
    if (storefronts.length === 0) {
      setError("Elige al menos una tienda (Steam, PlayStation…)");
      return;
    }
    setFinishingReplay(true);
    setError(null);
    const supabase = createClient();
    const finish = finishDate || todayISO();

    // Si aún no hay la 1ª completación en historial, archívala antes
    if (pendingArchive) {
      const archiveError = await ensureCompletedArchive(
        supabase,
        game,
        pendingArchive,
      );
      if (archiveError) {
        setFinishingReplay(false);
        setError(
          archiveError.message.includes("user_game_playthroughs")
            ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-playthroughs.sql"
            : archiveError.message,
        );
        return;
      }
    }

    const { error: replayError } = await insertPlaythrough(supabase, game, "replay", {
      start_date: startDate || null,
      finish_date: finish,
      hours_played: hoursPlayed,
      rating: rating === "" ? null : rating,
    });
    if (replayError) {
      setFinishingReplay(false);
      setError(
        replayError.message.includes("user_game_playthroughs")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-playthroughs.sql"
          : replayError.message,
      );
      return;
    }

    const { error: updateError } = await supabase
      .from("user_games")
      .update({
        status: "completed",
        storefronts,
        hours_played: hoursPlayed,
        prices: pricesDraftToDb(prices, storefronts),
        start_date: startDate || null,
        finish_date: finish,
        rating: rating === "" ? null : rating,
      })
      .eq("id", game.id);

    setFinishingReplay(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  async function handleSave() {
    if (!game) return;
    if (status !== "wishlist" && storefronts.length === 0) {
      setError("Elige al menos una tienda (Steam, PlayStation…)");
      return;
    }

    // Rejugando con fecha de finalización → cerrar la rejugada
    if (status === "replaying" && replayFinishReady && finishDate) {
      await handleFinishReplay();
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const prev = game.status;
    const today = todayISO();

    // Completado → Rejugando (o ya rejugando con snapshot): archivar 1ª partida
    if (status === "replaying") {
      const snapshot: PendingArchive | null =
        pendingArchive ??
        (prev === "completed"
          ? {
              start_date: game.start_date,
              finish_date: game.finish_date,
              hours_played: Number(game.hours_played) || 0,
              rating: game.rating,
            }
          : null);
      if (snapshot) {
        const archiveError = await ensureCompletedArchive(
          supabase,
          game,
          snapshot,
        );
        if (archiveError) {
          setSaving(false);
          setError(
            archiveError.message.includes("user_game_playthroughs")
              ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-playthroughs.sql"
              : archiveError.message,
          );
          return;
        }
      }
    }

    // Primera completación: guardar en historial (también rellena juegos antiguos)
    if (status === "completed" && prev !== "replaying") {
      const archiveError = await ensureCompletedArchive(supabase, game, {
        start_date: startDate || null,
        finish_date: finishDate || today,
        hours_played: hoursPlayed,
        rating: rating === "" ? null : rating,
      });
      if (archiveError) {
        setSaving(false);
        setError(
          archiveError.message.includes("user_game_playthroughs")
            ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-playthroughs.sql"
            : archiveError.message,
        );
        return;
      }
    }

    // Rejugando → Completado: guardar esta rejugada
    if (prev === "replaying" && status === "completed") {
      if (pendingArchive) {
        const archiveError = await ensureCompletedArchive(
          supabase,
          game,
          pendingArchive,
        );
        if (archiveError) {
          setSaving(false);
          setError(archiveError.message);
          return;
        }
      }
      const { error: replayError } = await insertPlaythrough(
        supabase,
        game,
        "replay",
        {
          start_date: startDate || null,
          finish_date: finishDate || today,
          hours_played: hoursPlayed,
          rating: rating === "" ? null : rating,
        },
      );
      if (replayError) {
        setSaving(false);
        setError(
          replayError.message.includes("user_game_playthroughs")
            ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-playthroughs.sql"
            : replayError.message,
        );
        return;
      }
    }

    const activeRun =
      status === "playing" ||
      status === "replaying" ||
      status === "completed" ||
      status === "dropped" ||
      dropFinishReady;

    const statusToSave: GameStatus =
      status === "playing" && dropFinishReady ? "dropped" : status;

    const { error: updateError } = await supabase
      .from("user_games")
      .update({
        status: statusToSave,
        storefronts: statusToSave === "wishlist" ? [] : storefronts,
        hours_played: activeRun ? hoursPlayed : 0,
        prices:
          statusToSave === "wishlist"
            ? {}
            : pricesDraftToDb(prices, storefronts),
        start_date: activeRun ? startDate || null : null,
        finish_date:
          statusToSave === "completed" || statusToSave === "dropped"
            ? finishDate || null
            : null,
        rating: rating === "" ? null : rating,
      })
      .eq("id", game.id);

    setSaving(false);
    if (updateError) {
      setError(
        updateError.message.includes("dropped")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-dropped.sql"
          : updateError.message.includes("replaying")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-playthroughs.sql"
          : updateError.message.includes("storefront")
            ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-storefronts-multi.sql"
            : updateError.message.includes("prices")
              ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-prices-by-storefront.sql"
              : updateError.message.includes("start_date")
                ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-start-date.sql"
                : updateError.message,
      );
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  async function handleAddPlaythrough() {
    if (!game || !newPlaythrough.finish_date) {
      setError("Indica al menos la fecha de finalización");
      return;
    }
    setSavingPlaythrough(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await insertPlaythrough(
      supabase,
      game,
      newPlaythroughKind,
      {
        start_date: newPlaythrough.start_date || null,
        finish_date: newPlaythrough.finish_date,
        hours_played: newPlaythrough.hours_played,
        rating: newPlaythrough.rating === "" ? null : newPlaythrough.rating,
      },
    );
    setSavingPlaythrough(false);
    if (insertError) {
      setError(
        insertError.message.includes("user_game_playthroughs")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-playthroughs.sql"
          : insertError.message,
      );
      return;
    }
    if (data) {
      setPlaythroughs((prev) => [data as UserGamePlaythrough, ...prev]);
    }
    setAddingPlaythrough(false);
    setNewPlaythrough({
      start_date: "",
      finish_date: "",
      hours_played: 0,
      rating: "",
    });
  }

  async function handleDeletePlaythrough(id: string) {
    setDeletingId(id);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("user_game_playthroughs")
      .delete()
      .eq("id", id);
    setDeletingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (editingPlaythroughId === id) cancelEditPlaythrough();
    setPlaythroughs((prev) => prev.filter((p) => p.id !== id));
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

  const showProgress =
    status === "playing" ||
    status === "replaying" ||
    status === "completed" ||
    status === "dropped";
  const showFinishDate =
    status === "completed" ||
    status === "dropped" ||
    (status === "replaying" && replayFinishReady) ||
    (status === "playing" && dropFinishReady);
  const showReplayFinishButton = status === "replaying" && !replayFinishReady;
  const showDropFinishButton = status === "playing" && !dropFinishReady;
  const showRating =
    status === "completed" ||
    status === "dropped" ||
    replayFinishReady ||
    dropFinishReady;
  const busy = saving || deleting || finishingReplay || savingPlaythrough;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Editar juego</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <form
          className="space-y-4"
          onKeyDown={submitFormOnEnter}
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void handleSave();
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
                    {game.developers.join(", ") ||
                      game.platforms.slice(0, 2).join(", ")}
                  </p>
                  {playthroughs.length > 0 ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {playthroughs.length}{" "}
                      {playthroughs.length === 1
                        ? "partida en historial"
                        : "partidas en historial"}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar juego"
                  title="Eliminar juego"
                  onClick={handleDelete}
                  disabled={busy}
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

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Estado</Label>
              {game &&
              isGameOnShelf(game.status) &&
              status !== "wishlist" &&
              !showAllStatuses ? (
                <button
                  type="button"
                  onClick={() => setShowAllStatuses(true)}
                  className="text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
                >
                  Ver todas
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => selectStatus(s)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors",
                    s === "replaying" && "col-span-2 text-center",
                    status === s
                      ? s === "wishlist"
                        ? "border-amber-500 bg-amber-500/15"
                        : s === "replaying"
                          ? "border-red-500 bg-red-500/15"
                          : s === "dropped"
                            ? "border-zinc-500 bg-zinc-500/15"
                            : "border-[var(--accent)] bg-[var(--accent)]/10"
                      : s === "replaying"
                        ? "border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                        : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      status === s
                        ? s === "wishlist"
                          ? "text-amber-700 dark:text-amber-300"
                          : s === "replaying"
                            ? "text-red-600 dark:text-red-400"
                            : s === "dropped"
                              ? "text-zinc-700 dark:text-zinc-300"
                              : "text-[var(--accent)]"
                        : s === "replaying"
                          ? "text-red-600 dark:text-red-400"
                          : "",
                    )}
                  >
                    {GAME_STATUS_LABELS[s]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {status !== "wishlist" ? (
            <>
              <GameStorefrontPicker
                value={storefronts}
                onChange={(next) => {
                  setStorefronts(next);
                  setPrices(prunePricesDraft(prices, next));
                }}
                required
              />
              {storefronts.length > 0 ? (
                <div className="space-y-3">
                  <Label>Precio pagado (€)</Label>
                  <div className="space-y-2">
                    {storefronts.map((sf) => (
                      <div key={sf} className="flex items-center gap-2">
                        <span
                          title={GAME_STOREFRONT_LABELS[sf]}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)]"
                        >
                          <GameStorefrontIcon
                            storefront={sf}
                            className="h-5 w-5"
                          />
                        </span>
                        <Input
                          id={`edit-price-${sf}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.01}
                          placeholder={GAME_STOREFRONT_LABELS[sf]}
                          aria-label={`Precio en ${GAME_STOREFRONT_LABELS[sf]}`}
                          value={prices[sf] ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              setPrices({ ...prices, [sf]: "" });
                              return;
                            }
                            const n = Number(raw);
                            if (!Number.isFinite(n) || n < 0) return;
                            setPrices({ ...prices, [sf]: n });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {showProgress ? (
            <div className="space-y-3">
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
              <div
                className={cn(
                  "grid gap-3",
                  status === "replaying" ||
                    status === "completed" ||
                    status === "dropped" ||
                    status === "playing"
                    ? "grid-cols-2"
                    : "grid-cols-1",
                )}
              >
                <div className="space-y-2">
                  <Label htmlFor="game-start">Inicio</Label>
                  <Input
                    id="game-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                {showReplayFinishButton ? (
                  <div className="space-y-2">
                    <Label>Finalizado</Label>
                    <Button
                      type="button"
                      className="h-10 w-full border-red-500 bg-red-600 text-white hover:bg-red-700"
                      disabled={busy}
                      onClick={beginFinishReplay}
                    >
                      Finalizar
                    </Button>
                  </div>
                ) : null}
                {showDropFinishButton ? (
                  <div className="space-y-2">
                    <Label>Finalizado</Label>
                    <Button
                      type="button"
                      className="h-10 w-full border-zinc-500 bg-zinc-600 text-white hover:bg-zinc-700"
                      disabled={busy}
                      onClick={beginDropPlaying}
                    >
                      Sin terminar
                    </Button>
                  </div>
                ) : null}
                {showFinishDate ? (
                  <div className="space-y-2">
                    <Label htmlFor="game-finish">Finalizado</Label>
                    <Input
                      id="game-finish"
                      type="date"
                      value={finishDate}
                      min={startDate || undefined}
                      onChange={(e) => setFinishDate(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {showRating ? (
            <div className="space-y-2">
              <Label htmlFor="game-rating">Valoración (1–5)</Label>
              <Input
                id="game-rating"
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) =>
                  setRating(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                placeholder="Opcional"
              />
            </div>
          ) : null}

          {status === "completed" ||
          status === "replaying" ||
          status === "dropped" ||
          status === "playing" ||
          playthroughs.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Historial de partidas ({playthroughs.length})</Label>
                {!addingPlaythrough ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      setAddingPlaythrough(true);
                      setNewPlaythroughKind(
                        playthroughs.some((p) => p.kind === "completed")
                          ? "replay"
                          : "completed",
                      );
                      setNewPlaythrough({
                        start_date: "",
                        finish_date: todayISO(),
                        hours_played: 0,
                        rating: "",
                      });
                      setError(null);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-[var(--muted)]">
                Pulsa una partida para editarla. Si falta un año (p. ej. 2023),
                añádelo aquí.
              </p>

              {addingPlaythrough ? (
                <div className="space-y-3 rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Nueva partida</p>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Cancelar"
                        onClick={() => setAddingPlaythrough(false)}
                        disabled={savingPlaythrough}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Guardar partida"
                        onClick={() => void handleAddPlaythrough()}
                        disabled={savingPlaythrough}
                        className="text-[var(--accent)]"
                      >
                        {savingPlaythrough ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["completed", "replay"] as GamePlaythroughKind[]).map(
                      (kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => setNewPlaythroughKind(kind)}
                          className={cn(
                            "rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                            newPlaythroughKind === kind
                              ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                              : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                          )}
                        >
                          {GAME_PLAYTHROUGH_KIND_LABELS[kind]}
                        </button>
                      ),
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Horas</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={newPlaythrough.hours_played}
                      onChange={(e) =>
                        setNewPlaythrough({
                          ...newPlaythrough,
                          hours_played: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Inicio</Label>
                      <Input
                        type="date"
                        value={newPlaythrough.start_date}
                        onChange={(e) =>
                          setNewPlaythrough({
                            ...newPlaythrough,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Finalizado</Label>
                      <Input
                        type="date"
                        value={newPlaythrough.finish_date}
                        onChange={(e) =>
                          setNewPlaythrough({
                            ...newPlaythrough,
                            finish_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {playthroughs.length > 0 ? (
                <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)]">
                  {playthroughs.map((p) => {
                    const isEditing = editingPlaythroughId === p.id;
                    return (
                      <li key={p.id} className="px-3 py-2.5">
                        {isEditing && playthroughDraft ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">
                                Editar · {GAME_PLAYTHROUGH_KIND_LABELS[p.kind]}
                              </p>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Cancelar"
                                  title="Cancelar"
                                  disabled={savingPlaythrough}
                                  onClick={cancelEditPlaythrough}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Guardar partida"
                                  title="Guardar partida"
                                  disabled={savingPlaythrough}
                                  onClick={() => void handleSavePlaythrough()}
                                  className="text-[var(--accent)]"
                                >
                                  {savingPlaythrough ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`pt-hours-${p.id}`}>Horas</Label>
                              <Input
                                id={`pt-hours-${p.id}`}
                                type="number"
                                min={0}
                                step={0.5}
                                value={playthroughDraft.hours_played}
                                onChange={(e) =>
                                  setPlaythroughDraft({
                                    ...playthroughDraft,
                                    hours_played: Number(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor={`pt-start-${p.id}`}>
                                  Inicio
                                </Label>
                                <Input
                                  id={`pt-start-${p.id}`}
                                  type="date"
                                  value={playthroughDraft.start_date}
                                  onChange={(e) =>
                                    setPlaythroughDraft({
                                      ...playthroughDraft,
                                      start_date: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`pt-finish-${p.id}`}>
                                  Finalizado
                                </Label>
                                <Input
                                  id={`pt-finish-${p.id}`}
                                  type="date"
                                  value={playthroughDraft.finish_date}
                                  min={
                                    playthroughDraft.start_date || undefined
                                  }
                                  onChange={(e) =>
                                    setPlaythroughDraft({
                                      ...playthroughDraft,
                                      finish_date: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`pt-rating-${p.id}`}>
                                Valoración (1–5)
                              </Label>
                              <Input
                                id={`pt-rating-${p.id}`}
                                type="number"
                                min={1}
                                max={5}
                                value={playthroughDraft.rating}
                                onChange={(e) =>
                                  setPlaythroughDraft({
                                    ...playthroughDraft,
                                    rating:
                                      e.target.value === ""
                                        ? ""
                                        : Number(e.target.value),
                                  })
                                }
                                placeholder="Opcional"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => startEditPlaythrough(p)}
                              className="min-w-0 flex-1 rounded-lg text-left transition-colors hover:bg-[var(--surface-2)]"
                            >
                              <p className="flex items-center gap-1.5 text-sm font-medium">
                                {GAME_PLAYTHROUGH_KIND_LABELS[p.kind]}
                                <Pencil className="h-3 w-3 text-[var(--muted)]" />
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                {formatDay(p.start_date)} →{" "}
                                {formatDay(p.finish_date)}
                                {Number(p.hours_played) > 0
                                  ? ` · ${Number(p.hours_played)} h`
                                  : ""}
                                {p.rating ? ` · ★${p.rating}` : ""}
                              </p>
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Eliminar partida"
                              title="Eliminar del historial"
                              disabled={deletingId === p.id || busy}
                              onClick={() => void handleDeletePlaythrough(p.id)}
                              className="shrink-0 text-[var(--danger)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                            >
                              {deletingId === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : !addingPlaythrough ? (
                <p className="rounded-xl border border-dashed border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--muted)]">
                  Aún no hay partidas en el historial
                </p>
              ) : null}
            </div>
          ) : null}

          {error && (
            <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {(saving || finishingReplay) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {status === "replaying" && replayFinishReady
              ? "Finalizar rejugada"
              : status === "playing" && dropFinishReady
                ? "Marcar sin terminar"
                : "Guardar cambios"}
          </Button>
        </form>
      </DialogBody>
    </Dialog>
  );
}
