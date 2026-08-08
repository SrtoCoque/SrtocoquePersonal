"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  GameDestinationFields,
  gameDestinationToStatus,
  type GameDestination,
} from "@/components/games/game-destination-fields";
import { GameSearchPreview } from "@/components/games/game-search-preview";
import { createClient } from "@/lib/supabase/client";
import type { GameShelfStatus, RawgGameResult } from "@/lib/types";
import type { GameStorefront } from "@/components/games/game-storefront";
import { MetacriticBadge } from "@/components/games/metacritic-badge";
import {
  nextPricesSetAt,
  pricesDraftToDb,
  type GamePricesDraft,
} from "@/lib/game-prices";
import { insertHourLogIfIncreased, todayPlayedOn } from "@/lib/game-hour-logs";
import { cn } from "@/lib/utils";
import { submitFormOnEnter } from "@/lib/submit-form-on-enter";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onAdded: () => void;
};

export function AddGameModal({ open, onOpenChange, userId, onAdded }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RawgGameResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<RawgGameResult | null>(null);
  const [destination, setDestination] = useState<GameDestination | null>(null);
  const [shelfStatus, setShelfStatus] = useState<GameShelfStatus>("owned");
  const [storefronts, setStorefronts] = useState<GameStorefront[]>([]);
  const [playStorefront, setPlayStorefront] = useState<GameStorefront | null>(
    null,
  );
  const [prices, setPrices] = useState<GamePricesDraft>({});
  const [hoursPlayed, setHoursPlayed] = useState<number | "">("");
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [finishDate, setFinishDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setDestination(null);
    setShelfStatus("owned");
    setStorefronts([]);
    setPlayStorefront(null);
    setPrices({});
    setHoursPlayed("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setFinishDate(new Date().toISOString().slice(0, 10));
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open || selected) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/games/search?q=${encodeURIComponent(q)}&limit=6`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as {
          results?: RawgGameResult[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Error al buscar");
        setResults(data.results ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error de búsqueda");
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, selected]);

  function goToFullSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    onOpenChange(false);
    router.push(`/games/search?q=${encodeURIComponent(q)}`);
  }

  async function handleSave() {
    if (!selected || !destination) return;
    if (destination === "shelf" && storefronts.length === 0) {
      setError("Elige al menos una tienda (Steam, PlayStation…)");
      return;
    }

    const status = gameDestinationToStatus(destination, shelfStatus);
    const needsPlay = status === "playing" || status === "completed";
    const resolvedPlay =
      storefronts.length === 1
        ? storefronts[0]
        : playStorefront && storefronts.includes(playStorefront)
          ? playStorefront
          : null;
    if (needsPlay && storefronts.length > 1 && !resolvedPlay) {
      setError("Elige desde qué tienda estás jugando");
      return;
    }
    setSaving(true);
    setError(null);

    const hours =
      status === "playing" || status === "completed"
        ? Number(hoursPlayed) || 0
        : 0;

    const nextPrices =
      destination === "shelf" ? pricesDraftToDb(prices, storefronts) : {};

    const supabase = createClient();
    const { data: inserted, error: insertError } = await supabase
      .from("user_games")
      .insert({
        user_id: userId,
        rawg_id: selected.rawgId,
        title: selected.title,
        developers: selected.developers,
        cover_url: selected.coverUrl,
        platforms: selected.platforms,
        storefronts: destination === "shelf" ? storefronts : [],
        play_storefront: needsPlay ? resolvedPlay : null,
        released: selected.released,
        metacritic: selected.metacritic,
        status,
        hours_played: hours,
        prices: nextPrices,
        prices_set_at: nextPricesSetAt({ nextPrices }),
        playtime_estimate: selected.playtimeEstimate,
        start_date:
          status === "playing" || status === "completed" ? startDate : null,
        finish_date: status === "completed" ? finishDate : null,
        times_completed: status === "completed" ? 1 : 0,
      })
      .select("id")
      .single();

    setSaving(false);
    if (insertError) {
      setError(
        insertError.message.includes("play_storefront")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-play-storefront.sql"
          : insertError.message.includes("storefront")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-storefronts-multi.sql"
          : insertError.message.includes("prices_set_at")
            ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-prices-set-at.sql"
          : insertError.message.includes("prices")
            ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-prices-by-storefront.sql"
            : insertError.message.includes("start_date")
              ? "Falta actualizar Supabase. Ejecuta supabase/migrate-game-start-date.sql"
              : insertError.message,
      );
      return;
    }

    if (inserted?.id && hours > 0) {
      const { error: logError } = await insertHourLogIfIncreased(supabase, {
        userId,
        gameId: inserted.id as string,
        before: 0,
        after: hours,
        playedOn:
          (status === "completed" && finishDate) ||
          startDate ||
          todayPlayedOn(),
        source: "manual",
      });
      if (logError?.message.includes("user_game_hour_logs")) {
        setError(
          "Falta actualizar Supabase. Ejecuta supabase/migrate-game-hour-logs.sql",
        );
        return;
      }
    }

    onOpenChange(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Añadir juego</DialogTitle>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Busca en IGDB o pulsa Buscar / Enter para ver todos
        </p>
      </DialogHeader>

      <DialogBody className="space-y-4">
        {!selected ? (
          <>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                goToFullSearch();
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Título del juego..."
                  className="pl-9"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted)]" />
                )}
              </div>
              <Button type="submit" disabled={query.trim().length < 2}>
                Buscar
              </Button>
            </form>

            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {results.map((game) => (
                <li key={game.rawgId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(game);
                      setDestination(null);
                      setShelfStatus("owned");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]">
                      {game.coverUrl ? (
                        <Image
                          src={game.coverUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-[var(--muted)]">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{game.title}</p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {[
                          game.released?.slice(0, 4),
                          game.genres[0],
                          game.platforms.slice(0, 2).join(", "),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {game.metacritic != null ? (
                        <div className="mt-1">
                          <MetacriticBadge score={game.metacritic} size="sm" />
                        </div>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            {query.trim().length >= 2 && (
              <button
                type="button"
                onClick={goToFullSearch}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10"
              >
                Ver todos los resultados
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
            <div className="space-y-4 animate-fade-in">
              <GameSearchPreview
                game={selected}
                onChangeGame={() => setSelected(null)}
              />

              <form
                className="space-y-4"
                onKeyDown={submitFormOnEnter}
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSave();
                }}
              >
            <GameDestinationFields
              destination={destination}
              onDestinationChange={setDestination}
              shelfStatus={shelfStatus}
              onShelfStatusChange={setShelfStatus}
              storefronts={storefronts}
              onStorefrontsChange={setStorefronts}
              playStorefront={playStorefront}
              onPlayStorefrontChange={setPlayStorefront}
              prices={prices}
              onPricesChange={setPrices}
              hoursPlayed={hoursPlayed}
              onHoursPlayedChange={setHoursPlayed}
              startDate={startDate}
              onStartDateChange={setStartDate}
              finishDate={finishDate}
              onFinishDateChange={setFinishDate}
            />

            <Button
              type="submit"
              className={cn(
                "w-full",
                destination === "wishlist" &&
                  "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500",
              )}
              disabled={
                !destination ||
                saving ||
                (destination === "shelf" && storefronts.length === 0)
              }
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {!destination
                ? "Elige Wishlist o Biblioteca"
                : destination === "wishlist"
                  ? "Añadir a Wishlist"
                  : storefronts.length === 0
                    ? "Elige tienda(s)"
                    : "Añadir a la biblioteca"}
            </Button>
              </form>
            </div>
        )}

        {error && (
          <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <p className="text-center text-[11px] text-[var(--muted)]">
          Datos de videojuegos por{" "}
          <a
            href="https://www.igdb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--foreground)]"
          >
            IGDB
          </a>
        </p>
      </DialogBody>
    </Dialog>
  );
}
