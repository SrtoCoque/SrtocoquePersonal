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
  series: TmdbTvResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved?: () => void;
};

export function SaveSeriesDialog({
  series,
  open,
  onOpenChange,
  userId,
  onSaved,
}: Props) {
  const [destination, setDestination] = useState<SeriesDestination | null>(
    null,
  );
  const [marked, setMarked] = useState<PendingEpisodeMark[]>([]);
  const [detail, setDetail] = useState<TmdbTvResult | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open || !series) return;
    setDestination(null);
    setMarked([]);
    setError(null);
    setDone(false);
    setDetail(series);
    setEnriching(true);
    let cancelled = false;
    void (async () => {
      const enriched = await enrichTmdbTv(series);
      if (!cancelled) {
        setDetail(enriched);
        setEnriching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, series]);

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
    setDestination("watched");
    const shown = detail ?? series;
    if (!shown?.tmdbId) {
      setMarked([]);
      return;
    }
    void (async () => {
      const all = await fetchRegularSeasonMarks(
        shown.tmdbId,
        shown.seasons ?? [],
      );
      setMarked(all);
    })();
  }

  function handleMarkedChange(next: PendingEpisodeMark[]) {
    setMarked(next);
    if (destination === "wishlist") return;
    const shown = detail ?? series;
    const derived = deriveDestinationFromMarks(shown?.seasons ?? [], next);
    setDestination(derived);
  }

  async function handleSave() {
    if (!series || !destination) return;

    setSaving(true);
    setError(null);

    const enriched = detail ?? (await enrichTmdbTv(series));
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
    setDone(true);
    onSaved?.();
    setTimeout(() => onOpenChange(false), 700);
  }

  if (!series) return null;

  const shown = detail ?? series;
  const canSave =
    destination === "wishlist" ||
    destination === "watching" ||
    destination === "watched";
  const saveLabel =
    destination === "wishlist"
      ? "Añadir a Wishlist"
      : destination === "watching"
        ? "Empezar a ver"
        : destination === "watched"
          ? "Marcar como vista"
          : "Elige una opción";

  const year = shown.firstAirDate?.slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Guardar serie</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <div className="flex gap-4">
            <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-3)] shadow-md">
              {shown.coverUrl ? (
                <Image
                  src={shown.coverUrl}
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
                {shown.title}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {[
                  year,
                  shown.numberOfSeasons
                    ? `${shown.numberOfSeasons} temp.`
                    : null,
                  shown.originalTitle !== shown.title
                    ? shown.originalTitle
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Sin fecha"}
              </p>
              {shown.voteAverage ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  TMDB {shown.voteAverage.toFixed(1)}
                  {shown.episodeRunTime
                    ? ` · ~${shown.episodeRunTime} min/ep`
                    : ""}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <MovieProviderLogos providers={shown.providers} limit={4} />
                <MovieTrailerButton
                  title={shown.title}
                  youtubeKey={shown.youtubeTrailerKey}
                  className="h-7"
                />
              </div>
            </div>
          </div>

          <SeriesSeasonsPicker
            tmdbId={shown.tmdbId}
            seasons={shown.seasons ?? []}
            loading={enriching}
            fallbackCoverUrl={shown.coverUrl}
            mode={destination === "wishlist" ? "readonly" : "pick"}
            marked={marked}
            onMarkedChange={handleMarkedChange}
          />

          <SeriesDestinationFields
            destination={destination}
            onDestinationChange={handleDestinationChange}
          />

          {error && (
            <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          {done && (
            <p className="rounded-lg bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--accent)]">
              Guardada correctamente
            </p>
          )}

          <Button
            type="submit"
            className={cn(
              "w-full",
              destination === "wishlist" &&
                "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500",
            )}
            disabled={!canSave || saving || done}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveLabel}
          </Button>
        </form>
      </DialogBody>
    </Dialog>
  );
}
