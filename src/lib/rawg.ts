import type { RawgGameResult } from "@/lib/types";

type RawgGame = {
  id: number;
  name?: string;
  background_image?: string | null;
  released?: string | null;
  metacritic?: number | null;
  rating?: number | null;
  ratings_count?: number;
  playtime?: number | null;
  platforms?: { platform?: { name?: string } }[] | null;
  genres?: { name?: string }[] | null;
};

type RawgSearchResponse = {
  results?: RawgGame[];
  detail?: string;
  error?: string;
};

async function fetchRawg(url: string, retries = 3): Promise<RawgSearchResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as RawgSearchResponse;
      if (res.ok && !data.error && !data.detail) return data;

      lastError = new Error(
        data.error || data.detail || `RAWG HTTP ${res.status}`,
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

  throw lastError ?? new Error("No se pudo buscar en RAWG");
}

function mapGame(item: RawgGame): RawgGameResult & { _score: number } {
  const platforms = (item.platforms ?? [])
    .map((p) => p.platform?.name)
    .filter((n): n is string => Boolean(n));

  return {
    rawgId: item.id,
    title: item.name ?? "Sin título",
    developers: [],
    coverUrl: item.background_image ?? null,
    platforms,
    released: item.released ?? null,
    metacritic: item.metacritic ?? null,
    playtimeEstimate: item.playtime ?? null,
    rating: item.rating ?? null,
    ratingsCount: item.ratings_count,
    _score: 0,
  };
}

function scoreGame(game: ReturnType<typeof mapGame>, query: string): number {
  const q = query.toLowerCase().trim();
  const title = game.title.toLowerCase();
  let score = 0;

  if (title === q) score += 1000;
  else if (title.startsWith(q)) score += 600;
  else if (title.includes(q)) score += 300;

  score += Math.min(250, (game.ratingsCount ?? 0) / 20);
  if (game.metacritic) score += game.metacritic;
  if (game.coverUrl) score += 80;
  if (game.rating) score += game.rating * 20;

  return score;
}

export async function searchRawgGames(
  query: string,
  maxResults = 8,
): Promise<RawgGameResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) throw new Error("Falta RAWG_API_KEY");

  const params = new URLSearchParams({
    key: apiKey,
    search: trimmed,
    page_size: String(Math.min(40, Math.max(maxResults, 20))),
    search_precise: "false",
  });

  const data = await fetchRawg(
    `https://api.rawg.io/api/games?${params.toString()}`,
  );

  return (data.results ?? [])
    .map(mapGame)
    .map((game) => ({ ...game, _score: scoreGame(game, trimmed) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, maxResults)
    .map(({ _score: _, ...game }) => game);
}
