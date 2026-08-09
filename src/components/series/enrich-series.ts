import type { TmdbTvResult } from "@/lib/types";

/** Enriquece con detalle TMDB TV. Si falla, usa el resultado base. */
export async function enrichTmdbTv(
  series: TmdbTvResult,
): Promise<TmdbTvResult> {
  try {
    const res = await fetch(`/api/series/details?id=${series.tmdbId}`);
    const data = (await res.json()) as {
      series?: TmdbTvResult;
      error?: string;
    };
    if (!res.ok || !data.series) return series;
    return {
      ...series,
      ...data.series,
      coverUrl: data.series.coverUrl ?? series.coverUrl,
      title: data.series.title || series.title,
    };
  } catch {
    return series;
  }
}
