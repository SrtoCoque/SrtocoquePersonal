import { createClient } from "@/lib/supabase/client";
import { markAllEpisodesWatched } from "@/lib/mark-all-series-episodes";
import { todayViewedAt } from "@/lib/series-episodes";
import type { SeriesStatus, TmdbTvResult } from "@/lib/types";
import { serializeMovieProviders } from "@/lib/types";
import type { PendingEpisodeMark } from "@/components/series/series-seasons-picker";

/** Inserta la serie; Vista marca regulares; Viendo puede traer capítulos ya marcados. */
export async function insertUserSeries(opts: {
  userId: string;
  series: TmdbTvResult;
  status: SeriesStatus;
  markedEpisodes?: PendingEpisodeMark[];
}): Promise<{ error: string | null }> {
  const { userId, series: enriched, status, markedEpisodes = [] } = opts;
  const supabase = createClient();

  const { data: inserted, error: insertError } = await supabase
    .from("user_series")
    .insert({
      user_id: userId,
      tmdb_id: enriched.tmdbId,
      title: enriched.title,
      original_title: enriched.originalTitle,
      cover_url: enriched.coverUrl,
      genres: enriched.genres,
      providers: serializeMovieProviders(enriched.providers),
      first_air_date: enriched.firstAirDate,
      vote_average: enriched.voteAverage,
      episode_run_time: enriched.episodeRunTime,
      number_of_seasons: enriched.numberOfSeasons,
      season_counts: enriched.seasonCounts,
      status,
      score: null,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      error: insertError?.message.includes("user_series")
        ? "Falta actualizar Supabase. Ejecuta supabase/schema-series.sql"
        : (insertError?.message ?? "No se pudo guardar"),
    };
  }

  const seriesId = inserted.id as string;

  if (status === "watched" && enriched.tmdbId) {
    const { error: markError } = await markAllEpisodesWatched({
      userId,
      seriesId,
      tmdbId: enriched.tmdbId,
      seasonCounts: enriched.seasonCounts,
      includeSpecials: false,
    });
    if (markError) return { error: markError };

    // Especiales que el usuario haya marcado a mano
    const specials = markedEpisodes.filter((e) => e.seasonNumber === 0);
    if (specials.length > 0) {
      const err = await upsertMarked(userId, seriesId, specials, enriched);
      if (err) return { error: err };
    }
    return { error: null };
  }

  if (status === "watching" && markedEpisodes.length > 0) {
    const err = await upsertMarked(userId, seriesId, markedEpisodes, enriched);
    if (err) return { error: err };
  }

  return { error: null };
}

async function upsertMarked(
  userId: string,
  seriesId: string,
  episodes: PendingEpisodeMark[],
  series: TmdbTvResult,
): Promise<string | null> {
  if (episodes.length === 0) return null;
  const supabase = createClient();
  const viewedAt = todayViewedAt();
  const rows = episodes.map((ep) => ({
    user_series_id: seriesId,
    user_id: userId,
    season_number: ep.seasonNumber,
    episode_number: ep.episodeNumber,
    name: ep.name,
    viewed_at: viewedAt,
    runtime:
      ep.runtime != null
        ? ep.runtime
        : series.episodeRunTime != null
          ? Math.max(0, Math.round(Number(series.episodeRunTime)))
          : null,
  }));

  const { error } = await supabase.from("user_series_episodes").upsert(rows, {
    onConflict: "user_series_id,season_number,episode_number",
    ignoreDuplicates: true,
  });

  if (!error) return null;
  if (error.message.includes("runtime")) {
    return "Falta actualizar Supabase. Ejecuta supabase/migrate-series-episode-runtime.sql";
  }
  if (error.message.includes("viewed_at")) {
    return "Falta actualizar Supabase. Ejecuta supabase/migrate-series-episode-viewed-at.sql";
  }
  if (error.message.includes("user_series_episodes")) {
    return "Falta actualizar Supabase. Ejecuta supabase/schema-series.sql";
  }
  return error.message;
}
