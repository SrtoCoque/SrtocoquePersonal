"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Gamepad2, Plus, X } from "lucide-react";
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
  storefrontsFromPlatformNames,
  type GameStorefront,
} from "@/components/games/game-storefront";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { normalizeGamePrices, sumGamePrices } from "@/lib/game-prices";
import type { GameStatus, UserGame } from "@/lib/types";
import { isGameOnShelf, normalizeGameStatus } from "@/lib/types";
import {
  compareByLastPlayed,
  latestHourPlayedOnByGame,
} from "@/lib/game-last-played";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "shelf" | GameStatus;
type PlatformFilter = "all" | GameStorefront;
type WishlistSort = "price" | "added";

/** Precio para ordenar wishlist; sin precio → Infinity (al final). */
function wishlistSortPrice(game: UserGame): number {
  const prices = normalizeGamePrices(game.prices);
  if (prices.steam != null && Number.isFinite(prices.steam)) {
    return prices.steam;
  }
  const total = sumGamePrices(prices);
  return total > 0 ? total : Number.POSITIVE_INFINITY;
}

function sortWishlistByPrice(list: UserGame[]): UserGame[] {
  return [...list].sort((a, b) => {
    const diff = wishlistSortPrice(a) - wishlistSortPrice(b);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title, "es");
  });
}

function sortWishlistByAdded(list: UserGame[]): UserGame[] {
  return [...list].sort((a, b) => {
    const aDay = a.steam_wishlist_added_at?.slice(0, 10) ?? "";
    const bDay = b.steam_wishlist_added_at?.slice(0, 10) ?? "";
    if (aDay && bDay && aDay !== bDay) return bDay.localeCompare(aDay);
    if (aDay && !bDay) return -1;
    if (!aDay && bDay) return 1;
    return a.title.localeCompare(b.title, "es");
  });
}

function sortWishlist(list: UserGame[], sort: WishlistSort): UserGame[] {
  return sort === "added"
    ? sortWishlistByAdded(list)
    : sortWishlistByPrice(list);
}

/** Tiendas efectivas: owned, precios o inferidas (wishlist Steam). */
function effectiveStorefronts(game: UserGame): GameStorefront[] {
  const set = new Set(normalizeStorefronts(game.storefronts));
  const prices = normalizeGamePrices(game.prices);
  for (const sf of GAME_STOREFRONTS) {
    if (prices[sf] != null) set.add(sf);
  }
  if (set.size === 0 && game.steam_app_id) set.add("steam");
  if (set.size === 0) {
    for (const sf of storefrontsFromPlatformNames(game.platforms)) {
      set.add(sf);
    }
  }
  return [...set];
}

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "shelf", label: "Biblioteca" },
  { id: "playing", label: "Jugando" },
  { id: "wishlist", label: "Wishlist" },
  { id: "completed", label: "Completados" },
  { id: "dropped", label: "Sin terminar" },
];

function parseStatusFilter(raw: string | null): StatusFilter {
  if (raw === "replaying") return "playing";
  if (
    raw === "shelf" ||
    raw === "playing" ||
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

function parseWishlistSort(raw: string | null): WishlistSort {
  return raw === "added" ? "added" : "price";
}

function ChipButton({
  active,
  onClick,
  children,
  className,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-[var(--surface-2)] font-medium text-[var(--foreground)]"
          : "text-[var(--muted)] hover:bg-[var(--surface-2)]/60 hover:text-[var(--foreground)]",
        className,
      )}
    >
      {children}
    </button>
  );
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
  const [latestHoursByGame, setLatestHoursByGame] = useState<
    Map<string, string>
  >(() => new Map());
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    parseStatusFilter(searchParams.get("filter")),
  );
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>(() =>
    parsePlatformFilter(searchParams.get("platform")),
  );
  const [wishlistSort, setWishlistSort] = useState<WishlistSort>(() =>
    parseWishlistSort(searchParams.get("wishlistSort")),
  );
  const [genreFilter, setGenreFilter] = useState<string | "all">(() =>
    searchParams.get("genre")?.trim() || "all",
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<UserGame | null>(null);

  const loadGames = useCallback(async () => {
    const supabase = createClient();
    const [{ data, error }, { data: hourLogData }] = await Promise.all([
      supabase
        .from("user_games")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_game_hour_logs")
        .select("user_game_id, played_on")
        .eq("user_id", userId),
    ]);

    if (!error && data) {
      setGames(
        (data as UserGame[]).map((g) => ({
          ...g,
          status: normalizeGameStatus(g.status),
        })),
      );
    }
    setLatestHoursByGame(
      latestHourPlayedOnByGame(
        (hourLogData ?? []) as Array<{
          user_game_id: string;
          played_on: string;
        }>,
      ),
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    setStatusFilter(parseStatusFilter(searchParams.get("filter")));
    setPlatformFilter(parsePlatformFilter(searchParams.get("platform")));
    setWishlistSort(parseWishlistSort(searchParams.get("wishlistSort")));
    setGenreFilter(searchParams.get("genre")?.trim() || "all");
  }, [searchParams]);

  function writeUrl(next: {
    status?: StatusFilter;
    platform?: PlatformFilter;
    wishlistSort?: WishlistSort;
    genre?: string | "all";
  }) {
    const nextStatus = next.status ?? statusFilter;
    let nextPlatform = next.platform ?? platformFilter;
    let nextWishlistSort = next.wishlistSort ?? wishlistSort;
    let nextGenre = next.genre ?? genreFilter;

    // Al salir de Biblioteca / Wishlist, limpia filtros que no aplican
    if (nextStatus !== "shelf") nextGenre = "all";
    if (nextStatus !== "shelf" && nextStatus !== "wishlist") {
      nextPlatform = "all";
    }
    if (nextStatus !== "wishlist") nextWishlistSort = "price";

    setStatusFilter(nextStatus);
    setPlatformFilter(nextPlatform);
    setWishlistSort(nextWishlistSort);
    setGenreFilter(nextGenre);

    const params = new URLSearchParams();
    if (nextStatus !== "all") params.set("filter", nextStatus);
    if (nextStatus === "wishlist") {
      if (nextWishlistSort !== "price") {
        params.set("wishlistSort", nextWishlistSort);
      }
      if (nextPlatform !== "all") params.set("platform", nextPlatform);
    } else if (nextStatus === "shelf") {
      if (nextPlatform !== "all") params.set("platform", nextPlatform);
      if (nextGenre !== "all") params.set("genre", nextGenre);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const playingGames = useMemo(() => {
    const list = games.filter((g) => g.status === "playing");
    return list.sort((a, b) => compareByLastPlayed(a, b, latestHoursByGame));
  }, [games, latestHoursByGame]);

  const wishlistGames = useMemo(
    () =>
      sortWishlist(
        games.filter((g) => g.status === "wishlist"),
        "price",
      ),
    [games],
  );

  const shelfGames = useMemo(
    () => games.filter((g) => isGameOnShelf(g.status)),
    [games],
  );

  const filterPool = useMemo(() => {
    if (statusFilter === "wishlist") {
      return games.filter((g) => g.status === "wishlist");
    }
    if (statusFilter === "shelf") {
      return games.filter((g) => isGameOnShelf(g.status));
    }
    return [];
  }, [games, statusFilter]);

  const platformCounts = useMemo(() => {
    const counts = Object.fromEntries(
      GAME_STOREFRONTS.map((sf) => [sf, 0]),
    ) as Record<GameStorefront, number>;
    for (const game of filterPool) {
      for (const sf of effectiveStorefronts(game)) {
        counts[sf] += 1;
      }
    }
    return counts;
  }, [filterPool]);

  const platformsWithGames = useMemo(
    () => GAME_STOREFRONTS.filter((sf) => platformCounts[sf] > 0),
    [platformCounts],
  );

  const availableGenres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of filterPool) {
      for (const raw of g.genres ?? []) {
        const name = raw.trim();
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
      .map(([name]) => name);
  }, [filterPool]);

  const filtered = useMemo(() => {
    let list: UserGame[];
    if (statusFilter === "all") {
      list = games;
    } else if (statusFilter === "shelf") {
      list = games.filter((g) => isGameOnShelf(g.status));
    } else if (statusFilter === "playing") {
      list = games.filter((g) => g.status === "playing");
    } else if (statusFilter === "wishlist") {
      list = sortWishlist(
        games.filter((g) => g.status === "wishlist"),
        wishlistSort,
      );
    } else {
      list = games.filter((g) => g.status === statusFilter);
    }

    if (
      (statusFilter === "shelf" || statusFilter === "wishlist") &&
      platformFilter !== "all"
    ) {
      list = list.filter((g) =>
        effectiveStorefronts(g).includes(platformFilter),
      );
    }

    if (statusFilter === "shelf" && genreFilter !== "all") {
      list = list.filter((g) =>
        (g.genres ?? []).some(
          (x) => x.trim().toLowerCase() === genreFilter.toLowerCase(),
        ),
      );
    }

    return list;
  }, [games, statusFilter, platformFilter, wishlistSort, genreFilter]);

  const showHome = statusFilter === "all" && !loading;
  const showFilterButton =
    statusFilter === "shelf" || statusFilter === "wishlist";

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (platformFilter !== "all") n += 1;
    if (statusFilter === "shelf" && genreFilter !== "all") n += 1;
    if (statusFilter === "wishlist" && wishlistSort !== "price") n += 1;
    return n;
  }, [platformFilter, genreFilter, wishlistSort, statusFilter]);

  function clearExtraFilters() {
    writeUrl({
      platform: "all",
      genre: "all",
      wishlistSort: "price",
    });
  }

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

            <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
              <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 sm:flex-initial">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => writeUrl({ status: f.id })}
                    className={cn(
                      "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
                      statusFilter === f.id
                        ? "bg-[var(--accent)] text-[var(--accent-fg)] font-medium"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {showFilterButton ? (
                <Button
                  type="button"
                  variant={activeFilterCount > 0 ? "default" : "outline"}
                  size="sm"
                  className="shrink-0"
                  onClick={() => setFilterOpen(true)}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filtro
                  {activeFilterCount > 0 ? (
                    <span className="tabular-nums">({activeFilterCount})</span>
                  ) : null}
                </Button>
              ) : null}
            </div>
          </div>

          {showFilterButton && activeFilterCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              {statusFilter === "wishlist" && wishlistSort !== "price" ? (
                <span className="rounded-md bg-[var(--surface-2)] px-2 py-1 text-[var(--foreground)]">
                  Orden: por añadido
                </span>
              ) : null}
              {platformFilter !== "all" ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-2)] px-2 py-1 text-[var(--foreground)]">
                  <GameStorefrontIcon
                    storefront={platformFilter}
                    className="h-3.5 w-3.5"
                  />
                  {GAME_STOREFRONT_LABELS[platformFilter]}
                </span>
              ) : null}
              {statusFilter === "shelf" && genreFilter !== "all" ? (
                <span className="rounded-md bg-[var(--surface-2)] px-2 py-1 text-[var(--foreground)]">
                  {genreFilter}
                </span>
              ) : null}
              <button
                type="button"
                onClick={clearExtraFilters}
                className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
              >
                <X className="h-3 w-3" />
                Limpiar
              </button>
            </div>
          ) : null}
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
                latestHoursByGame={latestHoursByGame}
              />
              <GameSection
                title="Wishlist"
                subtitle="Juegos que quieres conseguir"
                games={wishlistGames}
                onSeeMore={() => writeUrl({ status: "wishlist" })}
                onEdit={setEditing}
                emptyLabel="Tu wishlist está vacía."
                latestHoursByGame={latestHoursByGame}
              />
              <GameSection
                title="Biblioteca"
                subtitle="Todo lo que ya tienes (sin empezar, jugando o completado)"
                games={shelfGames}
                onSeeMore={() => writeUrl({ status: "shelf" })}
                onEdit={setEditing}
                emptyLabel="Aún no has añadido juegos a tu biblioteca."
                latestHoursByGame={latestHoursByGame}
              />
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <p className="font-[family-name:var(--font-display)] text-lg font-medium">
              No hay juegos en este filtro
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {activeFilterCount > 0 ? (
                <Button variant="secondary" onClick={clearExtraFilters}>
                  Limpiar filtros
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => writeUrl({ status: "all" })}
              >
                Volver a Todos
              </Button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
              {filtered.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onEdit={setEditing}
                  latestHourPlayedOn={latestHoursByGame.get(game.id)}
                />
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

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogHeader onClose={() => setFilterOpen(false)}>
          <DialogTitle>Filtro</DialogTitle>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {statusFilter === "wishlist"
              ? "Orden, plataforma…"
              : "Género, plataforma…"}
          </p>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {statusFilter === "wishlist" ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Ordenar
              </p>
              <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-1">
                {(
                  [
                    { id: "price" as const, label: "Por precio" },
                    { id: "added" as const, label: "Por añadido" },
                  ] as const
                ).map((s) => (
                  <ChipButton
                    key={s.id}
                    active={wishlistSort === s.id}
                    onClick={() => writeUrl({ wishlistSort: s.id })}
                  >
                    {s.label}
                  </ChipButton>
                ))}
              </div>
            </div>
          ) : null}

          {statusFilter === "shelf" && availableGenres.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Género
              </p>
              <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-1">
                <ChipButton
                  active={genreFilter === "all"}
                  onClick={() => writeUrl({ genre: "all" })}
                >
                  Todos
                </ChipButton>
                {availableGenres.map((g) => (
                  <ChipButton
                    key={g}
                    active={genreFilter === g}
                    onClick={() => writeUrl({ genre: g })}
                  >
                    {g}
                  </ChipButton>
                ))}
              </div>
            </div>
          ) : null}

          {platformsWithGames.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                Plataforma
              </p>
              <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 p-1">
                <ChipButton
                  active={platformFilter === "all"}
                  onClick={() => writeUrl({ platform: "all" })}
                >
                  Todas ({filterPool.length})
                </ChipButton>
                {platformsWithGames.map((sf) => (
                  <ChipButton
                    key={sf}
                    title={GAME_STOREFRONT_LABELS[sf]}
                    active={platformFilter === sf}
                    onClick={() => writeUrl({ platform: sf })}
                  >
                    <GameStorefrontIcon storefront={sf} className="h-4 w-4" />
                    <span>{GAME_STOREFRONT_LABELS[sf]}</span>
                    <span className="opacity-70">({platformCounts[sf]})</span>
                  </ChipButton>
                ))}
              </div>
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter className="flex gap-2">
          {activeFilterCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => {
                clearExtraFilters();
              }}
            >
              Limpiar
            </Button>
          ) : null}
          <Button
            type="button"
            className="flex-1"
            onClick={() => setFilterOpen(false)}
          >
            Listo
          </Button>
        </DialogFooter>
      </Dialog>

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
        latestHourPlayedOn={
          editing ? latestHoursByGame.get(editing.id) : null
        }
      />
    </div>
  );
}
