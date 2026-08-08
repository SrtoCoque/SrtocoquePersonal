"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Gamepad2, Plus } from "lucide-react";
import { GamesHeader } from "@/components/layout/games-header";
import { AddGameModal } from "@/components/games/add-game-modal";
import { CurrentlyPlaying } from "@/components/games/currently-playing";
import { EditGameDialog } from "@/components/games/edit-game-dialog";
import { GameCard } from "@/components/games/game-card";
import { GameSection } from "@/components/games/game-section";
import {
  GAME_STOREFRONT_LABELS,
  GAME_STOREFRONTS,
  GameStorefrontIcon,
  isGameStorefront,
  normalizeStorefronts,
  type GameStorefront,
} from "@/components/games/game-storefront";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { GameStatus, UserGame } from "@/lib/types";
import { isGameOnShelf } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterMode = "status" | "platform";
type StatusFilter = "all" | "shelf" | GameStatus;
type PlatformFilter = "all" | GameStorefront;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "shelf", label: "Biblioteca" },
  { id: "playing", label: "Jugando" },
  { id: "wishlist", label: "Wishlist" },
  { id: "completed", label: "Completados" },
  { id: "dropped", label: "Sin terminar" },
];

function parseMode(raw: string | null): FilterMode {
  return raw === "platform" ? "platform" : "status";
}

function parseStatusFilter(raw: string | null): StatusFilter {
  if (
    raw === "shelf" ||
    raw === "playing" ||
    raw === "replaying" ||
    raw === "wishlist" ||
    raw === "completed" ||
    raw === "dropped" ||
    raw === "owned"
  ) {
    return raw;
  }
  return "all";
}

function parsePlatformFilter(raw: string | null): PlatformFilter {
  if (raw && isGameStorefront(raw)) return raw;
  return "all";
}

export function GamesLibraryView({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<FilterMode>(() =>
    parseMode(searchParams.get("by")),
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    parseStatusFilter(searchParams.get("filter")),
  );
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>(() =>
    parsePlatformFilter(searchParams.get("platform")),
  );
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<UserGame | null>(null);

  const loadGames = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_games")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setGames(data as UserGame[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    setMode(parseMode(searchParams.get("by")));
    setStatusFilter(parseStatusFilter(searchParams.get("filter")));
    setPlatformFilter(parsePlatformFilter(searchParams.get("platform")));
  }, [searchParams]);

  function writeUrl(next: {
    mode?: FilterMode;
    status?: StatusFilter;
    platform?: PlatformFilter;
  }) {
    const nextMode = next.mode ?? mode;
    const nextStatus = next.status ?? statusFilter;
    const nextPlatform = next.platform ?? platformFilter;
    setMode(nextMode);
    setStatusFilter(nextStatus);
    setPlatformFilter(nextPlatform);

    const params = new URLSearchParams();
    if (nextMode === "platform") {
      params.set("by", "platform");
      if (nextPlatform !== "all") params.set("platform", nextPlatform);
    } else {
      if (nextStatus !== "all") params.set("filter", nextStatus);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const platformCounts = useMemo(() => {
    const counts = Object.fromEntries(
      GAME_STOREFRONTS.map((sf) => [sf, 0]),
    ) as Record<GameStorefront, number>;
    for (const game of games) {
      for (const sf of normalizeStorefronts(game.storefronts)) {
        counts[sf] += 1;
      }
    }
    return counts;
  }, [games]);

  const platformsWithGames = useMemo(
    () => GAME_STOREFRONTS.filter((sf) => platformCounts[sf] > 0),
    [platformCounts],
  );

  const playingGames = useMemo(() => {
    const list = games.filter(
      (g) => g.status === "playing" || g.status === "replaying",
    );
    return list.sort((a, b) => {
      const aTime = new Date(a.updated_at ?? a.created_at).getTime();
      const bTime = new Date(b.updated_at ?? b.created_at).getTime();
      return bTime - aTime;
    });
  }, [games]);
  const wishlistGames = useMemo(
    () => games.filter((g) => g.status === "wishlist"),
    [games],
  );
  const shelfGames = useMemo(
    () => games.filter((g) => isGameOnShelf(g.status)),
    [games],
  );

  const filtered = useMemo(() => {
    if (mode === "platform") {
      if (platformFilter === "all") return games;
      return games.filter((g) =>
        normalizeStorefronts(g.storefronts).includes(platformFilter),
      );
    }
    if (statusFilter === "all") return games;
    if (statusFilter === "shelf") {
      return games.filter((g) => isGameOnShelf(g.status));
    }
    if (statusFilter === "playing") {
      return games.filter(
        (g) => g.status === "playing" || g.status === "replaying",
      );
    }
    return games.filter((g) => g.status === statusFilter);
  }, [games, mode, statusFilter, platformFilter]);

  const showHome =
    mode === "status" && statusFilter === "all" && !loading;

  return (
    <div className="min-h-screen">
      <GamesHeader
        email={email}
        onAddGame={() => setAddOpen(true)}
        onSteamSynced={loadGames}
      />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
                Videojuegos
              </h1>
              <p className="text-sm text-[var(--muted)]">
                {games.length}{" "}
                {games.length === 1 ? "juego guardado" : "juegos guardados"}
              </p>
            </div>

            <div className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 sm:w-auto">
              {(
                [
                  { id: "status" as const, label: "Estado" },
                  { id: "platform" as const, label: "Plataforma" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    writeUrl({
                      mode: m.id,
                      status: "all",
                      platform: "all",
                    })
                  }
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    mode === m.id
                      ? "bg-[var(--accent)] text-[var(--accent-fg)] font-medium"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "status" ? (
            <div className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => writeUrl({ status: f.id })}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    statusFilter === f.id
                      ? "bg-[var(--surface-2)] font-medium text-[var(--foreground)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-1">
              <button
                type="button"
                onClick={() => writeUrl({ platform: "all" })}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  platformFilter === "all"
                    ? "bg-[var(--surface-2)] font-medium text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                Todas ({games.length})
              </button>
              {platformsWithGames.map((sf) => (
                <button
                  key={sf}
                  type="button"
                  title={GAME_STOREFRONT_LABELS[sf]}
                  onClick={() => writeUrl({ platform: sf })}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    platformFilter === sf
                      ? "bg-[var(--surface-2)] font-medium text-[var(--foreground)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  <GameStorefrontIcon storefront={sf} className="h-4 w-4" />
                  <span>{GAME_STOREFRONT_LABELS[sf]}</span>
                  <span
                    className={cn(
                      platformFilter === sf
                        ? "text-[var(--foreground)]/70"
                        : "text-[var(--muted)]",
                    )}
                  >
                    ({platformCounts[sf]})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-8">
            <div className="h-48 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
          </div>
        ) : showHome ? (
          games.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-16 text-center">
              <Gamepad2 className="mb-3 h-10 w-10 text-[var(--muted)] opacity-50" />
              <p className="font-[family-name:var(--font-display)] text-lg font-medium">
                Tu biblioteca de juegos está vacía
              </p>
              <Button className="mt-5" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Añadir juego
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              <CurrentlyPlaying
                games={playingGames}
                onEdit={setEditing}
                onAdd={() => setAddOpen(true)}
              />
              <GameSection
                title="Wishlist"
                subtitle="Juegos que quieres conseguir"
                games={wishlistGames}
                onSeeMore={() => writeUrl({ status: "wishlist" })}
                onEdit={setEditing}
                emptyLabel="Tu wishlist está vacía."
              />
              <GameSection
                title="Biblioteca"
                subtitle="Todo lo que ya tienes (sin empezar, jugando o completado)"
                games={shelfGames}
                onSeeMore={() => writeUrl({ status: "shelf" })}
                onEdit={setEditing}
                emptyLabel="Aún no has añadido juegos a tu biblioteca."
              />
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <p className="font-[family-name:var(--font-display)] text-lg font-medium">
              No hay juegos en este filtro
            </p>
            <Button
              className="mt-5"
              variant="secondary"
              onClick={() =>
                writeUrl({
                  mode: "status",
                  status: "all",
                  platform: "all",
                })
              }
            >
              Volver a Todos
            </Button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
              {filtered.map((game) => (
                <GameCard key={game.id} game={game} onEdit={setEditing} />
              ))}
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-[var(--muted)]">
          Datos de videojuegos por{" "}
          <a
            href="https://www.igdb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            IGDB
          </a>
        </p>
      </main>

      <AddGameModal
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
        onAdded={loadGames}
      />
      <EditGameDialog
        game={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={loadGames}
        onDeleted={loadGames}
      />
    </div>
  );
}
