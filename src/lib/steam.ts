/** Cliente Steam Web API (server-only). */

export type SteamOwnedGame = {
  appid: number;
  name: string;
  playtimeForeverMinutes: number;
  imgIconUrl: string | null;
};

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
    imgIconUrl: g.img_icon_url
      ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
      : null,
  }));
}

export type SteamStoreDetails = {
  appid: number;
  name: string;
  coverUrl: string | null;
  /** Precio actual en Steam (€), null si gratis / no disponible */
  priceEur: number | null;
};

/** Metadatos básicos de la tienda Steam (nombre + portada + precio). */
export async function fetchSteamStoreDetails(
  steamAppIds: number[],
): Promise<Map<number, SteamStoreDetails>> {
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

          result.set(appid, {
            appid,
            name: entry.data.name.trim(),
            coverUrl:
              entry.data.header_image?.trim() ||
              entry.data.capsule_image?.trim() ||
              null,
            priceEur,
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
};

export type SteamWishlistResult = {
  games: SteamWishlistGame[];
  /** true si no se pudo leer (privada / error) */
  unavailable: boolean;
};

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
            ? (info as { name?: string; priority?: number })
            : {};
        games.push({
          appid,
          name: typeof row.name === "string" ? row.name : null,
          priority:
            row.priority != null && Number.isFinite(Number(row.priority))
              ? Number(row.priority)
              : null,
        });
      }
    }

    return { games, unavailable: false };
  } catch {
    return { games: [], unavailable: true };
  }
}
