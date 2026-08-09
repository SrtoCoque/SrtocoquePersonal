"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, Trash2, X } from "lucide-react";
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
import { GAME_STATUS_LABELS, isGameOnShelf, normalizeGameStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { submitFormOnEnter } from "@/lib/submit-form-on-enter";
import {
  GAME_STOREFRONT_LABELS,
  GamePlayStorefrontPicker,
  GameStorefrontChips,
  GameStorefrontIcon,
  GameStorefrontPicker,
  isGameStorefront,
  normalizeStorefronts,
  storefrontsFromPlatformNames,
  type GameStorefront,
} from "@/components/games/game-storefront";
import {
  normalizeGamePrices,
  nextPricesSetAt,
  pricesDraftToDb,
  pricesToDraft,
  prunePricesDraft,
  type GamePricesDraft,
} from "@/lib/game-prices";
import {
  hoursCountedForStats,
  insertHourLogIfIncreased,
  todayPlayedOn,
} from "@/lib/game-hour-logs";
import { lastPlayedOnDate } from "@/lib/game-last-played";
import { GameAchievements } from "@/components/games/game-achievements";
import { GameScoreBadges } from "@/components/games/game-score-badges";

type Props = {
  game: UserGame | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
  latestHourPlayedOn?: string | null;
};

function pickPlayStorefront(
  list: GameStorefront[],
  preferred: GameStorefront | null | undefined,
): GameStorefront | null {
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  if (preferred && list.includes(preferred)) return preferred;
  return null;
}

function formatDisplayDate(iso: string): string {
  if (!iso) return "—";
  try {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(y, m - 1, d));
  } catch {
    return iso;
  }
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
  latestHourPlayedOn,
}: Props) {
  const [status, setStatus] = useState<GameStatus>("wishlist");
  const [storefronts, setStorefronts] = useState<GameStorefront[]>([]);
  const [playStorefront, setPlayStorefront] = useState<GameStorefront | null>(
    null,
  );
  const [prices, setPrices] = useState<GamePricesDraft>({});
  const [hoursPlayed, setHoursPlayed] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [timesCompleted, setTimesCompleted] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dropFinishReady, setDropFinishReady] = useState(false);
  const [showAllStatuses, setShowAllStatuses] = useState(false);
  const [editingStorefronts, setEditingStorefronts] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);
  const [addPlayOpen, setAddPlayOpen] = useState(false);
  const [playSnapshot, setPlaySnapshot] = useState<{
    startDate: string;
    finishDate: string;
    hoursPlayed: number;
    playStorefront: GameStorefront | null;
    timesCompleted: number;
    rating: number | "";
  } | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!game || !open) return;
    const today = todayISO();
    const normalizedStatus = normalizeGameStatus(game.status);
    setStatus(normalizedStatus);
    const nextStorefronts = normalizeStorefronts(game.storefronts);
    setStorefronts(nextStorefronts);
    setPlayStorefront(
      pickPlayStorefront(
        nextStorefronts,
        isGameStorefront(game.play_storefront)
          ? game.play_storefront
          : null,
      ),
    );
    setPrices(pricesToDraft(normalizeGamePrices(game.prices)));
    setHoursPlayed(Number(game.hours_played) || 0);
    setStartDate(game.start_date ?? today);
    if (normalizedStatus === "playing") {
      setFinishDate("");
      setDropFinishReady(false);
    } else if (
      normalizedStatus === "completed" ||
      normalizedStatus === "dropped"
    ) {
      setFinishDate(game.finish_date ?? today);
      setDropFinishReady(false);
    } else {
      setFinishDate("");
      setDropFinishReady(false);
    }
    setRating(game.rating ?? "");
    const priorTimes = Number(game.times_completed) || 0;
    setTimesCompleted(
      priorTimes > 0
        ? priorTimes
        : normalizedStatus === "completed"
          ? 1
          : 0,
    );
    setShowAllStatuses(false);
    setEditingStorefronts(false);
    setEditingProgress(false);
    setAddPlayOpen(false);
    setPlaySnapshot(null);
    setCoverOpen(false);
    setError(null);
  }, [game, open]);

  useEffect(() => {
    if (!coverOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCoverOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [coverOpen]);

  const statusOptions = useMemo(() => {
    const savedStatus = game ? normalizeGameStatus(game.status) : null;
    const fromWishlist = savedStatus === "wishlist";

    // Wishlist: solo Wishlist ↔ Biblioteca (owned)
    if (fromWishlist && status === "wishlist" && !showAllStatuses) {
      return ["wishlist", "owned"] as GameStatus[];
    }

    const hideWishlist =
      !showAllStatuses &&
      status !== "wishlist" &&
      !!game &&
      (isGameOnShelf(game.status) || fromWishlist);

    const options: GameStatus[] = hideWishlist
      ? ["owned", "playing", "completed"]
      : ["wishlist", "owned", "playing", "completed"];

    if (status === "dropped" || savedStatus === "dropped") {
      options.push("dropped");
    }

    return options;
  }, [game, status, showAllStatuses]);

  function statusButtonLabel(s: GameStatus): string {
    if (
      s === "owned" &&
      game &&
      normalizeGameStatus(game.status) === "wishlist" &&
      status === "wishlist"
    ) {
      return "Biblioteca";
    }
    return GAME_STATUS_LABELS[s];
  }

  function selectStatus(next: GameStatus) {
    const today = todayISO();
    const hadStartDate = Boolean(game?.start_date);

    // Completado → Jugando = partida nueva (la anterior queda solo como referencia en UI)
    if (next === "playing" && status === "completed") {
      const base =
        addPlayOpen && playSnapshot
          ? playSnapshot
          : {
              startDate,
              finishDate,
              hoursPlayed,
              playStorefront,
              timesCompleted,
              rating,
            };
      if (addPlayOpen && playSnapshot) {
        setTimesCompleted(playSnapshot.timesCompleted);
        setRating(playSnapshot.rating);
      }
      setPlaySnapshot(base);
      setAddPlayOpen(false);
      setStartDate(today);
      setHoursPlayed(0);
      setFinishDate("");
      setRating("");
      setDropFinishReady(false);
      setEditingProgress(false);
      setStatus(next);
      return;
    }

    // Jugando (partida nueva sin datos) → Completado = cancelar, no sumar ×1
    if (next === "completed" && status === "playing" && playSnapshot) {
      const untouched =
        hoursPlayed === 0 &&
        !finishDate &&
        rating === "" &&
        startDate === today;
      if (untouched) {
        setStartDate(playSnapshot.startDate);
        setFinishDate(playSnapshot.finishDate);
        setHoursPlayed(playSnapshot.hoursPlayed);
        setPlayStorefront(playSnapshot.playStorefront);
        setTimesCompleted(playSnapshot.timesCompleted);
        setRating(playSnapshot.rating);
        setPlaySnapshot(null);
        setAddPlayOpen(false);
        setDropFinishReady(false);
        setStatus("completed");
        return;
      }
    }

    if (next === "dropped") {
      setFinishDate((prev) => prev || today);
      setDropFinishReady(false);
    }
    if (next === "playing" && next !== status) {
      setPlaySnapshot(null);
      setAddPlayOpen(false);
      setDropFinishReady(false);
      setFinishDate("");
      if (!hadStartDate) {
        const hours = Number(game?.hours_played) || 0;
        const last =
          hours > 0
            ? lastPlayedOnDate(game!, latestHourPlayedOn)
            : null;
        setStartDate(last || today);
      }
    }
    if (next === "completed") {
      setFinishDate((prev) => prev || today);
      setDropFinishReady(false);
      setTimesCompleted((prev) => {
        // Cierre real de una partida nueva iniciada desde completado → jugando
        if (status === "playing" && playSnapshot) {
          return Math.max(prev, playSnapshot.timesCompleted) + 1;
        }
        if (status === "playing" && prev >= 1) return prev + 1;
        return Math.max(prev, 1);
      });
      setPlaySnapshot(null);
      setAddPlayOpen(false);
    }
    if (next !== "completed" && next !== "playing") {
      setPlaySnapshot(null);
      setAddPlayOpen(false);
    }
    setStatus(next);
  }

  function beginDropPlaying() {
    setFinishDate(todayISO());
    setDropFinishReady(true);
  }

  function beginCompletePlaying() {
    setFinishDate(todayISO());
    setDropFinishReady(false);
    setTimesCompleted((prev) => {
      if (playSnapshot) {
        return Math.max(prev, playSnapshot.timesCompleted) + 1;
      }
      if (prev >= 1) return prev + 1;
      return 1;
    });
    setPlaySnapshot(null);
    setAddPlayOpen(false);
    setStatus("completed");
  }

  function beginAddPlaythrough() {
    if (!addPlayOpen) {
      setPlaySnapshot({
        startDate,
        finishDate,
        hoursPlayed,
        playStorefront,
        timesCompleted,
        rating,
      });
      const today = todayISO();
      setStartDate(today);
      setFinishDate(today);
      setHoursPlayed(0);
      setAddPlayOpen(true);
      setEditingProgress(false);
      setDropFinishReady(false);
    }
    setTimesCompleted((n) => Math.max(1, n) + 1);
  }

  function cancelAddPlaythrough() {
    if (playSnapshot) {
      setStartDate(playSnapshot.startDate);
      setFinishDate(playSnapshot.finishDate);
      setHoursPlayed(playSnapshot.hoursPlayed);
      setPlayStorefront(playSnapshot.playStorefront);
      setTimesCompleted(playSnapshot.timesCompleted);
      setRating(playSnapshot.rating);
    }
    setAddPlayOpen(false);
    setPlaySnapshot(null);
  }

  async function handleSave() {
    if (!game) return;
    if (status !== "wishlist" && storefronts.length === 0) {
      setError("Elige al menos una tienda (Steam, PlayStation…)");
      return;
    }

    const needsPlayStorefront =
      status === "playing" ||
      status === "completed" ||
      status === "dropped" ||
      dropFinishReady;
    const resolvedPlay = pickPlayStorefront(storefronts, playStorefront);
    if (needsPlayStorefront && storefronts.length > 1 && !resolvedPlay) {
      setError("Elige desde qué tienda estás jugando");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();

    const activeRun =
      status === "playing" ||
      status === "completed" ||
      status === "dropped" ||
      dropFinishReady;

    const statusToSave: GameStatus =
      status === "playing" && dropFinishReady ? "dropped" : status;

    const nextPrices =
      statusToSave === "wishlist"
        ? (() => {
            const steam = normalizeGamePrices(game.prices).steam;
            return steam != null ? { steam } : {};
          })()
        : pricesDraftToDb(prices, storefronts);

    const { error: updateError } = await supabase
      .from("user_games")
      .update({
        status: statusToSave,
        storefronts: statusToSave === "wishlist" ? [] : storefronts,
        play_storefront:
          statusToSave === "wishlist" || !activeRun ? null : resolvedPlay,
        hours_played:
          statusToSave === "wishlist"
            ? 0
            : statusToSave === "owned" || activeRun
              ? hoursPlayed
              : 0,
        prices: nextPrices,
        prices_set_at:
          statusToSave === "wishlist"
            ? null
            : nextPricesSetAt({
                nextPrices,
                previousSetAt: game.prices_set_at,
              }),
        start_date: activeRun ? startDate || null : null,
        finish_date:
          statusToSave === "completed" || statusToSave === "dropped"
            ? finishDate || null
            : null,
        rating:
          statusToSave === "completed" || statusToSave === "dropped"
            ? rating === ""
              ? null
              : rating
            : null,
        times_completed:
          statusToSave === "completed"
            ? Math.max(1, Number(timesCompleted) || 1)
            : Math.max(0, Number(timesCompleted) || 0),
      })
      .eq("id", game.id);

    setSaving(false);
    if (updateError) {
      setError(
        updateError.message.includes("dropped")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-dropped.sql"
          : updateError.message.includes("play_storefront")
            ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-play-storefront.sql"
            : updateError.message.includes("storefront")
              ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-storefronts-multi.sql"
              : updateError.message.includes("prices_set_at")
                ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-prices-set-at.sql"
              : updateError.message.includes("times_completed")
                ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-times-completed.sql"
              : updateError.message.includes("prices")
                ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-prices-by-storefront.sql"
                : updateError.message.includes("start_date")
                  ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-start-date.sql"
                  : updateError.message,
      );
      return;
    }

    const hoursBefore = hoursCountedForStats(game);
    const nextHours =
      statusToSave === "wishlist"
        ? 0
        : statusToSave === "owned" || activeRun
          ? hoursPlayed
          : 0;
    const hoursAfter = hoursCountedForStats({
      ...game,
      status: statusToSave,
      storefronts: statusToSave === "wishlist" ? [] : storefronts,
      play_storefront:
        statusToSave === "wishlist" || !activeRun ? null : resolvedPlay,
      hours_played: nextHours,
    });
    const { error: logError } = await insertHourLogIfIncreased(supabase, {
      userId: game.user_id,
      gameId: game.id,
      before: hoursBefore,
      after: hoursAfter,
      playedOn:
        statusToSave === "completed" || statusToSave === "dropped"
          ? finishDate || todayPlayedOn()
          : todayPlayedOn(),
      source: "manual",
    });
    if (logError?.message.includes("user_game_hour_logs")) {
      setError(
        "Falta actualizar Supabase. Ejecuta supabase/migrate-game-hour-logs.sql",
      );
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

    // No reimportar desde la wishlist de Steam en la próxima sync
    if (game.steam_app_id != null) {
      await supabase.from("user_steam_wishlist_ignored").upsert(
        {
          user_id: game.user_id,
          steam_app_id: game.steam_app_id,
        },
        { onConflict: "user_id,steam_app_id" },
      );
    }

    const { error: deleteError } = await supabase
      .from("user_games")
      .delete()
      .eq("id", game.id);

    setDeleting(false);
    if (deleteError) {
      setError(
        deleteError.message.includes("user_steam_wishlist_ignored")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-steam-wishlist-ignored.sql"
          : deleteError.message,
      );
      return;
    }
    onOpenChange(false);
    onDeleted();
  }

  const availableStorefronts = useMemo(
    () => storefrontsFromPlatformNames(game?.platforms),
    [game?.platforms],
  );

  if (!game) return null;

  const currentGame = game;
  const fromWishlist = normalizeGameStatus(game.status) === "wishlist";
  const joiningLibrary = fromWishlist && status !== "wishlist";

  const showProgress =
    status === "playing" ||
    status === "completed" ||
    status === "dropped";
  const showFinishDate =
    status === "completed" ||
    status === "dropped" ||
    (status === "playing" && dropFinishReady);
  const showDropFinishButton = status === "playing" && !dropFinishReady;
  const showRating =
    status === "completed" ||
    status === "dropped" ||
    dropFinishReady;
  const busy = saving || deleting;

  const savedFinished =
    normalizeGameStatus(game.status) === "completed" ||
    normalizeGameStatus(game.status) === "dropped";
  const viewingFinished = status === "completed" || status === "dropped";
  /** Ya estaba completado/abandonado: resumen + Editar, no inputs a la vista. */
  const progressAsInfo =
    showProgress &&
    savedFinished &&
    viewingFinished &&
    !editingProgress &&
    !addPlayOpen;

  const showPreviousRun = Boolean(
    playSnapshot && (addPlayOpen || status === "playing"),
  );
  const summaryStart = showPreviousRun ? playSnapshot!.startDate : startDate;
  const summaryFinish = showPreviousRun ? playSnapshot!.finishDate : finishDate;
  const summaryHours = showPreviousRun ? playSnapshot!.hoursPlayed : hoursPlayed;
  const summaryPlay = showPreviousRun
    ? playSnapshot!.playStorefront
    : playStorefront;

  function applyStorefronts(next: GameStorefront[]) {
    setStorefronts(next);
    setPrices(prunePricesDraft(prices, next));
    const nextPlay = pickPlayStorefront(next, playStorefront);
    setPlayStorefront(nextPlay);
    if (nextPlay === "steam") {
      const steamH = Number(currentGame.steam_hours_played) || 0;
      if (steamH > hoursPlayed) setHoursPlayed(steamH);
    }
  }

  const storefrontPriceFields =
    storefronts.length > 0 ? (
      <div className="space-y-2">
        <p className="text-xs text-[var(--muted)]">
          Precio pagado (€) por tienda marcada
        </p>
        <div className="space-y-2">
          {storefronts.map((sf) => (
            <div key={sf} className="flex items-center gap-2">
              <span
                title={GAME_STOREFRONT_LABELS[sf]}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)]"
              >
                <GameStorefrontIcon storefront={sf} className="h-4 w-4" />
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
    ) : null;

  return (
    <>
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
              {game.cover_url ? (
                <button
                  type="button"
                  onClick={() => setCoverOpen(true)}
                  aria-label="Ver portada en grande"
                  title="Ver portada en grande"
                  className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <Image
                    src={game.cover_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized
                  />
                </button>
              ) : (
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{game.title}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {game.developers.join(", ") ||
                        game.platforms.slice(0, 2).join(", ") ||
                        "—"}
                    </p>
                    <GameScoreBadges
                      metacritic={game.metacritic}
                      steamReviewPercent={game.steam_review_percent}
                      size="sm"
                      labeled
                      className="mt-1.5"
                    />
                    {status === "wishlist" || fromWishlist ? (
                      status === "wishlist" ? (
                        <GameStorefrontChips
                          owned={
                            normalizeGamePrices(game.prices).steam != null ||
                            game.steam_app_id != null
                              ? (["steam"] as GameStorefront[])
                              : []
                          }
                          available={availableStorefronts}
                          prices={prices}
                        />
                      ) : null
                    ) : !editingStorefronts ? (
                      <GameStorefrontChips
                        owned={storefronts}
                        available={availableStorefronts}
                        prices={prices}
                        onClick={() => setEditingStorefronts(true)}
                      />
                    ) : (
                      <div className="mt-2 space-y-3 rounded-xl border border-[var(--border)] p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">
                            Tiendas y precios
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setEditingStorefronts(false)}
                          >
                            Listo
                          </Button>
                        </div>
                        <GameStorefrontPicker
                          value={storefronts}
                          onChange={applyStorefronts}
                          required
                        />
                        {storefrontPriceFields}
                      </div>
                    )}
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
              <div
                className={cn(
                  "grid gap-2",
                  statusOptions.length === 3 ? "grid-cols-3" : "grid-cols-2",
                )}
              >
                {statusOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => selectStatus(s)}
                    className={cn(
                      "rounded-lg border px-2 py-2.5 text-center transition-colors sm:px-3 sm:text-left",
                      status === s
                        ? s === "wishlist"
                          ? "border-amber-500 bg-amber-500/15"
                          : s === "dropped"
                            ? "border-zinc-500 bg-zinc-500/15"
                            : "border-[var(--accent)] bg-[var(--accent)]/10"
                        : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-xs font-medium sm:text-sm",
                        status === s
                          ? s === "wishlist"
                            ? "text-amber-700 dark:text-amber-300"
                            : s === "dropped"
                              ? "text-zinc-700 dark:text-zinc-300"
                              : "text-[var(--accent)]"
                          : "",
                      )}
                    >
                      {statusButtonLabel(s)}
                    </span>
                  </button>
                ))}
              </div>

              {joiningLibrary ? (
                <div className="space-y-3 animate-fade-in rounded-xl border border-[var(--border)] p-3">
                  <GameStorefrontPicker
                    value={storefronts}
                    onChange={applyStorefronts}
                    required
                  />
                  {storefrontPriceFields}
                  {storefronts.length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">
                      Marca desde qué tienda lo añades a la biblioteca
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {status !== "wishlist" &&
            storefronts.length === 0 &&
            !joiningLibrary ? (
              <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                Pulsa los iconos bajo el título para marcar al menos una tienda.
              </p>
            ) : null}

            {showProgress ? (
              progressAsInfo || showPreviousRun ? (
                <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                      {showPreviousRun ? "Partida anterior" : "Partida"}
                    </p>
                    {!showPreviousRun ? (
                      <button
                        type="button"
                        onClick={() => setEditingProgress(true)}
                        className="text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                      >
                        Editar
                      </button>
                    ) : null}
                  </div>
                  <dl className="grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[11px] text-[var(--muted)]">
                        Horas jugadas
                      </dt>
                      <dd className="font-medium tabular-nums">
                        {summaryHours > 0
                          ? `${summaryHours.toLocaleString("es-ES", {
                              maximumFractionDigits: 1,
                            })} h`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-[var(--muted)]">Inicio</dt>
                      <dd className="font-medium">
                        {formatDisplayDate(summaryStart)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-[var(--muted)]">
                        Finalizado
                      </dt>
                      <dd className="font-medium">
                        {formatDisplayDate(summaryFinish)}
                      </dd>
                    </div>
                  </dl>
                  {summaryPlay ? (
                    <p className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      <GameStorefrontIcon
                        storefront={summaryPlay}
                        className="h-3.5 w-3.5"
                      />
                      {GAME_STOREFRONT_LABELS[summaryPlay]}
                    </p>
                  ) : null}
                </div>
              ) : null
            ) : null}

            {showProgress && status === "playing" && playSnapshot ? (
              <p className="text-xs text-[var(--muted)]">
                Partida nueva: al completar de nuevo sumará ×1.
              </p>
            ) : null}

            {showProgress && !progressAsInfo && !addPlayOpen ? (
                <div className="space-y-3">
                  {savedFinished && viewingFinished ? (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingProgress(false)}
                        className="text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
                      >
                        Listo
                      </button>
                    </div>
                  ) : null}
                  <GamePlayStorefrontPicker
                    options={storefronts}
                    value={playStorefront}
                    onChange={(sf) => {
                      setPlayStorefront(sf);
                      if (sf === "steam") {
                        const steamH = Number(game.steam_hours_played) || 0;
                        if (steamH > hoursPlayed) setHoursPlayed(steamH);
                      }
                    }}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="hours-played">Horas jugadas</Label>
                    <Input
                      id="hours-played"
                      type="number"
                      min={0}
                      step={0.1}
                      value={hoursPlayed}
                      onChange={(e) => setHoursPlayed(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "grid gap-3",
                        showFinishDate ? "grid-cols-2" : "grid-cols-1",
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="game-start">Inicio</Label>
                          <button
                            type="button"
                            onClick={() => setStartDate(todayISO())}
                            className="text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                          >
                            Hoy
                          </button>
                        </div>
                        <Input
                          id="game-start"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
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
                    {showDropFinishButton ? (
                      <div className="space-y-2">
                        <Label>Marcar finalizado como</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            className="h-10 w-full px-2 text-sm"
                            disabled={busy}
                            onClick={beginCompletePlaying}
                          >
                            Completado
                          </Button>
                          <Button
                            type="button"
                            className="h-10 w-full border-zinc-500 bg-zinc-600 px-2 text-sm text-white hover:bg-zinc-700"
                            disabled={busy}
                            onClick={beginDropPlaying}
                          >
                            No lo voy a terminar
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
            ) : null}

            {status !== "wishlist" &&
            game.steam_app_id != null &&
            game.steam_app_id > 0 ? (
              <GameAchievements
                steamAppId={game.steam_app_id}
                cachedUnlocked={game.steam_achievements_unlocked}
                cachedTotal={game.steam_achievements_total}
              />
            ) : null}

            {status === "completed" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Veces pasados</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-10 w-10 shrink-0 px-0"
                      disabled={busy || addPlayOpen || timesCompleted <= 1}
                      onClick={() =>
                        setTimesCompleted((n) => Math.max(1, n - 1))
                      }
                      aria-label="Quitar una vez"
                    >
                      −
                    </Button>
                    <div className="flex h-10 min-w-0 flex-1 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-medium tabular-nums">
                      Completado ×{Math.max(1, timesCompleted)}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-10 shrink-0 px-3"
                      disabled={busy}
                      onClick={beginAddPlaythrough}
                      aria-label="Sumar una partida"
                    >
                      +1
                    </Button>
                  </div>
                </div>

                {addPlayOpen ? (
                  <div className="space-y-3 animate-fade-in rounded-xl border border-[var(--border)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Nueva partida</p>
                      <button
                        type="button"
                        onClick={cancelAddPlaythrough}
                        className="text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
                      >
                        Cancelar
                      </button>
                    </div>
                    <GamePlayStorefrontPicker
                      options={storefronts}
                      value={playStorefront}
                      onChange={(sf) => {
                        setPlayStorefront(sf);
                        if (sf === "steam") {
                          const steamH = Number(game.steam_hours_played) || 0;
                          if (steamH > hoursPlayed) setHoursPlayed(steamH);
                        }
                      }}
                    />
                    <div className="space-y-2">
                      <Label htmlFor="new-play-hours">Horas jugadas</Label>
                      <Input
                        id="new-play-hours"
                        type="number"
                        min={0}
                        step={0.1}
                        value={hoursPlayed}
                        onChange={(e) =>
                          setHoursPlayed(Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="new-play-start">Inicio</Label>
                          <button
                            type="button"
                            onClick={() => setStartDate(todayISO())}
                            className="text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                          >
                            Hoy
                          </button>
                        </div>
                        <Input
                          id="new-play-start"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-play-finish">Finalizado</Label>
                        <Input
                          id="new-play-finish"
                          type="date"
                          value={finishDate}
                          min={startDate || undefined}
                          onChange={(e) => setFinishDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      Al guardar, esta pasa a ser la partida de la ficha.
                    </p>
                  </div>
                ) : null}
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

            {error && (
              <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {status === "playing" && dropFinishReady
                ? "Marcar sin terminar"
                : "Guardar cambios"}
            </Button>
          </form>
        </DialogBody>
      </Dialog>

      {coverOpen && game.cover_url ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Portada de ${game.title}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 animate-fade-in"
          onClick={() => setCoverOpen(false)}
        >
          <button
            type="button"
            aria-label="Cerrar portada"
            className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            onClick={() => setCoverOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative h-[min(85vh,36rem)] w-[min(90vw,22rem)] overflow-hidden rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={game.cover_url}
              alt={game.title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 90vw, 352px"
              unoptimized
              priority
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
