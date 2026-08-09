"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Loader2,
  Play,
  Search,
  Tv,
} from "lucide-react";
import { SeriesHeader } from "@/components/layout/series-header";
import { EditSeriesDialog } from "@/components/series/edit-series-dialog";
import { MovieProviderLogos } from "@/components/movies/movie-provider-logos";
import { SaveSeriesDialog } from "@/components/series/save-series-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { TmdbTvResult, UserSeries } from "@/lib/types";
import {
  parseMovieProviders,
  parseSeriesSeasonCounts,
  seriesDisplayStatus,
  totalRegularEpisodes,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const IN_LIBRARY: Record<
  UserSeries["status"],
  { label: string; bar: string; ring: string; Icon: typeof Check }
> = {
  wishlist: {
    label: "En tu wishlist",
    bar: "bg-amber-500 text-white",
    ring: "ring-2 ring-amber-500/70 border-amber-500/40",
    Icon: Bookmark,
  },
  watching: {
    label: "Viendo",
    bar: "bg-sky-500 text-white",
    ring: "ring-2 ring-sky-500/70 border-sky-500/40",
    Icon: Play,
  },
  watched: {
    label: "Vista",
    bar: "bg-emerald-600 text-white",
    ring: "ring-2 ring-emerald-500/70 border-emerald-500/40",
    Icon: Check,
  },
};

export function SeriesSearchView({
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
  const [results, setResults] = useState<TmdbTvResult[]>([]);
  const [library, setLibrary] = useState<UserSeries[]>([]);
  const [loading, setLoading] = useState(
    () => initialQuery.trim().length >= 2,
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedNew, setSelectedNew] = useState<TmdbTvResult | null>(null);
  const [editing, setEditing] = useState<UserSeries | null>(null);

  const libraryByTmdbId = useMemo(() => {
    const map = new Map<number, UserSeries>();
    for (const s of library) {
      if (s.tmdb_id != null) map.set(s.tmdb_id, s);
    }
    return map;
  }, [library]);

  const loadLibrary = useCallback(async () => {
    const supabase = createClient();
    const [{ data }, { data: episodes }] = await Promise.all([
      supabase.from("user_series").select("*").eq("user_id", userId),
      supabase
        .from("user_series_episodes")
        .select("user_series_id, season_number")
        .eq("user_id", userId),
    ]);
    if (data) {
      const counts = new Map<string, number>();
      for (const row of episodes ?? []) {
        const ep = row as { user_series_id: string; season_number: number };
        if (ep.season_number <= 0) continue;
        counts.set(ep.user_series_id, (counts.get(ep.user_series_id) ?? 0) + 1);
      }
      setLibrary(
        (data as UserSeries[]).map((s) => {
          const seasonCounts = parseSeriesSeasonCounts(s.season_counts);
          const watched = counts.get(s.id) ?? 0;
          const total = totalRegularEpisodes(seasonCounts);
          return {
            ...s,
            providers: parseMovieProviders(s.providers),
            season_counts: seasonCounts,
            episodes_watched: watched,
            episodes_total: total,
            status: seriesDisplayStatus(s.status, watched, total),
          };
        }),
      );
    }
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
          `/api/series/search?q=${encodeURIComponent(q)}&limit=40`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as {
          results?: TmdbTvResult[];
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
    router.push(`/series/search?q=${encodeURIComponent(q)}`);
  }

  function handleClick(item: TmdbTvResult) {
    const existing = libraryByTmdbId.get(item.tmdbId);
    if (existing) {
      setEditing(existing);
      return;
    }
    setSelectedNew(item);
  }

  return (
    <div className="min-h-screen">
      <SeriesHeader email={email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/series"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a series
        </Link>

        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Buscar series
          </h1>
        </div>

        <form onSubmit={submitSearch} className="mb-8 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Título de la serie..."
              className="pl-9"
              autoFocus
              autoComplete="off"
              enterKeyHint="search"
              data-skip-keyboard-scroll="true"
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-2xl bg-[var(--surface-2)]"
              />
            ))}
          </div>
        ) : results.length === 0 && initialQuery.trim().length >= 2 ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            Sin resultados para «{initialQuery}»
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
            {results.map((item) => {
              const existing = libraryByTmdbId.get(item.tmdbId);
              const meta = existing ? IN_LIBRARY[existing.status] : null;
              const StatusIcon = meta?.Icon ?? Tv;
              return (
                <button
                  key={item.tmdbId}
                  type="button"
                  onClick={() => handleClick(item)}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] text-left transition-all hover:-translate-y-0.5",
                    meta
                      ? meta.ring
                      : "border-[var(--border)] hover:border-[var(--accent)]/40",
                  )}
                >
                  <div className="relative aspect-[2/3] bg-[var(--surface-3)]">
                    {item.coverUrl ? (
                      <Image
                        src={item.coverUrl}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="200px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[var(--muted)]">
                        <Tv className="h-8 w-8 opacity-40" />
                      </div>
                    )}
                    {meta ? (
                      <div
                        className={cn(
                          "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold",
                          meta.bar,
                        )}
                      >
                        <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-1">{meta.label}</span>
                        {existing &&
                        existing.status !== "wishlist" &&
                        (existing.episodes_total ?? 0) > 0 ? (
                          <span className="shrink-0 tabular-nums opacity-95">
                            {existing.episodes_watched ?? 0}/
                            {existing.episodes_total}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">
                      {item.title}
                    </p>
                    <p className="line-clamp-1 text-xs text-[var(--muted)]">
                      {[
                        item.firstAirDate?.slice(0, 4),
                        item.numberOfSeasons
                          ? `${item.numberOfSeasons} temp.`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                    {item.providers.length > 0 ? (
                      <MovieProviderLogos providers={item.providers} limit={3} />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <SaveSeriesDialog
        series={selectedNew}
        open={!!selectedNew}
        onOpenChange={(o) => {
          if (!o) setSelectedNew(null);
        }}
        userId={userId}
        onSaved={loadLibrary}
      />
      <EditSeriesDialog
        series={editing}
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
