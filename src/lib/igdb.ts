import type { RawgGameResult } from "@/lib/types";

type IgdbToken = {
  access_token: string;
  expires_at: number;
};

type IgdbCover = {
  image_id?: string;
};

type IgdbInvolvedCompany = {
  developer?: boolean;
  company?: { name?: string };
};

type IgdbPlatform = {
  name?: string;
};

type IgdbGenre = {
  name?: string;
};

type IgdbGame = {
  id: number;
  name?: string;
  summary?: string | null;
  first_release_date?: number;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  rating?: number;
  rating_count?: number;
  total_rating?: number;
  total_rating_count?: number;
  cover?: IgdbCover;
  platforms?: IgdbPlatform[];
  genres?: IgdbGenre[];
  involved_companies?: IgdbInvolvedCompany[];
};

let cachedToken: IgdbToken | null = null;

function coverUrl(imageId: string | undefined): string | null {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

function unixToIsoDate(unix?: number): string | null {
  if (!unix || !Number.isFinite(unix)) return null;
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

async function getIgdbAccessToken(): Promise<{
  clientId: string;
  token: string;
}> {
  const clientId = process.env.IGDB_CLIENT_ID?.trim();
  const clientSecret = process.env.IGDB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Faltan IGDB_CLIENT_ID / IGDB_CLIENT_SECRET. Crea una app en https://dev.twitch.tv/console",
    );
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now + 60_000) {
    return { clientId, token: cachedToken.access_token };
  }

  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const res = await fetch(url, { method: "POST", cache: "no-store" });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    message?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.message || `No se pudo autenticar con Twitch/IGDB (${res.status})`,
    );
  }

  cachedToken = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in ?? 5_000_000) * 1000,
  };

  return { clientId, token: data.access_token };
}

async function igdbQuery<T>(endpoint: string, body: string): Promise<T[]> {
  const { clientId, token } = await getIgdbAccessToken();
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `IGDB HTTP ${res.status}`);
  }

  return (await res.json()) as T[];
}

function escapeApicalypseString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function mapGame(item: IgdbGame): RawgGameResult & { _score: number } {
  const developers = (item.involved_companies ?? [])
    .filter((c) => c.developer)
    .map((c) => c.company?.name)
    .filter((n): n is string => Boolean(n));

  const platforms = (item.platforms ?? [])
    .map((p) => p.name)
    .filter((n): n is string => Boolean(n));

  const genres = (item.genres ?? [])
    .map((g) => g.name)
    .filter((n): n is string => Boolean(n));

  const summary = item.summary?.trim() || null;

  const ratingsCount =
    item.total_rating_count ??
    item.rating_count ??
    item.aggregated_rating_count ??
    0;

  const rating =
    item.total_rating != null
      ? item.total_rating / 20
      : item.rating != null
        ? item.rating / 20
        : item.aggregated_rating != null
          ? item.aggregated_rating / 20
          : null;

  const metacritic =
    item.aggregated_rating != null
      ? Math.round(item.aggregated_rating)
      : null;

  return {
    // Reutilizamos el campo de la BD (rawg_id) con el ID de IGDB
    rawgId: item.id,
    title: item.name ?? "Sin título",
    developers,
    coverUrl: coverUrl(item.cover?.image_id),
    platforms,
    genres,
    summary,
    released: unixToIsoDate(item.first_release_date),
    metacritic,
    playtimeEstimate: null,
    rating,
    ratingsCount,
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

export function hasIgdbCredentials(): boolean {
  return Boolean(
    process.env.IGDB_CLIENT_ID?.trim() &&
      process.env.IGDB_CLIENT_SECRET?.trim(),
  );
}

/** Busca juegos en IGDB (Twitch). El id se guarda en rawg_id de la BD. */
export async function searchIgdbGames(
  query: string,
  maxResults = 8,
): Promise<RawgGameResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = Math.min(40, Math.max(maxResults, 20));
  const safe = escapeApicalypseString(trimmed);

  const games = await igdbQuery<IgdbGame>(
    "games",
    `
search "${safe}";
fields name, summary, first_release_date, aggregated_rating, aggregated_rating_count,
  rating, rating_count, total_rating, total_rating_count,
  cover.image_id, platforms.name, genres.name,
  involved_companies.developer, involved_companies.company.name;
limit ${limit};
`.trim(),
  );

  return games
    .map(mapGame)
    .map((game) => ({ ...game, _score: scoreGame(game, trimmed) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, maxResults)
    .map(({ _score: _, ...game }) => game);
}

/** IGDB external_games category 1 = Steam */
const IGDB_STEAM_CATEGORY = 1;

type IgdbExternalGame = {
  uid?: string;
  game?: IgdbGame;
};

/**
 * Resuelve Steam AppIDs → metadatos IGDB.
 * Devuelve Map<steamAppId, RawgGameResult>.
 */
export async function fetchIgdbGamesBySteamAppIds(
  steamAppIds: number[],
): Promise<Map<number, RawgGameResult>> {
  const result = new Map<number, RawgGameResult>();
  const unique = [...new Set(steamAppIds.filter((id) => Number.isFinite(id)))];
  if (unique.length === 0) return result;

  const chunkSize = 40;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const uids = chunk.map((id) => `"${id}"`).join(",");
    const rows = await igdbQuery<IgdbExternalGame>(
      "external_games",
      `
fields uid,
  game.id, game.name, game.summary, game.first_release_date,
  game.aggregated_rating, game.aggregated_rating_count,
  game.rating, game.rating_count, game.total_rating, game.total_rating_count,
  game.cover.image_id, game.platforms.name, game.genres.name,
  game.involved_companies.developer, game.involved_companies.company.name;
where category = ${IGDB_STEAM_CATEGORY} & uid = (${uids});
limit ${chunk.length};
`.trim(),
    );

    for (const row of rows) {
      const steamId = Number(row.uid);
      if (!Number.isFinite(steamId) || !row.game?.id) continue;
      const mapped = mapGame(row.game);
      const { _score: _, ...game } = mapped;
      result.set(steamId, game);
    }

    if (i + chunkSize < unique.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return result;
}
