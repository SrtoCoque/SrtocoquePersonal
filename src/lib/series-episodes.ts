import type { TmdbTvEpisode } from "@/lib/types";

export function todayViewedAt(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Carga todos los episodios de una serie TMDB (todas las temporadas con conteo). */
export async function fetchAllSeriesEpisodes(
  tmdbId: number,
  seasonCounts: Record<string, number>,
): Promise<Array<{ seasonNumber: number; episode: TmdbTvEpisode }>> {
  const seasons = Object.keys(seasonCounts)
    .map(Number)
    .filter((n) => Number.isFinite(n) && (seasonCounts[String(n)] ?? 0) > 0)
    .sort((a, b) => a - b);

  const out: Array<{ seasonNumber: number; episode: TmdbTvEpisode }> = [];

  await Promise.all(
    seasons.map(async (seasonNumber) => {
      try {
        const res = await fetch(
          `/api/series/season?id=${tmdbId}&season=${seasonNumber}`,
        );
        const data = (await res.json()) as {
          season?: { episodes?: TmdbTvEpisode[] };
        };
        for (const ep of data.season?.episodes ?? []) {
          out.push({ seasonNumber, episode: ep });
        }
      } catch {
        /* skip season */
      }
    }),
  );

  return out;
}
