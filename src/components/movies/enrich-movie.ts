import type { TmdbMovieResult } from "@/lib/types";

/** Enriquece con detalle TMDB (directores, géneros, runtime). Si falla, usa el resultado base. */
export async function enrichTmdbMovie(
  movie: TmdbMovieResult,
): Promise<TmdbMovieResult> {
  try {
    const res = await fetch(`/api/movies/details?id=${movie.tmdbId}`);
    const data = (await res.json()) as {
      movie?: TmdbMovieResult;
      error?: string;
    };
    if (!res.ok || !data.movie) return movie;
    return {
      ...movie,
      ...data.movie,
      coverUrl: data.movie.coverUrl ?? movie.coverUrl,
      title: data.movie.title || movie.title,
    };
  } catch {
    return movie;
  }
}
