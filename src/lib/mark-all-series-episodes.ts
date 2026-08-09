import { createClient } from "@/lib/supabase/client";
import {
  fetchAllSeriesEpisodes,
  todayViewedAt,
} from "@/lib/series-episodes";
import type { SeriesSeasonCounts } from "@/lib/types";

/** Marca episodios pendientes con viewed_at=hoy. Por defecto excluye especiales (T0). */
export async function markAllEpisodesWatched(opts: {
  userId: string;
  seriesId: string;
  tmdbId: number;
  seasonCounts: SeriesSeasonCounts;
  /** Si false (default), no marca temporada 0 / especiales. */
  includeSpecials?: boolean;
}): Promise<{ error: string | null; marked: number }> {
  const {
    userId,
    seriesId,
    tmdbId,
    seasonCounts,
    includeSpecials = false,
  } = opts;

  let counts = seasonCounts;
  if (Object.keys(counts).length === 0) {
    try {
      const res = await fetch(`/api/series/details?id=${tmdbId}`);
      const data = (await res.json()) as {
        series?: { seasonCounts?: SeriesSeasonCounts };
      };
      if (data.series?.seasonCounts) {
        counts = data.series.seasonCounts;
        const supabase = createClient();
        await supabase
          .from("user_series")
          .update({ season_counts: counts })
          .eq("id", seriesId);
      }
    } catch {
      /* keep empty */
    }
  }

  if (!includeSpecials) {
    counts = Object.fromEntries(
      Object.entries(counts).filter(([k]) => k !== "0"),
    );
  }

  const all = await fetchAllSeriesEpisodes(tmdbId, counts);
  if (all.length === 0) {
    return { error: null, marked: 0 };
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("user_series_episodes")
    .select("season_number, episode_number")
    .eq("user_series_id", seriesId);

  const seen = new Set(
    (existing ?? []).map(
      (e: { season_number: number; episode_number: number }) =>
        `${e.season_number}:${e.episode_number}`,
    ),
  );

  const viewedAt = todayViewedAt();
  const rows = all
    .filter(
      ({ seasonNumber, episode }) =>
        !seen.has(`${seasonNumber}:${episode.episodeNumber}`),
    )
    .map(({ seasonNumber, episode }) => ({
      user_series_id: seriesId,
      user_id: userId,
      season_number: seasonNumber,
      episode_number: episode.episodeNumber,
      name: episode.name,
      viewed_at: viewedAt,
      runtime:
        episode.runtime != null && Number.isFinite(episode.runtime)
          ? Math.max(0, Math.round(episode.runtime))
          : null,
    }));

  if (rows.length === 0) {
    return { error: null, marked: 0 };
  }

  const { error: epError } = await supabase
    .from("user_series_episodes")
    .upsert(rows, {
      onConflict: "user_series_id,season_number,episode_number",
      ignoreDuplicates: true,
    });

  if (epError) {
    return {
      error: epError.message.includes("runtime")
        ? "Falta actualizar Supabase. Ejecuta supabase/migrate-series-episode-runtime.sql"
        : epError.message.includes("viewed_at")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-series-episode-viewed-at.sql"
          : epError.message.includes("user_series_episodes")
            ? "Falta actualizar Supabase. Ejecuta supabase/schema-series.sql"
            : epError.message,
      marked: 0,
    };
  }

  return { error: null, marked: rows.length };
}
