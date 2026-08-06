import type { UserMovie } from "@/lib/types";

/**
 * Géneros preferidos a partir de la biblioteca:
 * vistas con score alto pesan más; si no hay scores, frecuencia en vistas + wishlist.
 */
export function deriveTopGenreNames(
  movies: UserMovie[],
  max = 3,
): string[] {
  const weights = new Map<string, number>();

  for (const movie of movies) {
    let weight = 1;
    if (movie.status === "watched") weight = 2;
    if (movie.status === "wishlist") weight = Math.max(weight, 1.5);
    if (movie.score != null) {
      if (movie.score >= 70) weight += 3;
      else if (movie.score >= 50) weight += 1;
    }

    for (const raw of movie.genres ?? []) {
      const genre = raw.trim();
      if (!genre) continue;
      weights.set(genre, (weights.get(genre) ?? 0) + weight);
    }
  }

  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([name]) => name);
}

export function libraryTmdbIds(movies: UserMovie[]): number[] {
  return movies
    .map((m) => m.tmdb_id)
    .filter((id): id is number => id != null && Number.isFinite(id));
}
