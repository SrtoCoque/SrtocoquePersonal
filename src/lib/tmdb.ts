import type { TmdbMovieResult } from "@/lib/types";

const TMDB_LANG = "es-ES";
const TMDB_WATCH_REGION = "ES";
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

type TmdbPerson = {
  id: number;
  name?: string;
  popularity?: number;
  known_for_department?: string | null;
};

type TmdbPersonSearchResponse = {
  results?: TmdbPerson[];
};

type TmdbCreditMovie = TmdbMovie & {
  job?: string;
};

type TmdbPersonMovieCredits = {
  crew?: TmdbCreditMovie[];
};

type TmdbCredits = {
  crew?: { job?: string; name?: string }[];
};

type TmdbVideo = {
  key?: string;
  site?: string;
  type?: string;
  official?: boolean;
  name?: string;
  iso_639_1?: string;
};

type TmdbProvider = { provider_name?: string };

type TmdbWatchProviders = {
  results?: Record<
    string,
    {
      flatrate?: TmdbProvider[];
      free?: TmdbProvider[];
      ads?: TmdbProvider[];
      rent?: TmdbProvider[];
      buy?: TmdbProvider[];
    }
  >;
};

type TmdbDetails = TmdbMovie & {
  runtime?: number | null;
  genres?: { id: number; name: string }[];
  credits?: TmdbCredits;
  videos?: { results?: TmdbVideo[] };
  "watch/providers"?: TmdbWatchProviders;
  status_message?: string;
};

function posterUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${POSTER_BASE}${path}`;
}

function extractProviders(data: TmdbDetails): string[] {
  const region =
    data["watch/providers"]?.results?.[TMDB_WATCH_REGION] ??
    data["watch/providers"]?.results?.ES;
  if (!region) return [];

  const names = [
    ...(region.flatrate ?? []),
    ...(region.free ?? []),
    ...(region.ads ?? []),
    ...(region.rent ?? []),
    ...(region.buy ?? []),
  ]
    .map((p) => p.provider_name)
    .filter((n): n is string => Boolean(n));

  return [...new Set(names)].slice(0, 6);
}

function extractYoutubeTrailerKey(data: TmdbDetails): string | null {
  const videos = (data.videos?.results ?? []).filter(
    (v) => v.site === "YouTube" && v.key && (v.type === "Trailer" || v.type === "Teaser"),
  );
  if (videos.length === 0) return null;

  const ranked = [...videos].sort((a, b) => {
    const score = (v: TmdbVideo) =>
      (v.type === "Trailer" ? 100 : 0) +
      (v.official ? 50 : 0) +
      (v.iso_639_1 === "es" ? 30 : v.iso_639_1 === "en" ? 10 : 0);
    return score(b) - score(a);
  });

  return ranked[0]?.key ?? null;
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
    providers: [],
    overview: item.overview,
    popularity: item.popularity,
    youtubeTrailerKey: null,
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

function scorePersonName(name: string, query: string): number {
  const q = query.toLowerCase().trim();
  const n = name.toLowerCase().trim();
  if (!q || !n) return 0;
  if (n === q) return 1000;
  if (n.startsWith(q) || q.startsWith(n)) return 750;
  if (n.includes(q)) return 550;
  const parts = n.split(/\s+/);
  if (parts.some((p) => p === q)) return 700;
  if (parts.some((p) => p.startsWith(q) && q.length >= 3)) return 500;
  return 0;
}

async function searchMoviesByDirector(
  query: string,
  apiKey: string,
  maxDirectors = 2,
): Promise<(TmdbMovieResult & { _score: number })[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    language: TMDB_LANG,
    query,
    include_adult: "false",
    page: "1",
  });

  const data = await fetchTmdb<TmdbPersonSearchResponse>(
    `https://api.themoviedb.org/3/search/person?${params.toString()}`,
  );

  const directors = (data.results ?? [])
    .map((person) => ({
      ...person,
      match: scorePersonName(person.name ?? "", query),
    }))
    .filter((person) => {
      if (person.match >= 500) return true;
      return (
        person.known_for_department === "Directing" && person.match >= 200
      );
    })
    .sort(
      (a, b) =>
        b.match - a.match || (b.popularity ?? 0) - (a.popularity ?? 0),
    )
    .slice(0, maxDirectors);

  if (directors.length === 0) return [];

  const creditLists = await Promise.all(
    directors.map(async (person) => {
      const creditParams = new URLSearchParams({
        api_key: apiKey,
        language: TMDB_LANG,
      });
      try {
        const credits = await fetchTmdb<TmdbPersonMovieCredits>(
          `https://api.themoviedb.org/3/person/${person.id}/movie_credits?${creditParams.toString()}`,
        );
        const name = person.name ?? "Director";
        return (credits.crew ?? [])
          .filter((c) => c.job === "Director" && c.id)
          .map((item) => {
            const movie = mapSearchMovie(item);
            movie.directors = [name];
            movie._score =
              650 +
              person.match * 0.35 +
              Math.min(180, (item.popularity ?? 0) * 2) +
              (item.vote_average ?? 0) * 10 +
              (movie.coverUrl ? 40 : 0);
            return movie;
          });
      } catch {
        return [];
      }
    }),
  );

  return creditLists.flat();
}

export async function getTmdbMovieDetails(
  tmdbId: number,
): Promise<TmdbMovieResult> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("Falta TMDB_API_KEY");

  const params = new URLSearchParams({
    api_key: apiKey,
    language: TMDB_LANG,
    append_to_response: "credits,watch/providers,videos",
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
    providers: extractProviders(data),
    youtubeTrailerKey: extractYoutubeTrailerKey(data),
    overview: data.overview,
  };
}

export async function searchTmdbMovies(
  query: string,
  maxResults = 8,
): Promise<TmdbMovieResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("Falta TMDB_API_KEY");

  const titleParams = new URLSearchParams({
    api_key: apiKey,
    language: TMDB_LANG,
    query: trimmed,
    include_adult: "false",
    page: "1",
  });

  const [titleData, directorMovies] = await Promise.all([
    fetchTmdb<TmdbSearchResponse>(
      `https://api.themoviedb.org/3/search/movie?${titleParams.toString()}`,
    ),
    searchMoviesByDirector(trimmed, apiKey).catch(() => []),
  ]);

  const titleMovies = (titleData.results ?? [])
    .map(mapSearchMovie)
    .map((movie) => ({ ...movie, _score: scoreMovie(movie, trimmed) }));

  const byId = new Map<number, TmdbMovieResult & { _score: number }>();
  for (const movie of [...titleMovies, ...directorMovies]) {
    const prev = byId.get(movie.tmdbId);
    if (!prev || movie._score > prev._score) {
      byId.set(movie.tmdbId, {
        ...movie,
        directors:
          movie.directors.length > 0
            ? movie.directors
            : (prev?.directors ?? []),
      });
    } else if (
      prev &&
      movie.directors.length > 0 &&
      prev.directors.length === 0
    ) {
      byId.set(movie.tmdbId, { ...prev, directors: movie.directors });
    }
  }

  const ranked = [...byId.values()]
    .sort((a, b) => b._score - a._score)
    .slice(0, maxResults);

  const enriched = await Promise.all(
    ranked.map(async ({ _score: _, ...movie }) => {
      try {
        const details = await getTmdbMovieDetails(movie.tmdbId);
        return {
          ...movie,
          ...details,
          coverUrl: details.coverUrl ?? movie.coverUrl,
          title: details.title || movie.title,
          directors:
            details.directors.length > 0
              ? details.directors
              : movie.directors,
          voteAverage: details.voteAverage ?? movie.voteAverage,
        };
      } catch {
        return movie;
      }
    }),
  );

  return enriched;
}

type TmdbGenreListResponse = {
  genres?: { id: number; name: string }[];
};

let genreNameToIdCache: Map<string, number> | null = null;
let genreIdToNameCache: Map<number, string> | null = null;

function normalizeGenreKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

async function loadGenreMaps(
  apiKey: string,
): Promise<{ byName: Map<string, number>; byId: Map<number, string> }> {
  if (genreNameToIdCache && genreIdToNameCache) {
    return { byName: genreNameToIdCache, byId: genreIdToNameCache };
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    language: TMDB_LANG,
  });
  const data = await fetchTmdb<TmdbGenreListResponse>(
    `https://api.themoviedb.org/3/genre/movie/list?${params.toString()}`,
  );

  const byName = new Map<string, number>();
  const byId = new Map<number, string>();
  for (const g of data.genres ?? []) {
    if (g.name && g.id) {
      byName.set(normalizeGenreKey(g.name), g.id);
      byId.set(g.id, g.name);
    }
  }
  genreNameToIdCache = byName;
  genreIdToNameCache = byId;
  return { byName, byId };
}

async function resolveGenreIds(
  genreNames: string[],
  apiKey: string,
): Promise<number[]> {
  if (genreNames.length === 0) return [];
  const { byName } = await loadGenreMaps(apiKey);
  const ids: number[] = [];
  for (const name of genreNames) {
    const id = byName.get(normalizeGenreKey(name));
    if (id != null && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/**
 * Películas bien valoradas según géneros preferidos (OR).
 * Excluye IDs ya en biblioteca. Sin géneros → popular bien puntuado.
 */
export async function discoverRecommendedMovies({
  genreNames = [],
  excludeIds = [],
  limit = 16,
}: {
  genreNames?: string[];
  excludeIds?: number[];
  limit?: number;
}): Promise<TmdbMovieResult[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("Falta TMDB_API_KEY");

  const exclude = new Set(excludeIds.filter((id) => Number.isFinite(id)));
  const genreIds = await resolveGenreIds(genreNames, apiKey);
  const { byId } = await loadGenreMaps(apiKey);
  const target = Math.min(40, Math.max(1, limit));
  const collected: TmdbMovie[] = [];
  const seen = new Set<number>();

  for (let page = 1; page <= 3 && collected.length < target * 2; page++) {
    const params = new URLSearchParams({
      api_key: apiKey,
      language: TMDB_LANG,
      include_adult: "false",
      sort_by: "vote_average.desc",
      "vote_average.gte": "7",
      "vote_count.gte": "200",
      page: String(page),
    });
    if (genreIds.length > 0) {
      params.set("with_genres", genreIds.join("|"));
    }

    const data = await fetchTmdb<TmdbSearchResponse>(
      `https://api.themoviedb.org/3/discover/movie?${params.toString()}`,
    );

    for (const item of data.results ?? []) {
      if (!item.id || exclude.has(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      collected.push(item);
      if (collected.length >= target * 2) break;
    }

    if ((data.results ?? []).length === 0) break;
  }

  const slice = collected.slice(0, target);
  const enriched = await Promise.all(
    slice.map(async (item) => {
      const base = mapSearchMovie(item);
      const { _score: _, ...movie } = base;
      movie.genres = (item.genre_ids ?? [])
        .map((id) => byId.get(id) ?? null)
        .filter((n): n is string => Boolean(n));

      try {
        const details = await getTmdbMovieDetails(item.id);
        return {
          ...movie,
          ...details,
          coverUrl: details.coverUrl ?? movie.coverUrl,
          title: details.title || movie.title,
          genres:
            details.genres.length > 0 ? details.genres : movie.genres,
          voteAverage: details.voteAverage ?? movie.voteAverage,
        };
      } catch {
        return movie;
      }
    }),
  );

  return enriched;
}
