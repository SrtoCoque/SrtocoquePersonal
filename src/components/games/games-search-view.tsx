"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, Check, Gamepad2, Loader2, Search, Star } from "lucide-react";
import { GamesHeader } from "@/components/layout/games-header";
import { EditGameDialog } from "@/components/games/edit-game-dialog";
import { SaveGameDialog } from "@/components/games/save-game-dialog";
import { MetacriticBadge } from "@/components/games/metacritic-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { RawgGameResult, UserGame } from "@/lib/types";
import { cn } from "@/lib/utils";

const IN_LIBRARY: Record<
  UserGame["status"],
  { label: string; bar: string; ring: string; Icon: typeof Check }
> = {
  wishlist: {
    label: "En tu wishlist",
    bar: "bg-amber-500 text-white",
    ring: "ring-2 ring-amber-500/70 border-amber-500/40",
    Icon: Bookmark,
  },
  owned: {
    label: "En tu biblioteca",
    bar: "bg-violet-600 text-white",
    ring: "ring-2 ring-violet-500/70 border-violet-500/40",
    Icon: Gamepad2,
  },
  playing: {
    label: "Lo estás jugando",
    bar: "bg-sky-500 text-white",
    ring: "ring-2 ring-sky-500/70 border-sky-500/40",
    Icon: Gamepad2,
  },
  replaying: {
    label: "Lo estás rejugando",
    bar: "bg-orange-500 text-white",
    ring: "ring-2 ring-orange-500/70 border-orange-500/40",
    Icon: Gamepad2,
  },
  completed: {
    label: "Ya lo has completado",
    bar: "bg-emerald-600 text-white",
    ring: "ring-2 ring-emerald-500/70 border-emerald-500/40",
    Icon: Check,
  },
  dropped: {
    label: "Sin terminar",
    bar: "bg-zinc-500 text-white",
    ring: "ring-2 ring-zinc-500/70 border-zinc-500/40",
    Icon: Gamepad2,
  },
};

export function GamesSearchView({
  userId,
  email,
  initialQuery,
}: {
  userId: string;
  email: string | null;
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<RawgGameResult[]>([]);
  const [library, setLibrary] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(
    () => initialQuery.trim().length >= 2,
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedNew, setSelectedNew] = useState<RawgGameResult | null>(null);
  const [editing, setEditing] = useState<UserGame | null>(null);

  const libraryByRawgId = useMemo(() => {
    const map = new Map<number, UserGame>();
    for (const g of library) {
      if (g.rawg_id != null) map.set(g.rawg_id, g);
    }
    return map;
  }, [library]);

  const loadLibrary = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_games")
      .select("*")
      .eq("user_id", userId);
    if (data) setLibrary(data as UserGame[]);
  }, [userId]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const q = initialQuery.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/games/search?q=${encodeURIComponent(q)}&limit=40`,
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
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [initialQuery]);

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    router.push(`/games/search?q=${encodeURIComponent(q)}`);
  }

  function handleClick(game: RawgGameResult) {
    const existing = libraryByRawgId.get(game.rawgId);
    if (existing) {
      setEditing(existing);
      return;
    }
    setSelectedNew(game);
  }

  return (
    <div className="min-h-screen">
      <GamesHeader email={email} onSteamSynced={loadLibrary} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/games"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a videojuegos
        </Link>

        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Buscar videojuegos
          </h1>
        </div>

        <form onSubmit={submitSearch} className="mb-8 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Título del juego..."
              className="pl-9"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={query.trim().length < 2 || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>

        {error && (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-2xl bg-[var(--surface-2)]"
              />
            ))}
          </div>
        ) : initialQuery.trim().length < 2 ? (
          <p className="py-16 text-center text-[var(--muted)]">
            Escribe al menos 2 caracteres para buscar
          </p>
        ) : results.length === 0 ? (
          <p className="py-16 text-center text-[var(--muted)]">
            Sin resultados para «{initialQuery}»
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-[var(--muted)]">
              {results.length} resultados para «{initialQuery}»
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4 animate-fade-in">
              {results.map((game) => {
                const existing = libraryByRawgId.get(game.rawgId);
                const inLib = existing ? IN_LIBRARY[existing.status] : null;
                const StatusIcon = inLib?.Icon;

                return (
                  <button
                    key={game.rawgId}
                    type="button"
                    onClick={() => handleClick(game)}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] text-left transition-all hover:-translate-y-0.5",
                      inLib
                        ? inLib.ring
                        : "border-[var(--border)] hover:border-[var(--accent)]/40",
                    )}
                  >
                    <div className="relative aspect-[3/4] w-full bg-[var(--surface-3)]">
                      {game.coverUrl ? (
                        <Image
                          src={game.coverUrl}
                          alt={game.title}
                          fill
                          className={cn(
                            "object-cover transition-transform duration-500 group-hover:scale-105",
                            inLib && "brightness-[0.85]",
                          )}
                          sizes="200px"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[var(--muted)]">
                          <Gamepad2 className="h-8 w-8 opacity-40" />
                        </div>
                      )}
                      {inLib && StatusIcon ? (
                        <div
                          className={cn(
                            "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 px-2 py-1.5 text-center text-[11px] font-semibold leading-tight shadow-md sm:text-xs",
                            inLib.bar,
                          )}
                        >
                          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="line-clamp-1">{inLib.label}</span>
                        </div>
                      ) : null}
                      {game.metacritic != null ? (
                        <MetacriticBadge
                          score={game.metacritic}
                          className="absolute right-2 top-2"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <h2 className="line-clamp-2 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug">
                        {game.title}
                      </h2>
                      <p className="line-clamp-1 text-xs text-[var(--muted)]">
                        {[
                          game.released?.slice(0, 4),
                          game.genres[0],
                          game.platforms.slice(0, 2).join(", "),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {(() => {
                        const hours = existing
                          ? Number(existing.hours_played) || 0
                          : 0;
                        const showHours =
                          existing &&
                          (existing.status === "playing" ||
                            existing.status === "replaying" ||
                            existing.status === "completed" ||
                            existing.status === "dropped") &&
                          hours > 0;
                        if (!game.rating && !showHours) return null;
                        return (
                          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[10px]">
                            {game.rating ? (
                              <span className="inline-flex items-center gap-0.5 text-amber-500">
                                <Star className="h-3 w-3 fill-current" />
                                {game.rating.toFixed(1)}
                              </span>
                            ) : null}
                            {showHours ? (
                              <span className="text-[var(--muted)]">
                                {hours} Horas
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
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

      <SaveGameDialog
        game={selectedNew}
        open={!!selectedNew}
        onOpenChange={(o) => {
          if (!o) setSelectedNew(null);
        }}
        userId={userId}
        onSaved={loadLibrary}
      />
      <EditGameDialog
        game={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={loadLibrary}
        onDeleted={loadLibrary}
      />
    </div>
  );
}
