"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Tv } from "lucide-react";
import { SeriesHeader } from "@/components/layout/series-header";
import { AddSeriesModal } from "@/components/series/add-series-modal";
import { EditSeriesDialog } from "@/components/series/edit-series-dialog";
import { SeriesCard } from "@/components/series/series-card";
import { SeriesSection } from "@/components/series/series-section";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { UserSeries } from "@/lib/types";
import {
  isSeriesOnShelf,
  parseMovieProviders,
  parseSeriesSeasonCounts,
  serializeMovieProviders,
  seriesDisplayStatus,
  totalRegularEpisodes,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "shelf" | "wishlist" | "watching" | "watched";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "wishlist", label: "Wishlist" },
  { id: "watching", label: "Viendo" },
  { id: "shelf", label: "Biblioteca" },
  { id: "watched", label: "Vistas" },
];

function parseFilter(raw: string | null): Filter {
  if (
    raw === "shelf" ||
    raw === "wishlist" ||
    raw === "watching" ||
    raw === "watched"
  ) {
    return raw;
  }
  return "all";
}

function mapSeriesWithProgress(
  rows: UserSeries[],
  episodeRows: Array<{ user_series_id: string; season_number: number }>,
): UserSeries[] {
  const counts = new Map<string, number>();
  for (const row of episodeRows) {
    if (row.season_number <= 0) continue;
    counts.set(row.user_series_id, (counts.get(row.user_series_id) ?? 0) + 1);
  }
  return rows.map((s) => {
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
  });
}

export function SeriesLibraryView({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [seriesList, setSeriesList] = useState<UserSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(() =>
    parseFilter(searchParams.get("filter")),
  );
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<UserSeries | null>(null);

  const loadSeries = useCallback(async () => {
    const supabase = createClient();
    const [{ data, error }, { data: episodes }] = await Promise.all([
      supabase
        .from("user_series")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_series_episodes")
        .select("user_series_id, season_number")
        .eq("user_id", userId),
    ]);

    if (!error && data) {
      const mapped = mapSeriesWithProgress(
        data as UserSeries[],
        (episodes ?? []) as Array<{
          user_series_id: string;
          season_number: number;
        }>,
      );
      setSeriesList(mapped);

      void (async () => {
        for (const row of data as UserSeries[]) {
          const parsed = parseMovieProviders(row.providers);
          if (parsed.length === 0 || !parsed.some((p) => p.logoUrl)) continue;
          const next = serializeMovieProviders(parsed);
          const prev = Array.isArray(row.providers)
            ? (row.providers as unknown as string[])
            : [];
          if (JSON.stringify(prev) === JSON.stringify(next)) continue;
          await supabase
            .from("user_series")
            .update({ providers: next })
            .eq("id", row.id)
            .eq("user_id", userId);
        }
      })();
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  useEffect(() => {
    setFilter(parseFilter(searchParams.get("filter")));
  }, [searchParams]);

  function setFilterAndUrl(next: Filter) {
    setFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const wishlist = useMemo(
    () => seriesList.filter((s) => s.status === "wishlist"),
    [seriesList],
  );
  const watching = useMemo(
    () => seriesList.filter((s) => s.status === "watching"),
    [seriesList],
  );
  const shelf = useMemo(
    () => seriesList.filter((s) => isSeriesOnShelf(s.status)),
    [seriesList],
  );
  const watched = useMemo(
    () => seriesList.filter((s) => s.status === "watched"),
    [seriesList],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return seriesList;
    if (filter === "shelf") return shelf;
    if (filter === "wishlist") return wishlist;
    if (filter === "watching") return watching;
    return watched;
  }, [seriesList, filter, shelf, wishlist, watching, watched]);

  return (
    <div className="min-h-screen">
      <SeriesHeader email={email} />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
                Series
              </h1>
              <p className="text-sm text-[var(--muted)]">
                {seriesList.length}{" "}
                {seriesList.length === 1
                  ? "serie guardada"
                  : "series guardadas"}
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Añadir
            </Button>
          </div>

          <div className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 sm:w-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterAndUrl(f.id)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  filter === f.id
                    ? "bg-[var(--accent)] text-[var(--accent-fg)] font-medium"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            <div className="h-48 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
          </div>
        ) : filter === "all" ? (
          seriesList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-16 text-center">
              <Tv className="mb-3 h-10 w-10 text-[var(--muted)] opacity-50" />
              <p className="font-[family-name:var(--font-display)] text-lg font-medium">
                Tu biblioteca de series está vacía
              </p>
              <Button className="mt-5" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Añadir serie
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              <SeriesSection
                title="Viendo"
                subtitle="En progreso"
                series={watching}
                onSeeMore={() => setFilterAndUrl("watching")}
                onEdit={setEditing}
                emptyLabel="No estás viendo ninguna serie."
                compactCards
              />
              <SeriesSection
                title="Wishlist"
                subtitle="Series que quieres ver"
                series={wishlist}
                onSeeMore={() => setFilterAndUrl("wishlist")}
                onEdit={setEditing}
                emptyLabel="Tu wishlist está vacía."
                compactCards
              />
              <SeriesSection
                title="Vistas"
                subtitle="Series terminadas"
                series={watched}
                onSeeMore={() => setFilterAndUrl("watched")}
                onEdit={setEditing}
                emptyLabel="Aún no has terminado ninguna."
                compactCards
              />
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <p className="font-[family-name:var(--font-display)] text-lg font-medium">
              No hay series en este filtro
            </p>
            <Button
              className="mt-5"
              variant="secondary"
              onClick={() => setFilterAndUrl("all")}
            >
              Volver a Todos
            </Button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
              {filtered.map((item) => (
                <SeriesCard key={item.id} series={item} onEdit={setEditing} />
              ))}
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-[var(--muted)]">
          This product uses the TMDB API but is not endorsed or certified by{" "}
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            TMDB
          </a>
        </p>
      </main>

      <AddSeriesModal
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
        onAdded={loadSeries}
      />
      <EditSeriesDialog
        series={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={loadSeries}
        onDeleted={loadSeries}
      />
    </div>
  );
}
