/** Cliente Steam Web API (server-only). */

export type SteamOwnedGame = {
  appid: number;
  name: string;
  playtimeForeverMinutes: number;
  /** Minutos jugados en las últimas 2 semanas (Steam). */
  playtime2WeeksMinutes: number;
  /** Unix seconds de la última vez jugado (si Steam lo envía). */
  lastPlayedAt: number | null;
  imgIconUrl: string | null;
};

/** Convierte rtime_last_played a YYYY-MM-DD en Europe/Madrid. */
export function steamLastPlayedOn(
  unixSeconds: number | null | undefined,
): string | null {
  if (unixSeconds == null || unixSeconds <= 0) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(unixSeconds * 1000));
  } catch {
    return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
  }
}

/** Hoy (YYYY-MM-DD) en Europe/Madrid. */
export function todayOnMadrid(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Elige la mejor fecha de última jugada.
 * Steam a veces no mueve rtime_last_played aunque suban las horas;
 * si hay actividad reciente, usamos hoy.
 */
export function resolveSteamLastPlayedDay(opts: {
  apiLastPlayedUnix: number | null;
  previousDay: string | null | undefined;
  hoursIncreased: boolean;
  inRecentlyPlayed: boolean;
}): string | null {
  const today = todayOnMadrid();
  const fromApi = steamLastPlayedOn(opts.apiLastPlayedUnix);
  const prev = opts.previousDay?.slice(0, 10) || null;

  let best = prev;
  if (fromApi && (!best || fromApi > best)) best = fromApi;

  const apiDidNotAdvance =
    !fromApi || (prev != null && fromApi <= prev);

  if (
    (opts.hoursIncreased || opts.inRecentlyPlayed) &&
    apiDidNotAdvance
  ) {
    if (!best || best < today) best = today;
  }

  return best;
}

function steamApiKey(): string {
  const key = process.env.STEAM_WEB_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Falta STEAM_WEB_API_KEY. Consíguela en https://steamcommunity.com/dev/apikey",
    );
  }
  return key;
}

export function hasSteamCredentials(): boolean {
  return Boolean(process.env.STEAM_WEB_API_KEY?.trim());
}

/** Extrae vanity o steamid64 de URL / texto libre. */
export function parseSteamInput(raw: string): {
  kind: "steamid64" | "vanity";
  value: string;
} | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const idMatch = trimmed.match(/7656119\d{10}/);
  if (idMatch) return { kind: "steamid64", value: idMatch[0] };

  const profiles = trimmed.match(
    /steamcommunity\.com\/profiles\/(7656119\d{10})/i,
  );
  if (profiles) return { kind: "steamid64", value: profiles[1] };

  const idUrl = trimmed.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  if (idUrl) return { kind: "vanity", value: decodeURIComponent(idUrl[1]) };

  if (/^\d{17}$/.test(trimmed)) return { kind: "steamid64", value: trimmed };

  if (/^[a-zA-Z0-9_-]{2,64}$/.test(trimmed)) {
    return { kind: "vanity", value: trimmed };
  }

  return null;
}

export async function resolveSteamId64(input: string): Promise<string> {
  const parsed = parseSteamInput(input);
  if (!parsed) {
    throw new Error(
      "No reconocí ese Steam ID. Pega tu URL de perfil o el SteamID64.",
    );
  }
  if (parsed.kind === "steamid64") return parsed.value;

  const key = steamApiKey();
  const url = new URL(
    "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/",
  );
  url.searchParams.set("key", key);
  url.searchParams.set("vanityurl", parsed.value);

  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as {
    response?: { success?: number; steamid?: string; message?: string };
  };

  if (!res.ok || data.response?.success !== 1 || !data.response.steamid) {
    throw new Error(
      data.response?.message ||
        "No encontré ese perfil de Steam. Revisa la URL o el nombre.",
    );
  }
  return data.response.steamid;
}

export async function fetchSteamOwnedGames(
  steamId64: string,
): Promise<SteamOwnedGame[]> {
  const key = steamApiKey();
  const input = JSON.stringify({
    steamid: steamId64,
    include_appinfo: true,
    include_played_free_games: true,
  });
  const url = new URL(
    "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
  );
  url.searchParams.set("key", key);
  url.searchParams.set("format", "json");
  url.searchParams.set("input_json", input);

  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as {
    response?: {
      game_count?: number;
      games?: Array<{
        appid: number;
        name?: string;
        playtime_forever?: number;
        playtime_2weeks?: number;
        rtime_last_played?: number;
        img_icon_url?: string;
      }>;
    };
  };

  if (!res.ok) {
    throw new Error(`Steam API HTTP ${res.status}`);
  }

  const games = data.response?.games;
  if (!games) {
    throw new Error(
      "No pude leer la biblioteca. ¿Es pública en Steam (Privacidad → Juegos)?",
    );
  }

  return games.map((g) => ({
    appid: g.appid,
    name: g.name?.trim() || `App ${g.appid}`,
    playtimeForeverMinutes: g.playtime_forever ?? 0,
    playtime2WeeksMinutes: g.playtime_2weeks ?? 0,
    lastPlayedAt:
      typeof g.rtime_last_played === "number" && g.rtime_last_played > 0
        ? g.rtime_last_played
        : null,
    imgIconUrl: g.img_icon_url
      ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
      : null,
  }));
}

/** AppIDs jugados en las últimas ~2 semanas (Steam). */
export async function fetchSteamRecentlyPlayedAppIds(
  steamId64: string,
): Promise<Set<number>> {
  const key = steamApiKey();
  const url = new URL(
    "https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/",
  );
  url.searchParams.set("key", key);
  url.searchParams.set("steamid", steamId64);
  url.searchParams.set("count", "0");

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return new Set();
    const data = (await res.json()) as {
      response?: {
        games?: Array<{ appid?: number }>;
      };
    };
    const ids = new Set<number>();
    for (const g of data.response?.games ?? []) {
      if (typeof g.appid === "number" && g.appid > 0) ids.add(g.appid);
    }
    return ids;
  } catch {
    return new Set();
  }
}

export type SteamStoreDetails = {
  appid: number;
  name: string;
  coverUrl: string | null;
  /** Precio actual en Steam (€), null si gratis / no disponible */
  priceEur: number | null;
  genres: string[];
  platforms: string[];
  metacritic: number | null;
  reviewPercent: number | null;
};

function mapSteamPlatforms(data: {
  platforms?: { windows?: boolean; mac?: boolean; linux?: boolean };
}): string[] {
  const out: string[] = [];
  if (data.platforms?.windows) out.push("PC (Steam)");
  if (data.platforms?.mac) out.push("Mac");
  if (data.platforms?.linux) out.push("Linux");
  return out;
}

async function fetchSteamReviewPercent(
  appid: number,
): Promise<number | null> {
  try {
    const url = new URL(
      `https://store.steampowered.com/appreviews/${appid}`,
    );
    url.searchParams.set("json", "1");
    url.searchParams.set("language", "all");
    url.searchParams.set("purchase_type", "all");
    url.searchParams.set("num_per_page", "0");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query_summary?: {
        total_positive?: number;
        total_reviews?: number;
      };
    };
    const pos = Number(data.query_summary?.total_positive) || 0;
    const total = Number(data.query_summary?.total_reviews) || 0;
    if (total <= 0) return null;
    return Math.round((pos / total) * 100);
  } catch {
    return null;
  }
}

/** Metadatos de la tienda Steam (nombre, portada, precio, géneros, metacritic, % reviews). */
export async function fetchSteamStoreDetails(
  steamAppIds: number[],
  options?: { includeReviews?: boolean },
): Promise<Map<number, SteamStoreDetails>> {
  const includeReviews = options?.includeReviews !== false;
  const result = new Map<number, SteamStoreDetails>();
  const unique = [
    ...new Set(steamAppIds.filter((id) => Number.isFinite(id) && id > 0)),
  ];
  if (unique.length === 0) return result;

  const concurrency = 6;
  for (let i = 0; i < unique.length; i += concurrency) {
    const chunk = unique.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (appid) => {
        try {
          const url = new URL("https://store.steampowered.com/api/appdetails");
          url.searchParams.set("appids", String(appid));
          url.searchParams.set("cc", "es");
          url.searchParams.set("l", "spanish");
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return;
          const data = (await res.json()) as Record<
            string,
            {
              success?: boolean;
              data?: {
                name?: string;
                header_image?: string;
                capsule_image?: string;
                is_free?: boolean;
                price_overview?: {
                  final?: number;
                  initial?: number;
                  currency?: string;
                };
                genres?: Array<{ description?: string }>;
                platforms?: {
                  windows?: boolean;
                  mac?: boolean;
                  linux?: boolean;
                };
                metacritic?: { score?: number };
              };
            }
          >;
          const entry = data[String(appid)];
          if (!entry?.success || !entry.data?.name) return;

          let priceEur: number | null = null;
          if (entry.data.is_free) {
            priceEur = 0;
          } else if (
            entry.data.price_overview?.final != null &&
            Number.isFinite(entry.data.price_overview.final)
          ) {
            priceEur =
              Math.round((Number(entry.data.price_overview.final) / 100) * 100) /
              100;
          }

          const genres = (entry.data.genres ?? [])
            .map((g) => g.description?.trim())
            .filter((g): g is string => Boolean(g));

          const metacritic =
            entry.data.metacritic?.score != null &&
            Number.isFinite(entry.data.metacritic.score)
              ? Math.round(Number(entry.data.metacritic.score))
              : null;

          const reviewPercent = includeReviews
            ? await fetchSteamReviewPercent(appid)
            : null;

          result.set(appid, {
            appid,
            name: entry.data.name.trim(),
            coverUrl:
              entry.data.header_image?.trim() ||
              entry.data.capsule_image?.trim() ||
              null,
            priceEur,
            genres,
            platforms: mapSteamPlatforms(entry.data),
            metacritic,
            reviewPercent,
          });
        } catch {
          /* ignore single failures */
        }
      }),
    );
    if (i + concurrency < unique.length) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return result;
}

export type SteamAchievementsSummary = {
  unlocked: number;
  total: number;
};

export type SteamAchievement = {
  apiName: string;
  name: string;
  description: string;
  unlocked: boolean;
  /** Unix seconds; null si bloqueado o sin dato */
  unlockTime: number | null;
  icon: string | null;
  iconGray: string | null;
};

export type SteamAchievementsDetail = {
  achievements: SteamAchievement[];
  unlocked: number;
  total: number;
};

type SchemaAchievement = {
  name?: string;
  displayName?: string;
  description?: string;
  icon?: string;
  icongray?: string;
};

async function fetchSteamAchievementSchema(
  appid: number,
): Promise<Map<string, SchemaAchievement>> {
  const map = new Map<string, SchemaAchievement>();
  try {
    const key = steamApiKey();
    const url = new URL(
      "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/",
    );
    url.searchParams.set("key", key);
    url.searchParams.set("appid", String(appid));
    url.searchParams.set("l", "spanish");

    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return map;
    const data = (await res.json()) as {
      game?: {
        availableGameStats?: {
          achievements?: SchemaAchievement[];
        };
      };
    };
    for (const a of data.game?.availableGameStats?.achievements ?? []) {
      if (a.name) map.set(a.name, a);
    }
  } catch {
    /* schema opcional */
  }
  return map;
}

/** Logros del jugador en un appid (con iconos). null si privados / error. */
export async function fetchSteamPlayerAchievements(
  steamId64: string,
  appid: number,
): Promise<SteamAchievementsDetail | null> {
  try {
    const key = steamApiKey();
    const url = new URL(
      "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/",
    );
    url.searchParams.set("key", key);
    url.searchParams.set("steamid", steamId64);
    url.searchParams.set("appid", String(appid));
    url.searchParams.set("l", "spanish");

    const [playerRes, schema] = await Promise.all([
      fetch(url, { cache: "no-store" }),
      fetchSteamAchievementSchema(appid),
    ]);
    if (!playerRes.ok) return null;
    const data = (await playerRes.json()) as {
      playerstats?: {
        success?: boolean;
        achievements?: Array<{
          apiname?: string;
          achieved?: number;
          unlocktime?: number;
          name?: string;
          description?: string;
        }>;
      };
    };
    if (!data.playerstats?.success || !data.playerstats.achievements) {
      return null;
    }

    const achievements: SteamAchievement[] = data.playerstats.achievements.map(
      (a) => {
        const apiName = a.apiname ?? "";
        const schemaRow = apiName ? schema.get(apiName) : undefined;
        const unlocked = Number(a.achieved) === 1;
        const unlockTime =
          unlocked && a.unlocktime && a.unlocktime > 0 ? a.unlocktime : null;
        return {
          apiName,
          name: (a.name || schemaRow?.displayName || apiName || "Logro").trim(),
          description: (a.description || schemaRow?.description || "").trim(),
          unlocked,
          unlockTime,
          icon: schemaRow?.icon?.trim() || null,
          iconGray: schemaRow?.icongray?.trim() || null,
        };
      },
    );

    const total = achievements.length;
    if (total === 0) return null;
    const unlocked = achievements.filter((a) => a.unlocked).length;

    achievements.sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      if (a.unlocked && b.unlocked) {
        return (b.unlockTime ?? 0) - (a.unlockTime ?? 0);
      }
      return a.name.localeCompare(b.name, "es");
    });

    return { achievements, unlocked, total };
  } catch {
    return null;
  }
}

/** Resumen de logros del jugador en un appid. null si privados / error. */
export async function fetchSteamAchievementsSummary(
  steamId64: string,
  appid: number,
): Promise<SteamAchievementsSummary | null> {
  try {
    const key = steamApiKey();
    const url = new URL(
      "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/",
    );
    url.searchParams.set("key", key);
    url.searchParams.set("steamid", steamId64);
    url.searchParams.set("appid", String(appid));

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      playerstats?: {
        success?: boolean;
        achievements?: Array<{ achieved?: number }>;
      };
    };
    if (!data.playerstats?.success || !data.playerstats.achievements) {
      return null;
    }
    const list = data.playerstats.achievements;
    const total = list.length;
    if (total === 0) return null;
    const unlocked = list.filter((a) => Number(a.achieved) === 1).length;
    return { unlocked, total };
  } catch {
    return null;
  }
}

export function isPlaceholderSteamTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  return /^(Steam|App)\s+\d+$/i.test(title.trim());
}

export function steamMinutesToHours(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.round((minutes / 60) * 10) / 10;
}

export type SteamWishlistGame = {
  appid: number;
  name: string | null;
  priority: number | null;
  /** Unix seconds cuando se añadió a la wishlist */
  dateAdded: number | null;
};

export type SteamWishlistResult = {
  games: SteamWishlistGame[];
  /** true si no se pudo leer (privada / error) */
  unavailable: boolean;
};

function wishlistDateAddedOn(
  unixSeconds: number | null | undefined,
): string | null {
  return steamLastPlayedOn(unixSeconds);
}

export { wishlistDateAddedOn };

/**
 * Wishlist pública del usuario.
 * Intenta IWishlistService y, si falla, el endpoint de la tienda.
 */
export async function fetchSteamWishlist(
  steamId64: string,
): Promise<SteamWishlistResult> {
  const key = steamApiKey();

  try {
    const url = new URL(
      "https://api.steampowered.com/IWishlistService/GetWishlist/v1/",
    );
    url.searchParams.set("key", key);
    url.searchParams.set("steamid", steamId64);
    url.searchParams.set("format", "json");

    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json()) as {
      response?: {
        items?: Array<{
          appid?: number;
          priority?: number;
          date_added?: number;
        }>;
      };
    };

    const items = data.response?.items;
    if (res.ok && Array.isArray(items)) {
      return {
        unavailable: false,
        games: items
          .map((item) => ({
            appid: Number(item.appid),
            name: null as string | null,
            priority:
              item.priority != null && Number.isFinite(item.priority)
                ? Number(item.priority)
                : null,
            dateAdded:
              item.date_added != null &&
              Number.isFinite(Number(item.date_added)) &&
              Number(item.date_added) > 0
                ? Number(item.date_added)
                : null,
          }))
          .filter((g) => Number.isFinite(g.appid) && g.appid > 0),
      };
    }
  } catch {
    // fallback tienda
  }

  const games: SteamWishlistGame[] = [];
  try {
    for (let page = 0; page < 25; page += 1) {
      const url = new URL(
        `https://store.steampowered.com/wishlist/profiles/${steamId64}/wishlistdata/`,
      );
      url.searchParams.set("p", String(page));
      url.searchParams.set("v", "2");

      const res = await fetch(url.toString(), {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        if (page === 0) return { games: [], unavailable: true };
        break;
      }

      const text = (await res.text()).trim();
      if (!text || text === "[]" || text === "{}") {
        if (page === 0 && text === "{}") {
          // Vacía o privada: Steam a veces responde {}
          return { games: [], unavailable: false };
        }
        break;
      }

      let data: unknown;
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        if (page === 0) return { games: [], unavailable: true };
        break;
      }

      if (!data || typeof data !== "object" || Array.isArray(data)) {
        break;
      }

      const entries = Object.entries(data as Record<string, unknown>);
      if (entries.length === 0) break;

      for (const [appidRaw, info] of entries) {
        const appid = Number(appidRaw);
        if (!Number.isFinite(appid) || appid <= 0) continue;
        const row =
          info && typeof info === "object"
            ? (info as {
                name?: string;
                priority?: number;
                added?: number;
                date_added?: number;
              })
            : {};
        const addedRaw = row.added ?? row.date_added;
        games.push({
          appid,
          name: typeof row.name === "string" ? row.name : null,
          priority:
            row.priority != null && Number.isFinite(Number(row.priority))
              ? Number(row.priority)
              : null,
          dateAdded:
            addedRaw != null &&
            Number.isFinite(Number(addedRaw)) &&
            Number(addedRaw) > 0
              ? Number(addedRaw)
              : null,
        });
      }
    }

    return { games, unavailable: false };
  } catch {
    return { games: [], unavailable: true };
  }
}
