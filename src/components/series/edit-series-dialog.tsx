"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Tv,
} from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MovieTrailerButton } from "@/components/movies/movie-trailer-button";
import { MovieProviderLogos } from "@/components/movies/movie-provider-logos";
import { createClient } from "@/lib/supabase/client";
import { todayViewedAt } from "@/lib/series-episodes";
import type {
  SeriesStatus,
  TmdbTvEpisode,
  TmdbTvSeason,
  UserSeries,
  UserSeriesEpisode,
} from "@/lib/types";
import {
  SERIES_STATUS_LABELS,
  countRegularWatchedEpisodes,
  deriveSeriesShelfStatus,
  parseSeriesSeasonCounts,
  seriesDisplayStatus,
  totalRegularEpisodes,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  series: UserSeries | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
};

type SeasonState = {
  loading: boolean;
  episodes: TmdbTvEpisode[];
};

export function EditSeriesDialog({
  series,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: Props) {
  const [status, setStatus] = useState<SeriesStatus>("wishlist");
  const [score, setScore] = useState<number | "">("");
  const [seasonCounts, setSeasonCounts] = useState<Record<string, number>>({});
  const [seasonsMeta, setSeasonsMeta] = useState<TmdbTvSeason[]>([]);
  const [watchedEps, setWatchedEps] = useState<UserSeriesEpisode[]>([]);
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [seasonCache, setSeasonCache] = useState<Record<number, SeasonState>>(
    {},
  );
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyEp, setBusyEp] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);

  const watchedSet = useMemo(() => {
    const set = new Set<string>();
    for (const e of watchedEps) {
      set.add(`${e.season_number}:${e.episode_number}`);
    }
    return set;
  }, [watchedEps]);

  const totalEps = totalRegularEpisodes(seasonCounts);
  const watchedCount = countRegularWatchedEpisodes(watchedEps);
  const displayStatus = seriesDisplayStatus(status, watchedCount, totalEps);

  const seasonNumbers = useMemo(() => {
    if (seasonsMeta.length > 0) {
      return seasonsMeta.map((s) => s.seasonNumber);
    }
    return Object.keys(seasonCounts)
      .map(Number)
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
  }, [seasonCounts, seasonsMeta]);

  const seasonsByNumber = useMemo(() => {
    const map = new Map<number, TmdbTvSeason>();
    for (const s of seasonsMeta) map.set(s.seasonNumber, s);
    return map;
  }, [seasonsMeta]);

  const loadEpisodes = useCallback(async (seriesId: string, userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_series_episodes")
      .select("*")
      .eq("user_series_id", seriesId)
      .eq("user_id", userId);
    const list = (data as UserSeriesEpisode[]) ?? [];
    setWatchedEps(list);
    return list;
  }, []);

  async function syncShelfStatus(
    nextWatched: UserSeriesEpisode[],
    nextCounts: Record<string, number>,
    stored: SeriesStatus,
  ) {
    if (!series || stored === "wishlist") return stored;
    const nextShelf = deriveSeriesShelfStatus(
      countRegularWatchedEpisodes(nextWatched),
      totalRegularEpisodes(nextCounts),
    );
    if (nextShelf !== stored) {
      setStatus(nextShelf);
      const supabase = createClient();
      await supabase
        .from("user_series")
        .update({ status: nextShelf })
        .eq("id", series.id);
    }
    return nextShelf;
  }

  useEffect(() => {
    if (!series || !open) return;
    setStatus(series.status);
    setScore(series.score ?? "");
    setSeasonCounts(parseSeriesSeasonCounts(series.season_counts));
    setSeasonsMeta([]);
    setOpenSeason(null);
    setSeasonCache({});
    setTrailerKey(null);
    setError(null);
    setEditingScore(false);
    setEditingStatus(false);

    void (async () => {
      const eps = await loadEpisodes(series.id, series.user_id);
      if (!series.tmdb_id) {
        await syncShelfStatus(
          eps,
          parseSeriesSeasonCounts(series.season_counts),
          series.status,
        );
        return;
      }
      try {
        const res = await fetch(`/api/series/details?id=${series.tmdb_id}`);
        const data = (await res.json()) as {
          series?: {
            seasonCounts?: Record<string, number>;
            seasons?: TmdbTvSeason[];
            youtubeTrailerKey?: string | null;
            numberOfSeasons?: number | null;
            episodeRunTime?: number | null;
          };
        };
        if (!res.ok || !data.series) return;
        if (data.series.youtubeTrailerKey) {
          setTrailerKey(data.series.youtubeTrailerKey);
        }
        if (data.series.seasons?.length) {
          setSeasonsMeta(data.series.seasons);
        }
        const nextCounts =
          data.series.seasonCounts &&
          Object.keys(data.series.seasonCounts).length > 0
            ? data.series.seasonCounts
            : parseSeriesSeasonCounts(series.season_counts);
        setSeasonCounts(nextCounts);

        const supabase = createClient();
        const patch: Record<string, unknown> = {
          season_counts: nextCounts,
          number_of_seasons:
            data.series.numberOfSeasons ?? series.number_of_seasons,
          episode_run_time:
            data.series.episodeRunTime ?? series.episode_run_time,
        };
        if (series.status !== "wishlist") {
          const nextShelf = deriveSeriesShelfStatus(
            countRegularWatchedEpisodes(eps),
            totalRegularEpisodes(nextCounts),
          );
          patch.status = nextShelf;
          setStatus(nextShelf);
        }
        await supabase.from("user_series").update(patch).eq("id", series.id);
      } catch {
        /* ignore */
      }
    })();
    // syncShelfStatus uses series from closure; intentional on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, open, loadEpisodes]);

  async function ensureSeasonLoaded(seasonNumber: number) {
    if (!series?.tmdb_id) return;
    if (seasonCache[seasonNumber]?.episodes?.length) return;

    setSeasonCache((prev) => ({
      ...prev,
      [seasonNumber]: {
        loading: true,
        episodes: prev[seasonNumber]?.episodes ?? [],
      },
    }));

    try {
      const res = await fetch(
        `/api/series/season?id=${series.tmdb_id}&season=${seasonNumber}`,
      );
      const data = (await res.json()) as {
        season?: TmdbTvSeason;
        error?: string;
      };
      if (!res.ok || !data.season) {
        throw new Error(data.error ?? "No se pudo cargar la temporada");
      }
      setSeasonCache((prev) => ({
        ...prev,
        [seasonNumber]: {
          loading: false,
          episodes: data.season!.episodes ?? [],
        },
      }));
      if (data.season!.coverUrl) {
        setSeasonsMeta((prev) => {
          const exists = prev.some((s) => s.seasonNumber === seasonNumber);
          if (!exists) {
            return [
              ...prev,
              {
                seasonNumber,
                name: data.season!.name,
                episodeCount: data.season!.episodeCount,
                coverUrl: data.season!.coverUrl,
              },
            ].sort((a, b) => a.seasonNumber - b.seasonNumber);
          }
          return prev.map((s) =>
            s.seasonNumber === seasonNumber && !s.coverUrl
              ? { ...s, coverUrl: data.season!.coverUrl }
              : s,
          );
        });
      }
      if (
        data.season.episodeCount > 0 &&
        seasonCounts[String(seasonNumber)] !== data.season.episodeCount
      ) {
        const nextCounts = {
          ...seasonCounts,
          [String(seasonNumber)]: data.season.episodeCount,
        };
        setSeasonCounts(nextCounts);
        const supabase = createClient();
        await supabase
          .from("user_series")
          .update({ season_counts: nextCounts })
          .eq("id", series.id);
      }
    } catch (err) {
      setSeasonCache((prev) => ({
        ...prev,
        [seasonNumber]: {
          loading: false,
          episodes: prev[seasonNumber]?.episodes ?? [],
        },
      }));
      setError(err instanceof Error ? err.message : "Error al cargar temporada");
    }
  }

  async function selectSeason(seasonNumber: number) {
    if (openSeason === seasonNumber) {
      setOpenSeason(null);
      return;
    }
    setOpenSeason(seasonNumber);
    await ensureSeasonLoaded(seasonNumber);
  }

  async function applyStatus(next: "wishlist" | "watching") {
    if (!series) return;
    setEditingStatus(false);

    const resolved =
      next === "wishlist"
        ? "wishlist"
        : deriveSeriesShelfStatus(watchedCount, totalEps);

    setStatus(resolved);
    const supabase = createClient();
    await supabase
      .from("user_series")
      .update({ status: resolved })
      .eq("id", series.id);
    onSaved();
  }

  async function markEpisodes(
    seasonNumber: number,
    episodes: TmdbTvEpisode[],
  ) {
    if (!series || episodes.length === 0) return;
    const toAdd = episodes.filter(
      (ep) => !watchedSet.has(`${seasonNumber}:${ep.episodeNumber}`),
    );
    if (toAdd.length === 0) {
      // Ya estaban todos; si pedimos marcar toda y ya está hecha, no-op
      return;
    }
    setBusyEp(true);
    setError(null);
    const supabase = createClient();
    const rows = toAdd.map((ep) => ({
      user_series_id: series.id,
      user_id: series.user_id,
      season_number: seasonNumber,
      episode_number: ep.episodeNumber,
      name: ep.name,
      viewed_at: todayViewedAt(),
      runtime:
        ep.runtime != null && Number.isFinite(ep.runtime)
          ? Math.max(0, Math.round(ep.runtime))
          : series.episode_run_time != null
            ? Math.max(0, Math.round(Number(series.episode_run_time)))
            : null,
    }));
    const { error: upsertError } = await supabase
      .from("user_series_episodes")
      .upsert(rows, {
        onConflict: "user_series_id,season_number,episode_number",
        ignoreDuplicates: true,
      });
    if (upsertError) {
      setBusyEp(false);
      setError(
        upsertError.message.includes("runtime")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-series-episode-runtime.sql"
          : upsertError.message.includes("viewed_at")
            ? "Falta actualizar Supabase. Ejecuta supabase/migrate-series-episode-viewed-at.sql"
            : upsertError.message.includes("user_series_episodes")
              ? "Falta actualizar Supabase. Ejecuta supabase/schema-series.sql"
              : upsertError.message,
      );
      return;
    }
    const eps = await loadEpisodes(series.id, series.user_id);
    await syncShelfStatus(
      eps,
      seasonCounts,
      status === "wishlist" ? "watching" : status,
    );
    setBusyEp(false);
    onSaved();
  }

  async function unmarkEpisodes(
    seasonNumber: number,
    episodeNumbers: number[],
  ) {
    if (!series || episodeNumbers.length === 0) return;
    setBusyEp(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("user_series_episodes")
      .delete()
      .eq("user_series_id", series.id)
      .eq("season_number", seasonNumber)
      .in("episode_number", episodeNumbers);
    if (deleteError) {
      setBusyEp(false);
      setError(deleteError.message);
      return;
    }
    const eps = await loadEpisodes(series.id, series.user_id);
    await syncShelfStatus(eps, seasonCounts, status);
    setBusyEp(false);
    onSaved();
  }

  async function toggleEpisode(
    seasonNumber: number,
    episode: TmdbTvEpisode,
  ) {
    const key = `${seasonNumber}:${episode.episodeNumber}`;
    if (watchedSet.has(key)) {
      await unmarkEpisodes(seasonNumber, [episode.episodeNumber]);
    } else {
      await markEpisodes(seasonNumber, [episode]);
    }
  }

  async function markWholeSeason(seasonNumber: number) {
    await ensureSeasonLoaded(seasonNumber);
    const eps = seasonCache[seasonNumber]?.episodes;
    // may still be loading — fetch fresh
    if (!series?.tmdb_id) return;
    const res = await fetch(
      `/api/series/season?id=${series.tmdb_id}&season=${seasonNumber}`,
    );
    const data = (await res.json()) as { season?: TmdbTvSeason };
    const list = data.season?.episodes ?? eps ?? [];
    await markEpisodes(seasonNumber, list);
  }

  async function unmarkWholeSeason(seasonNumber: number) {
    const nums = watchedEps
      .filter((e) => e.season_number === seasonNumber)
      .map((e) => e.episode_number);
    await unmarkEpisodes(seasonNumber, nums);
  }

  async function toggleSeasonWatched(seasonNumber: number) {
    const totalInSeason = seasonCounts[String(seasonNumber)] ?? 0;
    const watchedInSeason = watchedEps.filter(
      (e) => e.season_number === seasonNumber,
    ).length;
    const seasonDone =
      totalInSeason > 0 && watchedInSeason >= totalInSeason;
    if (seasonDone) {
      await unmarkWholeSeason(seasonNumber);
    } else {
      await markWholeSeason(seasonNumber);
    }
  }

  async function handleSave() {
    if (!series) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("user_series")
      .update({
        status,
        score: score === "" ? null : score,
        season_counts: seasonCounts,
      })
      .eq("id", series.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  async function handleDelete() {
    if (!series) return;
    if (!confirm(`¿Eliminar «${series.title}»?`)) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("user_series")
      .delete()
      .eq("id", series.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onOpenChange(false);
    onDeleted();
  }

  if (!series) return null;

  const busy = saving || deleting || busyEp;
  const year = series.first_air_date?.slice(0, 4);
  const progressPct =
    totalEps > 0 ? Math.min(100, Math.round((watchedCount / totalEps) * 100)) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Editar serie</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void handleSave();
          }}
        >
          <div className="flex gap-3">
            <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]">
              {series.cover_url ? (
                <Image
                  src={series.cover_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{series.title}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {[
                      year,
                      series.number_of_seasons
                        ? `${series.number_of_seasons} temp.`
                        : null,
                      series.genres.slice(0, 2).join(", ") || null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <MovieProviderLogos
                      providers={series.providers}
                      limit={4}
                    />
                    <MovieTrailerButton
                      title={series.title}
                      youtubeKey={trailerKey}
                      className="h-7"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar serie"
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

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {!editingStatus ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEditingStatus(true)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                      displayStatus === "wishlist"
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : displayStatus === "watching"
                          ? "border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          : "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    <span>{SERIES_STATUS_LABELS[displayStatus]}</span>
                    {displayStatus !== "wishlist" && totalEps > 0 ? (
                      <span className="tabular-nums opacity-80">
                        {watchedCount}/{totalEps}
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void applyStatus("wishlist")}
                      className={cn(
                        "h-8 rounded-lg border px-2 text-xs font-medium",
                        displayStatus === "wishlist"
                          ? "border-amber-500 bg-amber-500/15"
                          : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                      )}
                    >
                      Wishlist
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void applyStatus("watching")}
                      className={cn(
                        "h-8 rounded-lg border px-2 text-xs font-medium",
                        displayStatus !== "wishlist"
                          ? displayStatus === "watching"
                            ? "border-sky-500 bg-sky-500/15"
                            : "border-emerald-500 bg-emerald-500/15"
                          : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                      )}
                    >
                      Serie
                      {totalEps > 0
                        ? ` · ${SERIES_STATUS_LABELS[deriveSeriesShelfStatus(watchedCount, totalEps)]}`
                        : ""}
                    </button>
                  </div>
                )}

                {!editingScore ? (
                  <button
                    type="button"
                    onClick={() => setEditingScore(true)}
                    className="inline-flex h-8 items-center rounded-lg border border-[var(--border)] px-2.5 text-xs font-medium tabular-nums hover:bg-[var(--surface-2)]"
                  >
                    {score === "" && series.score == null
                      ? "Puntuación"
                      : `${score === "" ? series.score : score}/100`}
                  </button>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    autoFocus
                    onBlur={() => setEditingScore(false)}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        setScore("");
                        return;
                      }
                      const n = Number(v);
                      if (!Number.isFinite(n)) return;
                      setScore(Math.min(100, Math.max(0, n)));
                    }}
                    className="h-8 w-20"
                    placeholder="0–100"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">Progreso</span>
              <span className="tabular-nums text-[var(--muted)]">
                {watchedCount}
                {totalEps > 0 ? ` / ${totalEps}` : ""} eps · {progressPct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Temporadas</Label>
            </div>

            {seasonNumbers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--muted)]">
                {series.tmdb_id
                  ? "Cargando temporadas…"
                  : "Sin datos de temporadas (falta tmdb_id)"}
              </p>
            ) : (
              <>
                <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
                  {seasonNumbers.map((seasonNumber) => {
                    const meta = seasonsByNumber.get(seasonNumber);
                    const totalInSeason =
                      seasonCounts[String(seasonNumber)] ??
                      meta?.episodeCount ??
                      0;
                    const watchedInSeason = watchedEps.filter(
                      (e) => e.season_number === seasonNumber,
                    ).length;
                    const selected = openSeason === seasonNumber;
                    const seasonDone =
                      totalInSeason > 0 && watchedInSeason >= totalInSeason;
                    const cover = meta?.coverUrl ?? series.cover_url;
                    const label =
                      seasonNumber === 0 ? "Esp." : `T${seasonNumber}`;

                    return (
                      <div
                        key={seasonNumber}
                        className="relative w-[4.5rem] shrink-0 sm:w-[5.25rem]"
                      >
                        <button
                          type="button"
                          onClick={() => void selectSeason(seasonNumber)}
                          aria-pressed={selected}
                          title={
                            meta?.name ||
                            (seasonNumber === 0
                              ? "Especiales"
                              : `Temporada ${seasonNumber}`)
                          }
                          className={cn(
                            "relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-[var(--surface-3)] transition",
                            selected
                              ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)]"
                              : "hover:ring-2 hover:ring-[var(--border)]",
                          )}
                        >
                          {cover ? (
                            <Image
                              src={cover}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="84px"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full flex-col items-center justify-center gap-1 text-[var(--muted)]">
                              <Tv className="h-5 w-5 opacity-40" />
                              <span className="text-[10px] font-semibold">
                                {label}
                              </span>
                            </span>
                          )}
                          <span className="absolute inset-x-0 bottom-0 bg-black/65 px-1 py-0.5 text-center text-[9px] font-semibold text-white">
                            {label} · {watchedInSeason}/{totalInSeason || "?"}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={busy || totalInSeason <= 0}
                          title={
                            seasonDone
                              ? "Desmarcar temporada"
                              : "Marcar temporada como vista"
                          }
                          aria-label={
                            seasonDone
                              ? "Desmarcar temporada"
                              : "Marcar temporada como vista"
                          }
                          aria-pressed={seasonDone}
                          onClick={() => void toggleSeasonWatched(seasonNumber)}
                          className={cn(
                            "absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors",
                            seasonDone
                              ? "text-emerald-300"
                              : "text-white/80 hover:text-white",
                            busy && "opacity-50",
                          )}
                        >
                          {seasonDone ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {openSeason != null ? (
                  <div className="animate-fade-in space-y-3 rounded-xl border border-[var(--border)] p-3">
                    {(() => {
                      const seasonNumber = openSeason;
                      const meta = seasonsByNumber.get(seasonNumber);
                      const totalInSeason =
                        seasonCounts[String(seasonNumber)] ??
                        meta?.episodeCount ??
                        0;
                      const watchedInSeason = watchedEps.filter(
                        (e) => e.season_number === seasonNumber,
                      ).length;
                      const cache = seasonCache[seasonNumber];

                      return (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                {meta?.name ||
                                  (seasonNumber === 0
                                    ? "Especiales"
                                    : `Temporada ${seasonNumber}`)}
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                {watchedInSeason}/{totalInSeason || "?"}{" "}
                                episodios
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-[var(--muted)]">
                                Marcar:
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-8"
                                disabled={busy}
                                onClick={() =>
                                  void markWholeSeason(seasonNumber)
                                }
                              >
                                Toda
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8"
                                disabled={busy || watchedInSeason === 0}
                                onClick={() =>
                                  void unmarkWholeSeason(seasonNumber)
                                }
                              >
                                Ninguna
                              </Button>
                            </div>
                          </div>

                          {cache?.loading ? (
                            <div className="flex justify-center py-6">
                              <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
                            </div>
                          ) : (
                            <ul className="max-h-52 space-y-1 overflow-y-auto">
                              {(cache?.episodes ?? []).map((ep) => {
                                const seen = watchedSet.has(
                                  `${seasonNumber}:${ep.episodeNumber}`,
                                );
                                return (
                                  <li key={ep.episodeNumber}>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() =>
                                        void toggleEpisode(seasonNumber, ep)
                                      }
                                      className={cn(
                                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                                        seen
                                          ? "bg-[var(--accent)]/10"
                                          : "hover:bg-[var(--surface-2)]",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                          seen
                                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                                            : "border-[var(--border)]",
                                        )}
                                      >
                                        {seen ? (
                                          <Check className="h-3 w-3" />
                                        ) : null}
                                      </span>
                                      <span className="tabular-nums text-[var(--muted)]">
                                        {ep.episodeNumber}.
                                      </span>
                                      <span className="min-w-0 truncate">
                                        {ep.name}
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : null}
              </>
            )}
          </div>

          {error ? (
            <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </form>
      </DialogBody>
    </Dialog>
  );
}
