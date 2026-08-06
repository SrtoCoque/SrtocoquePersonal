import type { TmdbMovieResult } from "@/lib/types";

const TMDB_LANG = "es-ES";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";

type TmdbMovie = {
  id: number;
  title?: string;
  original_title?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
  vote_average?: number | null;
  popularity?: number;
  overview?: string;
  genre_ids?: number[];
};

type TmdbSearchResponse = {
  results?: TmdbMovie[];
  status_message?: string;
  status_code?: number;
};

type TmdbCredits = {
  crew?: { job?: string; name?: string }[];
};

type TmdbDetails = TmdbMovie & {
  runtime?: number | null;
  genres?: { id: number; name: string }[];
  credits?: TmdbCredits;
  status_message?: string;
};

function posterUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${POSTER_BASE}${path}`;
}

async function fetchTmdb<T>(url: string, retries = 3): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as T & {
        status_message?: string;
        status_code?: number;
      };
      if (res.ok) return data;

      lastError = new Error(
        data.status_message || `TMDB HTTP ${res.status}`,
      );
      if (res.status === 401 || res.status === 403) throw lastError;
      if (attempt === retries - 1) throw lastError;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Error de red");
      if (attempt === retries - 1) throw lastError;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("No se pudo contactar con TMDB");
}

function mapSearchMovie(item: TmdbMovie): TmdbMovieResult & { _score: number } {
  return {
    tmdbId: item.id,
    title: item.title ?? item.original_title ?? "Sin título",
    originalTitle: item.original_title ?? null,
    directors: [],
    coverUrl: posterUrl(item.poster_path),
    genres: [],
    released: item.release_date || null,
    runtime: null,
    voteAverage: item.vote_average ?? null,
    overview: item.overview,
    popularity: item.popularity,
    _score: 0,
  };
}

function scoreMovie(
  movie: ReturnType<typeof mapSearchMovie>,
  query: string,
): number {
  const q = query.toLowerCase().trim();
  const title = movie.title.toLowerCase();
  const original = (movie.originalTitle ?? "").toLowerCase();
  let score = 0;

  if (title === q || original === q) score += 1000;
  else if (title.startsWith(q) || original.startsWith(q)) score += 600;
  else if (title.includes(q) || original.includes(q)) score += 300;

  score += Math.min(200, (movie.popularity ?? 0) * 2);
  if (movie.voteAverage) score += movie.voteAverage * 15;
  if (movie.coverUrl) score += 80;

  return score;
}

export async function searchTmdbMovies(
  query: string,
  maxResults = 8,
): Promise<TmdbMovieResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("Falta TMDB_API_KEY");

  const params = new URLSearchParams({
    api_key: apiKey,
    language: TMDB_LANG,
    query: trimmed,
    include_adult: "false",
    page: "1",
  });

  const data = await fetchTmdb<TmdbSearchResponse>(
    `https://api.themoviedb.org/3/search/movie?${params.toString()}`,
  );

  return (data.results ?? [])
    .map(mapSearchMovie)
    .map((movie) => ({ ...movie, _score: scoreMovie(movie, trimmed) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, maxResults)
    .map(({ _score: _, ...movie }) => movie);
}

export async function getTmdbMovieDetails(
  tmdbId: number,
): Promise<TmdbMovieResult> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("Falta TMDB_API_KEY");

  const params = new URLSearchParams({
    api_key: apiKey,
    language: TMDB_LANG,
    append_to_response: "credits",
  });

  const data = await fetchTmdb<TmdbDetails>(
    `https://api.themoviedb.org/3/movie/${tmdbId}?${params.toString()}`,
  );

  const directors = (data.credits?.crew ?? [])
    .filter((c) => c.job === "Director" && c.name)
    .map((c) => c.name as string);

  return {
    tmdbId: data.id,
    title: data.title ?? data.original_title ?? "Sin título",
    originalTitle: data.original_title ?? null,
    directors,
    coverUrl: posterUrl(data.poster_path),
    genres: (data.genres ?? []).map((g) => g.name).filter(Boolean),
    released: data.release_date || null,
    runtime: data.runtime ?? null,
    voteAverage: data.vote_average ?? null,
    overview: data.overview,
  };
}
