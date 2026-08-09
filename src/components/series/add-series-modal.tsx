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
  SeriesDestinationFields,
  deriveDestinationFromMarks,
  seriesDestinationToStatus,
  type SeriesDestination,
} from "@/components/series/series-destination-fields";
import {
  SeriesSeasonsPicker,
  fetchRegularSeasonMarks,
  type PendingEpisodeMark,
} from "@/components/series/series-seasons-picker";
import { enrichTmdbTv } from "@/components/series/enrich-series";
import { insertUserSeries } from "@/components/series/insert-user-series";
import { MovieTrailerButton } from "@/components/movies/movie-trailer-button";
import { MovieProviderLogos } from "@/components/movies/movie-provider-logos";
import type { TmdbTvResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onAdded: () => void;
};

export function AddSeriesModal({ open, onOpenChange, userId, onAdded }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbTvResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TmdbTvResult | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [destination, setDestination] = useState<SeriesDestination | null>(
    null,
  );
  const [marked, setMarked] = useState<PendingEpisodeMark[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setEnriching(false);
    setDestination(null);
    setMarked([]);
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
          `/api/series/search?q=${encodeURIComponent(q)}&limit=6`,
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
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, selected]);

  async function selectSeries(item: TmdbTvResult) {
    setSelected(item);
    setDestination(null);
    setMarked([]);
    setError(null);
    setEnriching(true);
    const enriched = await enrichTmdbTv(item);
    setSelected(enriched);
    setEnriching(false);
  }

  function handleDestinationChange(next: SeriesDestination) {
    if (next === "wishlist") {
      setDestination("wishlist");
      setMarked([]);
      return;
    }
    if (next === "watching") {
      setDestination("watching");
      return;
    }
    // Vista: marcar todas las regulares
    setDestination("watched");
    if (!selected?.tmdbId) {
      setMarked([]);
      return;
    }
    void (async () => {
      const all = await fetchRegularSeasonMarks(
        selected.tmdbId,
        selected.seasons ?? [],
      );
      setMarked(all);
    })();
  }

  function handleMarkedChange(next: PendingEpisodeMark[]) {
    setMarked(next);
    if (destination === "wishlist") return;
    const derived = deriveDestinationFromMarks(
      selected?.seasons ?? [],
      next,
    );
    setDestination(derived);
  }

  function goToFullSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    onOpenChange(false);
    router.push(`/series/search?q=${encodeURIComponent(q)}`);
  }

  async function handleSave() {
    if (!selected || !destination) return;

    setSaving(true);
    setError(null);

    const enriched = await enrichTmdbTv(selected);
    const status = seriesDestinationToStatus(destination);
    const { error: insertError } = await insertUserSeries({
      userId,
      series: enriched,
      status,
      markedEpisodes: marked,
    });

    if (insertError) {
      setSaving(false);
      setError(insertError);
      return;
    }

    setSaving(false);
    onOpenChange(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Añadir serie</DialogTitle>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Busca por título · pulsa Buscar / Enter para ver más
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
                  placeholder="Título de la serie..."
                  className="pl-9"
                  autoFocus
                  autoComplete="off"
                  enterKeyHint="search"
                  data-skip-keyboard-scroll="true"
                />
              </div>
              <Button
                type="submit"
                disabled={query.trim().length < 2}
                variant="secondary"
              >
                Buscar
              </Button>
            </form>

            {searching ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
              </div>
            ) : results.length > 0 ? (
              <ul className="space-y-2">
                {results.map((item) => (
                  <li key={item.tmdbId}>
                    <button
                      type="button"
                      onClick={() => void selectSeries(item)}
                      className="flex w-full gap-3 rounded-xl border border-[var(--border)] p-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]">
                        {item.coverUrl ? (
                          <Image
                            src={item.coverUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="44px"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-medium">{item.title}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {[
                            item.firstAirDate?.slice(0, 4),
                            item.numberOfSeasons
                              ? `${item.numberOfSeasons} temp.`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.trim().length >= 2 ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">
                Sin resultados
              </p>
            ) : null}

            {error ? (
              <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                {error}
              </p>
            ) : null}
          </>
        ) : (
          <form
            className="space-y-4 animate-fade-in"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            >
              ← Cambiar serie
            </button>
            <div className="flex gap-4">
              <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-3)]">
                {selected.coverUrl ? (
                  <Image
                    src={selected.coverUrl}
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
                  {selected.title}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {[
                    selected.firstAirDate?.slice(0, 4),
                    selected.numberOfSeasons
                      ? `${selected.numberOfSeasons} temp.`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <MovieProviderLogos
                    providers={selected.providers}
                    limit={4}
                  />
                  <MovieTrailerButton
                    title={selected.title}
                    youtubeKey={selected.youtubeTrailerKey}
                    className="h-7"
                  />
                </div>
              </div>
            </div>

            <SeriesSeasonsPicker
              tmdbId={selected.tmdbId}
              seasons={selected.seasons ?? []}
              loading={enriching}
              fallbackCoverUrl={selected.coverUrl}
              mode={destination === "wishlist" ? "readonly" : "pick"}
              marked={marked}
              onMarkedChange={handleMarkedChange}
            />

            <SeriesDestinationFields
              destination={destination}
              onDestinationChange={handleDestinationChange}
            />

            {error ? (
              <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className={cn(
                "w-full",
                destination === "wishlist" &&
                  "bg-amber-500 text-white hover:bg-amber-600",
              )}
              disabled={!destination || saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {destination === "wishlist"
                ? "Añadir a Wishlist"
                : destination === "watching"
                  ? "Empezar a ver"
                  : destination === "watched"
                    ? "Marcar como vista"
                    : "Elige una opción"}
            </Button>
          </form>
        )}
      </DialogBody>
    </Dialog>
  );
}
