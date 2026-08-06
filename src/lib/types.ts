export type BookStatus = "wishlist" | "owned" | "reading" | "read";

export type GameStatus = "wishlist" | "owned" | "playing" | "completed";

export type MovieStatus = "wishlist" | "owned" | "watching" | "watched";

export type Profile = {
  id: string;
  email: string | null;
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
  released: string | null;
  metacritic: number | null;
  status: GameStatus;
  hours_played: number;
  playtime_estimate: number | null;
  finish_date: string | null;
  rating: number | null;
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
  released: string | null;
  metacritic: number | null;
  playtimeEstimate: number | null;
  rating: number | null;
  ratingsCount?: number;
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
  status: MovieStatus;
  minutes_watched: number;
  finish_date: string | null;
  rating: number | null;
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
  overview?: string;
  popularity?: number;
};

export const STATUS_LABELS: Record<BookStatus, string> = {
  wishlist: "Wishlist",
  owned: "Sin empezar",
  reading: "Leyendo",
  read: "Leído",
};

export const STATUS_HINTS: Record<BookStatus, string> = {
  wishlist: "Lo quiero, pero aún no lo tengo",
  owned: "Lo tengo en la estantería, sin empezar",
  reading: "Lo tengo · leyendo ahora",
  read: "Lo tengo · ya terminado",
};

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  wishlist: "Wishlist",
  owned: "Sin empezar",
  playing: "Jugando",
  completed: "Completado",
};

export const GAME_STATUS_HINTS: Record<GameStatus, string> = {
  wishlist: "Lo quiero, pero aún no lo tengo",
  owned: "Lo tengo, sin empezar",
  playing: "Lo tengo · jugando ahora",
  completed: "Lo tengo · terminado",
};

export const MOVIE_STATUS_LABELS: Record<MovieStatus, string> = {
  wishlist: "Wishlist",
  owned: "Sin empezar",
  watching: "Viendo",
  watched: "Vista",
};

export const MOVIE_STATUS_HINTS: Record<MovieStatus, string> = {
  wishlist: "La quiero, pero aún no la tengo",
  owned: "La tengo, sin empezar",
  watching: "La tengo · viendo ahora",
  watched: "La tengo · ya vista",
};

export type ShelfStatus = Extract<BookStatus, "owned" | "reading" | "read">;
export type GameShelfStatus = Extract<
  GameStatus,
  "owned" | "playing" | "completed"
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
];
export const MOVIE_SHELF_STATUSES: MovieShelfStatus[] = [
  "owned",
  "watching",
  "watched",
];

export function isOnShelf(status: BookStatus): status is ShelfStatus {
  return SHELF_STATUSES.includes(status as ShelfStatus);
}

export function isGameOnShelf(status: GameStatus): status is GameShelfStatus {
  return GAME_SHELF_STATUSES.includes(status as GameShelfStatus);
}

export function isMovieOnShelf(status: MovieStatus): status is MovieShelfStatus {
  return MOVIE_SHELF_STATUSES.includes(status as MovieShelfStatus);
}
