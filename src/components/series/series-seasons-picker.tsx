"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Eye, EyeOff, Loader2, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { TmdbTvEpisode, TmdbTvSeason } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PendingEpisodeMark = {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  runtime: number | null;
};

/** Carga y marca todos los episodios de temporadas regulares (sin T0). */
export async function fetchRegularSeasonMarks(
  tmdbId: number,
  seasons: TmdbTvSeason[],
): Promise<PendingEpisodeMark[]> {
  const regular = seasons.filter(
    (s) => s.seasonNumber > 0 && s.episodeCount > 0,
  );
  const out: PendingEpisodeMark[] = [];
  await Promise.all(
    regular.map(async (season) => {
      try {
        const res = await fetch(
          `/api/series/season?id=${tmdbId}&season=${season.seasonNumber}`,
        );
        const data = (await res.json()) as {
          season?: { episodes?: TmdbTvEpisode[] };
        };
        for (const ep of data.season?.episodes ?? []) {
          out.push({
            seasonNumber: season.seasonNumber,
            episodeNumber: ep.episodeNumber,
            name: ep.name,
            runtime:
              ep.runtime != null && Number.isFinite(ep.runtime)
                ? Math.max(0, Math.round(ep.runtime))
                : null,
          });
        }
      } catch {
        /* skip */
      }
    }),
  );
  return out;
}

function epKey(seasonNumber: number, episodeNumber: number) {
  return `${seasonNumber}:${episodeNumber}`;
}

type SeasonCache = {
  loading: boolean;
  episodes: TmdbTvEpisode[];
};

type Props = {
  tmdbId: number | null;
  seasons: TmdbTvSeason[];
  loading?: boolean;
  fallbackCoverUrl?: string | null;
  /** wishlist / sin destino: solo ver. watching: marcar. watched: todo regular marcado. */
  mode: "readonly" | "pick" | "all-regular";
  marked: PendingEpisodeMark[];
  onMarkedChange: (next: PendingEpisodeMark[]) => void;
  className?: string;
};

export function SeriesSeasonsPicker({
  tmdbId,
  seasons,
  loading = false,
  fallbackCoverUrl,
  mode,
  marked,
  onMarkedChange,
  className,
}: Props) {
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [cache, setCache] = useState<Record<number, SeasonCache>>({});
  const [busy, setBusy] = useState(false);

  const list = useMemo(
    () => [...seasons].sort((a, b) => a.seasonNumber - b.seasonNumber),
    [seasons],
  );

  const markedMap = useMemo(() => {
    const map = new Map<string, PendingEpisodeMark>();
    for (const m of marked) {
      map.set(epKey(m.seasonNumber, m.episodeNumber), m);
    }
    return map;
  }, [marked]);

  const interactive = mode === "pick" || mode === "all-regular";

  const isSeen = useCallback(
    (seasonNumber: number, episodeNumber: number, totalInSeason: number) => {
      if (
        mode === "all-regular" &&
        seasonNumber > 0 &&
        episodeNumber >= 1 &&
        episodeNumber <= totalInSeason
      ) {
        return true;
      }
      return markedMap.has(epKey(seasonNumber, episodeNumber));
    },
    [mode, markedMap],
  );

  const watchedInSeason = useCallback(
    (seasonNumber: number, totalInSeason: number) => {
      if (mode === "all-regular" && seasonNumber > 0) {
        return totalInSeason;
      }
      let n = 0;
      for (const m of marked) {
        if (m.seasonNumber === seasonNumber) n += 1;
      }
      return n;
    },
    [mode, marked],
  );

  const ensureSeasonLoaded = useCallback(
    async (seasonNumber: number) => {
      if (!tmdbId) return [] as TmdbTvEpisode[];
      if (cache[seasonNumber]?.episodes?.length) {
        return cache[seasonNumber].episodes;
      }
      setCache((prev) => ({
        ...prev,
        [seasonNumber]: {
          loading: true,
          episodes: prev[seasonNumber]?.episodes ?? [],
        },
      }));
      try {
        const res = await fetch(
          `/api/series/season?id=${tmdbId}&season=${seasonNumber}`,
        );
        const data = (await res.json()) as {
          season?: { episodes?: TmdbTvEpisode[] };
          error?: string;
        };
        const episodes = data.season?.episodes ?? [];
        setCache((prev) => ({
          ...prev,
          [seasonNumber]: { loading: false, episodes },
        }));
        return episodes;
      } catch {
        setCache((prev) => ({
          ...prev,
          [seasonNumber]: {
            loading: false,
            episodes: prev[seasonNumber]?.episodes ?? [],
          },
        }));
        return [];
      }
    },
    [tmdbId, cache],
  );

  async function selectSeason(seasonNumber: number) {
    if (openSeason === seasonNumber) {
      setOpenSeason(null);
      return;
    }
    setOpenSeason(seasonNumber);
    await ensureSeasonLoaded(seasonNumber);
  }

  function toMark(seasonNumber: number, ep: TmdbTvEpisode): PendingEpisodeMark {
    return {
      seasonNumber,
      episodeNumber: ep.episodeNumber,
      name: ep.name,
      runtime:
        ep.runtime != null && Number.isFinite(ep.runtime)
          ? Math.max(0, Math.round(ep.runtime))
          : null,
    };
  }

  function setMarksForSeason(
    seasonNumber: number,
    episodes: TmdbTvEpisode[],
    on: boolean,
  ) {
    const without = marked.filter((m) => m.seasonNumber !== seasonNumber);
    if (!on) {
      onMarkedChange(without);
      return;
    }
    onMarkedChange([
      ...without,
      ...episodes.map((ep) => toMark(seasonNumber, ep)),
    ]);
  }

  async function toggleSeason(seasonNumber: number, totalInSeason: number) {
    if (!interactive || mode === "all-regular") return;
    setBusy(true);
    const episodes = await ensureSeasonLoaded(seasonNumber);
    const current = watchedInSeason(seasonNumber, totalInSeason);
    const done = totalInSeason > 0 && current >= totalInSeason;
    setMarksForSeason(seasonNumber, episodes, !done);
    setBusy(false);
  }

  async function markWholeSeason(seasonNumber: number) {
    if (!interactive || mode === "all-regular") return;
    setBusy(true);
    const episodes = await ensureSeasonLoaded(seasonNumber);
    setMarksForSeason(seasonNumber, episodes, true);
    setBusy(false);
  }

  async function unmarkWholeSeason(seasonNumber: number) {
    if (!interactive || mode === "all-regular") return;
    setMarksForSeason(seasonNumber, [], false);
  }

  async function toggleEpisode(seasonNumber: number, ep: TmdbTvEpisode) {
    if (!interactive) return;
    if (mode === "all-regular" && seasonNumber > 0) return;

    const key = epKey(seasonNumber, ep.episodeNumber);
    if (markedMap.has(key)) {
      onMarkedChange(marked.filter((m) => epKey(m.seasonNumber, m.episodeNumber) !== key));
    } else {
      onMarkedChange([...marked, toMark(seasonNumber, ep)]);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label>Temporadas</Label>
        {mode === "pick" ? (
          <span className="text-[11px] text-[var(--muted)]">
            El ojo marca la temporada · al completar todas (sin esp.) → Vista
          </span>
        ) : mode === "all-regular" ? (
          <span className="text-[11px] text-[var(--muted)]">
            Se marcarán todas menos especiales
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-5 text-center text-sm text-[var(--muted)]">
          Sin datos de temporadas
        </p>
      ) : (
        <>
          <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {list.map((season) => {
              const seasonNumber = season.seasonNumber;
              const totalInSeason = season.episodeCount;
              const watched = watchedInSeason(seasonNumber, totalInSeason);
              const selected = openSeason === seasonNumber;
              const seasonDone =
                totalInSeason > 0 && watched >= totalInSeason;
              const cover = season.coverUrl ?? fallbackCoverUrl;
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
                    title={season.name}
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
                        <span className="text-[10px] font-semibold">{label}</span>
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 bg-black/65 px-1 py-0.5 text-center text-[9px] font-semibold text-white">
                      {label} · {watched}/{totalInSeason || "?"}
                    </span>
                  </button>
                  {mode === "pick" || mode === "all-regular" ? (
                    <button
                      type="button"
                      disabled={
                        busy ||
                        totalInSeason <= 0 ||
                        (mode === "all-regular" && seasonNumber > 0)
                      }
                      title={
                        mode === "all-regular" && seasonNumber > 0
                          ? "Temporada marcada como vista"
                          : seasonDone
                            ? "Desmarcar temporada"
                            : "Marcar temporada"
                      }
                      aria-pressed={seasonDone}
                      onClick={() => {
                        if (mode === "all-regular" && seasonNumber > 0) return;
                        void toggleSeason(seasonNumber, totalInSeason);
                      }}
                      className={cn(
                        "absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm",
                        seasonDone ? "text-emerald-300" : "text-white/80",
                        busy && "opacity-50",
                      )}
                    >
                      {seasonDone ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {openSeason != null ? (
            <div className="animate-fade-in space-y-3 rounded-xl border border-[var(--border)] p-3">
              {(() => {
                const seasonNumber = openSeason;
                const meta = list.find((s) => s.seasonNumber === seasonNumber);
                const totalInSeason = meta?.episodeCount ?? 0;
                const watched = watchedInSeason(seasonNumber, totalInSeason);
                const seasonCache = cache[seasonNumber];
                const canEditEpisodes =
                  mode === "pick" ||
                  (mode === "all-regular" && seasonNumber === 0);

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
                          {watched}/{totalInSeason || "?"} episodios
                        </p>
                      </div>
                      {mode === "pick" ? (
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
                            onClick={() => void markWholeSeason(seasonNumber)}
                          >
                            Toda
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            disabled={busy || watched === 0}
                            onClick={() => void unmarkWholeSeason(seasonNumber)}
                          >
                            Ninguna
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    {seasonCache?.loading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
                      </div>
                    ) : (
                      <ul className="max-h-52 space-y-1 overflow-y-auto">
                        {(seasonCache?.episodes ?? []).map((ep) => {
                          const seen = isSeen(
                            seasonNumber,
                            ep.episodeNumber,
                            totalInSeason,
                          );
                          return (
                            <li key={ep.episodeNumber}>
                              <button
                                type="button"
                                disabled={!canEditEpisodes || busy}
                                onClick={() =>
                                  void toggleEpisode(seasonNumber, ep)
                                }
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                                  seen
                                    ? "bg-[var(--accent)]/10"
                                    : canEditEpisodes
                                      ? "hover:bg-[var(--surface-2)]"
                                      : "opacity-80",
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
                                  {seen ? <Check className="h-3 w-3" /> : null}
                                </span>
                                <span className="tabular-nums text-[var(--muted)]">
                                  {ep.episodeNumber}.
                                </span>
                                <span className="min-w-0 truncate">{ep.name}</span>
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
  );
}
