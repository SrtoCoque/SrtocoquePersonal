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
  const url = new URL(
    "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
  );
  url.searchParams.set("key", key);
  url.searchParams.set("steamid", steamId64);
  url.searchParams.set("include_appinfo", "1");
  url.searchParams.set("include_played_free_games", "1");
  url.searchParams.set("format", "json");

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

export function steamMinutesToHours(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.round((minutes / 60) * 10) / 10;
}
