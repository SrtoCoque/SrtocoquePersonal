import { resolveMovieProviderLogo } from "@/lib/movie-provider-logos";

export type BookStatus = "wishlist" | "owned" | "reading" | "read";

export type GameStatus =
  | "wishlist"
  | "owned"
  | "playing"
  | "completed"
  | "dropped";

export type MovieStatus = "wishlist" | "owned" | "watching" | "watched";

export type Profile = {
  id: string;
  email: string | null;
  steam_id?: string | null;
  steam_synced_at?: string | null;
  created_at: string;
};

export type UserBook = {
  id: string;
  user_id: string;
  google_books_id: string | null;
  title: string;
  authors: string[];
  cover_url: string | null;
  status: BookStatus;
  total_pages: number | null;
  pages_read: number;
  read_finish_date: string | null;
  rating: number | null;
  created_at: string;
};

export type UserGame = {
  id: string;
  user_id: string;
  rawg_id: number | null;
  title: string;
  developers: string[];
  cover_url: string | null;
  platforms: string[];
  /** Steam / PlayStation / Xbox / GOG / Epic (una o varias) */
  storefronts: (
    | "steam"
    | "playstation"
    | "xbox"
    | "nintendo"
    | "gog"
    | "epic"
    | "downloaded"
  )[];
  released: string | null;
  metacritic: number | null;
  status: GameStatus;
  hours_played: number;
  /** Precio pagado por tienda en €, p.ej. { steam: 19.99, nintendo: 40 } */
  prices: Partial<
    Record<
      | "steam"
      | "playstation"
      | "xbox"
      | "nintendo"
      | "gog"
      | "epic"
      | "downloaded",
      number
    >
  >;
  /** Día en que se registró el precio pagado (YYYY-MM-DD). */
  prices_set_at?: string | null;
  playtime_estimate: number | null;
  start_date: string | null;
  finish_date: string | null;
  rating: number | null;
  /** Veces que se ha pasado el juego. */
  times_completed?: number;
  steam_app_id?: number | null;
  /**
   * Horas atribuibles a Steam (sesión Steam), aunque la partida actual
   * sea en otra tienda. La sync de Steam escribe aquí siempre.
   */
  steam_hours_played?: number;
  /** Última vez jugado en Steam (YYYY-MM-DD), desde rtime_last_played. */
  steam_last_played_at?: string | null;
  /** Tienda desde la que se está jugando la partida actual */
  play_storefront?:
    | "steam"
    | "playstation"
    | "xbox"
    | "nintendo"
    | "gog"
    | "epic"
    | "downloaded"
    | null;
  created_at: string;
  updated_at?: string;
};

export type GameHourLogSource = "steam_sync" | "manual";

export type UserGameHourLog = {
  id: string;
  user_id: string;
  user_game_id: string;
  played_on: string;
  hours_delta: number;
  source: GameHourLogSource;
  created_at: string;
};

export type GoogleBookResult = {
  googleBooksId: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  totalPages: number | null;
  publishedDate?: string;
  description?: string;
  categories?: string[];
  language?: string;
  ratingsCount?: number;
  averageRating?: number;
  hasIsbn?: boolean;
};

export type RawgGameResult = {
  rawgId: number;
  title: string;
  developers: string[];
  coverUrl: string | null;
  platforms: string[];
  genres: string[];
  summary: string | null;
  released: string | null;
  metacritic: number | null;
  playtimeEstimate: number | null;
  rating: number | null;
  ratingsCount?: number;
};

export type MovieProvider = {
  name: string;
  logoUrl: string | null;
};

export type UserMovie = {
  id: string;
  user_id: string;
  tmdb_id: number | null;
  title: string;
  original_title: string | null;
  directors: string[];
  cover_url: string | null;
  genres: string[];
  released: string | null;
  runtime: number | null;
  vote_average: number | null;
  providers: MovieProvider[];
  status: MovieStatus;
  minutes_watched: number;
  finish_date: string | null;
  rating: number | null;
  score: number | null;
  created_at: string;
  times_watched?: number;
};

export type MovieWatchLocation = "home" | "cinema";

export type UserMovieViewing = {
  id: string;
  user_movie_id: string;
  user_id: string;
  viewed_at: string;
  location: MovieWatchLocation;
  created_at: string;
};

export type TmdbMovieResult = {
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  directors: string[];
  coverUrl: string | null;
  genres: string[];
  released: string | null;
  runtime: number | null;
  voteAverage: number | null;
  providers: MovieProvider[];
  /** ID de YouTube del trailer oficial (TMDB), si existe */
  youtubeTrailerKey?: string | null;
  overview?: string;
  popularity?: number;
};

/** Enlace al trailer: YouTube directo si hay key TMDB; si no, búsqueda «título trailer». */
export function movieTrailerHref(
  title: string,
  youtubeKey?: string | null,
): string {
  if (youtubeKey) return `https://www.youtube.com/watch?v=${youtubeKey}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer`)}`;
}

/** Formatea minutos TMDB: 135 → "2h 15min" */
export function formatMovieRuntime(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m} min`;
  if (m <= 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** True si la fecha de estreno es posterior a hoy (YYYY-MM-DD). */
export function isUpcomingRelease(
  released: string | null | undefined,
): boolean {
  if (!released) return false;
  const day = released.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const today = new Date().toISOString().slice(0, 10);
  return day > today;
}

/**
 * True si se estrenó hace como máximo `windowDays` días (ya en cartelera,
 * no futura). Por defecto dos semanas.
 */
export function isInTheatersRelease(
  released: string | null | undefined,
  windowDays = 14,
): boolean {
  if (!released) return false;
  const day = released.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (day > today) return false;
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - windowDays);
  const startDay = start.toISOString().slice(0, 10);
  return day >= startDay;
}

export function formatReleaseDate(released: string | null | undefined): string | null {
  if (!released) return null;
  const day = released.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return released;
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

/** Días hasta el estreno (solo si es futuro). */
export function daysUntilRelease(
  released: string | null | undefined,
): number | null {
  if (!released) return null;
  const day = released.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (day <= today) return null;
  const ms =
    Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function formatDaysUntilRelease(
  released: string | null | undefined,
): string | null {
  const days = daysUntilRelease(released);
  if (days == null) return null;
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

export const STATUS_LABELS: Record<BookStatus, string> = {
  wishlist: "Wishlist",
  owned: "Sin empezar",
  reading: "Leyendo",
  read: "Leído",
};

export const STATUS_HINTS: Record<BookStatus, string> = {
  wishlist: "Lo quiero, pero aún no lo tengo",
  owned: "Lo tengo en la biblioteca, sin empezar",
  reading: "Lo tengo · leyendo ahora",
  read: "Lo tengo · ya terminado",
};

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  wishlist: "Wishlist",
  owned: "Sin empezar",
  playing: "Jugando",
  completed: "Completado",
  dropped: "Sin terminar",
};

export const GAME_STATUS_HINTS: Record<GameStatus, string> = {
  wishlist: "Lo quiero, pero aún no lo tengo",
  owned: "Lo tengo, sin empezar",
  playing: "Lo tengo · jugando ahora",
  completed: "Lo tengo · terminado",
  dropped: "Lo jugué, pero no lo terminé",
};

export const MOVIE_STATUS_LABELS: Record<MovieStatus, string> = {
  wishlist: "Wishlist",
  owned: "Sin empezar",
  watching: "Viendo",
  watched: "Vista",
};

export const MOVIE_WATCH_LOCATION_LABELS: Record<MovieWatchLocation, string> = {
  home: "En casa",
  cinema: "En el cine",
};

export type ShelfStatus = Extract<BookStatus, "owned" | "reading" | "read">;
export type GameShelfStatus = Extract<
  GameStatus,
  "owned" | "playing" | "completed" | "dropped"
>;
export type MovieShelfStatus = Extract<
  MovieStatus,
  "owned" | "watching" | "watched"
>;

export const SHELF_STATUSES: ShelfStatus[] = ["owned", "reading", "read"];
export const GAME_SHELF_STATUSES: GameShelfStatus[] = [
  "owned",
  "playing",
  "completed",
  "dropped",
];
export const MOVIE_SHELF_STATUSES: MovieShelfStatus[] = [
  "owned",
  "watching",
  "watched",
];

export function isOnShelf(status: BookStatus): status is ShelfStatus {
  return SHELF_STATUSES.includes(status as ShelfStatus);
}

export function isGameOnShelf(status: GameStatus | string): status is GameShelfStatus {
  if (status === "replaying") return true;
  return GAME_SHELF_STATUSES.includes(status as GameShelfStatus);
}

/** Normaliza filas legacy con status replaying. */
export function normalizeGameStatus(status: string): GameStatus {
  if (status === "replaying") return "playing";
  return status as GameStatus;
}

export function isMovieOnShelf(status: MovieStatus): status is MovieShelfStatus {
  return MOVIE_SHELF_STATUSES.includes(status as MovieShelfStatus);
}

/** Persistir en `user_movies.providers` (TEXT[]): JSON o nombre legado. */
export function serializeMovieProviders(providers: MovieProvider[]): string[] {
  return providers.map((p) =>
    JSON.stringify({
      n: p.name,
      l: resolveMovieProviderLogo(p.name, p.logoUrl),
    }),
  );
}

export function parseMovieProviders(raw: unknown): MovieProvider[] {
  if (!Array.isArray(raw)) return [];
  const out: MovieProvider[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    let name: string | null = null;
    let logoUrl: string | null = null;

    if (typeof item === "string") {
      const trimmed = item.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("{")) {
        try {
          const o = JSON.parse(trimmed) as {
            n?: string;
            name?: string;
            l?: string | null;
            logoUrl?: string | null;
          };
          name = o.n ?? o.name ?? null;
          logoUrl = o.l ?? o.logoUrl ?? null;
        } catch {
          name = trimmed;
        }
      } else {
        name = trimmed;
      }
    } else if (item && typeof item === "object") {
      const o = item as { name?: string; logoUrl?: string | null };
      name = o.name ?? null;
      logoUrl = o.logoUrl ?? null;
    }

    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({
      name,
      logoUrl: resolveMovieProviderLogo(name, logoUrl),
    });
  }

  return out;
}

