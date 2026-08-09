import type {
  MovieProvider,
  SeriesSeasonCounts,
  TmdbTvEpisode,
  TmdbTvResult,
  TmdbTvSeason,
} from "@/lib/types";

const TMDB_LANG = "es-ES";
const TMDB_WATCH_REGION = "ES";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const LOGO_BASE = "https://image.tmdb.org/t/p/w45";

type TmdbTv = {
  id: number;
  name?: string;
  original_name?: string | null;
  poster_path?: string | null;
  first_air_date?: string | null;
  vote_average?: number | null;
  popularity?: number;
  overview?: string;
  genre_ids?: number[];
};

type TmdbSearchResponse = {
  results?: TmdbTv[];
  status_message?: string;
};

type TmdbVideo = {
  key?: string;
  site?: string;
  type?: string;
  official?: boolean;
  name?: string;
  iso_639_1?: string;
};

type TmdbProvider = {
  provider_name?: string;
  logo_path?: string | null;
};

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

type TmdbSeasonSummary = {
  season_number?: number;
  name?: string;
  episode_count?: number;
  poster_path?: string | null;
};

type TmdbDetails = TmdbTv & {
  genres?: { id: number; name: string }[];
  episode_run_time?: number[];
  number_of_seasons?: number | null;
  seasons?: TmdbSeasonSummary[];
  videos?: { results?: TmdbVideo[] };
  "watch/providers"?: TmdbWatchProviders;
  status_message?: string;
};

type TmdbSeasonEpisode = {
  episode_number?: number;
  name?: string;
  overview?: string;
  runtime?: number | null;
  air_date?: string | null;
};

type TmdbSeasonDetails = {
  season_number?: number;
  name?: string;
  poster_path?: string | null;
  episodes?: TmdbSeasonEpisode[];
  status_message?: string;
};

function posterUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${POSTER_BASE}${path}`;
}

function providerLogoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${LOGO_BASE}${path}`;
}

function extractProviders(data: TmdbDetails): MovieProvider[] {
  const region =
    data["watch/providers"]?.results?.[TMDB_WATCH_REGION] ??
    data["watch/providers"]?.results?.ES;
  if (!region) return [];

  const list = [
    ...(region.flatrate ?? []),
    ...(region.free ?? []),
    ...(region.ads ?? []),
    ...(region.rent ?? []),
    ...(region.buy ?? []),
  ];

  const byName = new Map<string, MovieProvider>();
  for (const p of list) {
    const name = p.provider_name?.trim();
    if (!name || byName.has(name)) continue;
    byName.set(name, {
      name,
      logoUrl: providerLogoUrl(p.logo_path),
    });
  }

  return [...byName.values()].slice(0, 6);
}

function extractYoutubeTrailerKey(data: TmdbDetails): string | null {
  const videos = (data.videos?.results ?? []).filter(
    (v) =>
      v.site === "YouTube" &&
      v.key &&
      (v.type === "Trailer" || v.type === "Teaser"),
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

function buildSeasonCounts(seasons: TmdbSeasonSummary[] | undefined): {
  counts: SeriesSeasonCounts;
  list: TmdbTvSeason[];
} {
  const counts: SeriesSeasonCounts = {};
  const list: TmdbTvSeason[] = [];
  for (const s of seasons ?? []) {
    const num = s.season_number;
    if (num == null || num < 0) continue;
    // Season 0 = especiales; se incluyen si tienen episodios
    const epCount = Math.max(0, Number(s.episode_count) || 0);
    if (epCount <= 0 && num === 0) continue;
    counts[String(num)] = epCount;
    list.push({
      seasonNumber: num,
      name: s.name?.trim() || (num === 0 ? "Especiales" : `Temporada ${num}`),
      episodeCount: epCount,
      coverUrl: posterUrl(s.poster_path),
    });
  }
  list.sort((a, b) => a.seasonNumber - b.seasonNumber);
  return { counts, list };
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

function mapSearchTv(item: TmdbTv): TmdbTvResult & { _score: number } {
  return {
    tmdbId: item.id,
    title: item.name ?? item.original_name ?? "Sin título",
    originalTitle: item.original_name ?? null,
    coverUrl: posterUrl(item.poster_path),
    genres: [],
    firstAirDate: item.first_air_date || null,
    voteAverage: item.vote_average ?? null,
    providers: [],
    episodeRunTime: null,
    numberOfSeasons: null,
    seasonCounts: {},
    overview: item.overview,
    popularity: item.popularity,
    youtubeTrailerKey: null,
    _score: 0,
  };
}

function scoreTv(
  show: ReturnType<typeof mapSearchTv>,
  query: string,
): number {
  const q = query.toLowerCase().trim();
  const title = show.title.toLowerCase();
  const original = (show.originalTitle ?? "").toLowerCase();
  let score = 0;

  if (title === q || original === q) score += 1000;
  else if (title.startsWith(q) || original.startsWith(q)) score += 600;
  else if (title.includes(q) || original.includes(q)) score += 300;

  score += Math.min(200, (show.popularity ?? 0) * 2);
  if (show.voteAverage) score += show.voteAverage * 15;
  if (show.coverUrl) score += 80;

  return score;
}

export async function getTmdbTvDetails(tmdbId: number): Promise<TmdbTvResult> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("Falta TMDB_API_KEY");

  const params = new URLSearchParams({
    api_key: apiKey,
    language: TMDB_LANG,
    append_to_response: "watch/providers,videos",
  });

  const data = await fetchTmdb<TmdbDetails>(
    `https://api.themoviedb.org/3/tv/${tmdbId}?${params.toString()}`,
  );

  const { counts, list } = buildSeasonCounts(data.seasons);
  const runtimes = (data.episode_run_time ?? []).filter(
    (n) => Number.isFinite(n) && n > 0,
  );
  const episodeRunTime =
    runtimes.length > 0
      ? Math.round(runtimes.reduce((a, b) => a + b, 0) / runtimes.length)
      : null;

  return {
    tmdbId: data.id,
    title: data.name ?? data.original_name ?? "Sin título",
    originalTitle: data.original_name ?? null,
    coverUrl: posterUrl(data.poster_path),
    genres: (data.genres ?? []).map((g) => g.name).filter(Boolean),
    firstAirDate: data.first_air_date || null,
    voteAverage: data.vote_average ?? null,
    providers: extractProviders(data),
    episodeRunTime,
    numberOfSeasons: data.number_of_seasons ?? list.filter((s) => s.seasonNumber > 0).length,
    seasonCounts: counts,
    seasons: list,
    youtubeTrailerKey: extractYoutubeTrailerKey(data),
    overview: data.overview,
  };
}

export async function getTmdbTvSeason(
  tmdbId: number,
  seasonNumber: number,
): Promise<TmdbTvSeason> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("Falta TMDB_API_KEY");

  const params = new URLSearchParams({
    api_key: apiKey,
    language: TMDB_LANG,
  });

  const data = await fetchTmdb<TmdbSeasonDetails>(
    `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?${params.toString()}`,
  );

  const episodes: TmdbTvEpisode[] = (data.episodes ?? [])
    .filter((e) => e.episode_number != null && e.episode_number >= 1)
    .map((e) => ({
      episodeNumber: e.episode_number as number,
      name: e.name?.trim() || `Episodio ${e.episode_number}`,
      overview: e.overview,
      runtime: e.runtime ?? null,
      airDate: e.air_date || null,
    }))
    .sort((a, b) => a.episodeNumber - b.episodeNumber);

  return {
    seasonNumber: data.season_number ?? seasonNumber,
    name:
      data.name?.trim() ||
      (seasonNumber === 0 ? "Especiales" : `Temporada ${seasonNumber}`),
    episodeCount: episodes.length,
    coverUrl: posterUrl(data.poster_path),
    episodes,
  };
}

export async function searchTmdbTv(
  query: string,
  maxResults = 8,
): Promise<TmdbTvResult[]> {
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

  const titleData = await fetchTmdb<TmdbSearchResponse>(
    `https://api.themoviedb.org/3/search/tv?${titleParams.toString()}`,
  );

  const ranked = (titleData.results ?? [])
    .map(mapSearchTv)
    .map((show) => ({ ...show, _score: scoreTv(show, trimmed) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, maxResults);

  const enriched = await Promise.all(
    ranked.map(async ({ _score: _, ...show }) => {
      try {
        const details = await getTmdbTvDetails(show.tmdbId);
        return {
          ...show,
          ...details,
          coverUrl: details.coverUrl ?? show.coverUrl,
          title: details.title || show.title,
          voteAverage: details.voteAverage ?? show.voteAverage,
        };
      } catch {
        return show;
      }
    }),
  );

  return enriched;
}
