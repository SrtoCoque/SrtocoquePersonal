import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchIgdbGamesBySteamAppIds, hasIgdbCredentials } from "@/lib/igdb";
import { allocateSteamHours } from "@/lib/steam-hours";
import {
  fetchSteamAchievementsSummary,
  fetchSteamOwnedGames,
  fetchSteamStoreDetails,
  fetchSteamWishlist,
  hasSteamCredentials,
  isPlaceholderSteamTitle,
  steamLastPlayedOn,
  steamMinutesToHours,
  wishlistDateAddedOn,
} from "@/lib/steam";
import { normalizeGamePrices } from "@/lib/game-prices";
import {
  applySteamHourAttribution,
  hoursCountedForStats,
} from "@/lib/game-hour-logs";
import type { UserGame } from "@/lib/types";
import { normalizeGameStatus } from "@/lib/types";

const STOREFRONTS = [
  "steam",
  "playstation",
  "xbox",
  "nintendo",
  "gog",
  "epic",
  "downloaded",
] as const;

function normalizeStorefronts(value: unknown): (typeof STOREFRONTS)[number][] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is (typeof STOREFRONTS)[number] =>
    (STOREFRONTS as readonly string[]).includes(String(v)),
  );
}

function mergeUniqueStrings(
  ...lists: Array<string[] | null | undefined>
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const raw of list ?? []) {
      const v = raw.trim();
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

function needsAchievementRefresh(game: UserGame): boolean {
  if (game.status === "wishlist") return false;
  if (game.steam_app_id == null) return false;
  const synced = game.steam_achievements_synced_at;
  if (!synced) return true;
  const t = Date.parse(synced);
  if (!Number.isFinite(t)) return true;
  // Re-sync logros como mucho 1 vez / 7 días
  return Date.now() - t > 7 * 24 * 60 * 60 * 1000;
}

export type SteamSyncSuccess = {
  ok: true;
  totalSteam: number;
  created: number;
  updated: number;
  matched: number;
  unmatched: number;
  wishlistTotal: number;
  wishlistCreated: number;
  wishlistSkipped: number;
  wishlistUnavailable: boolean;
  syncedAt: string;
};

export type SteamSyncFailure = {
  ok: false;
  error: string;
  /** HTTP sugerido para la API */
  status: number;
};

export type SteamSyncResult = SteamSyncSuccess | SteamSyncFailure;

/**
 * Sincroniza biblioteca + wishlist + horas Steam para un usuario.
 * `supabase` puede ser el cliente de sesión o el service role (cron).
 */
export async function syncSteamLibraryForUser(
  supabase: SupabaseClient,
  input: {
    userId: string;
    steamId: string;
    lastSyncedAt?: string | null;
  },
): Promise<SteamSyncResult> {
  if (!hasSteamCredentials()) {
    return {
      ok: false,
      status: 503,
      error:
        "Falta STEAM_WEB_API_KEY. Consíguela en https://steamcommunity.com/dev/apikey",
    };
  }

  const { userId, steamId } = input;
  const lastSteamSyncedAt = input.lastSyncedAt ?? null;

  try {
    const steamGames = await fetchSteamOwnedGames(steamId);
    const { data: existingRows } = await supabase
      .from("user_games")
      .select("*")
      .eq("user_id", userId);

    const existing = ((existingRows as UserGame[]) ?? []).map((g) => ({
      ...g,
      status: normalizeGameStatus(g.status),
    }));
    const bySteamApp = new Map<number, UserGame>();
    const byRawg = new Map<number, UserGame>();
    const byTitle = new Map<string, UserGame>();
    for (const g of existing) {
      if (g.steam_app_id != null) bySteamApp.set(g.steam_app_id, g);
      if (g.rawg_id != null) {
        const prev = byRawg.get(g.rawg_id);
        // Preferir la ficha ya vinculada a Steam si hay duplicados
        if (!prev || (prev.steam_app_id == null && g.steam_app_id != null)) {
          byRawg.set(g.rawg_id, g);
        }
      }
      const titleKey = g.title.trim().toLowerCase();
      if (titleKey) {
        const prev = byTitle.get(titleKey);
        if (!prev || (prev.steam_app_id == null && g.steam_app_id != null)) {
          byTitle.set(titleKey, g);
        }
      }
    }

    const wishlist = await fetchSteamWishlist(steamId);
    const wishlistUnavailable = wishlist.unavailable;

    const allSteamAppIds = [
      ...steamGames.map((g) => g.appid),
      ...wishlist.games.map((g) => g.appid),
      ...existing
        .filter(
          (g) =>
            g.steam_app_id != null &&
            (isPlaceholderSteamTitle(g.title) || !g.cover_url || !g.rawg_id),
        )
        .map((g) => g.steam_app_id as number),
    ];

    const igdbBySteam = hasIgdbCredentials()
      ? await fetchIgdbGamesBySteamAppIds(allSteamAppIds)
      : new Map();

    const wishlistAppIds = new Set(wishlist.games.map((g) => g.appid));

    const needsStore = [
      ...allSteamAppIds.filter((id) => {
        const igdb = igdbBySteam.get(id);
        const existingGame = bySteamApp.get(id);
        if (!igdb?.title) return true;
        if (existingGame && isPlaceholderSteamTitle(existingGame.title))
          return true;
        if (existingGame && !existingGame.cover_url && !igdb.coverUrl) return true;
        return false;
      }),
      ...wishlist.games.map((g) => g.appid),
    ];
    const storeBySteam = await fetchSteamStoreDetails(needsStore);

    let created = 0;
    let updated = 0;
    let matched = 0;
    let unmatched = 0;
    let wishlistCreated = 0;
    let wishlistSkipped = 0;

    function steamPricePatch(
      appid: number,
      currentPrices: unknown,
    ): Record<string, number> | null {
      const store = storeBySteam.get(appid);
      if (store?.priceEur == null) return null;
      const prices = normalizeGamePrices(currentPrices);
      if (prices.steam === store.priceEur) return null;
      return { ...prices, steam: store.priceEur };
    }

    function resolveMeta(appid: number, steamName?: string | null) {
      const igdb = igdbBySteam.get(appid) ?? null;
      const store = storeBySteam.get(appid) ?? null;
      return {
        igdb,
        store,
        title:
          igdb?.title ||
          store?.name ||
          steamName?.trim() ||
          `Steam ${appid}`,
        coverUrl: igdb?.coverUrl || store?.coverUrl || null,
        genres: mergeUniqueStrings(igdb?.genres, store?.genres),
        platforms: (() => {
          const merged = mergeUniqueStrings(igdb?.platforms, store?.platforms);
          return merged.length > 0 ? merged : ["PC (Steam)"];
        })(),
        metacritic: igdb?.metacritic ?? store?.metacritic ?? null,
        reviewPercent: store?.reviewPercent ?? null,
      };
    }

    function applyCatalogMeta(
      patch: Record<string, unknown>,
      game: UserGame,
      meta: ReturnType<typeof resolveMeta>,
    ) {
      if (isPlaceholderSteamTitle(game.title) || !game.title) {
        patch.title = meta.title;
      }
      if (!game.cover_url && meta.coverUrl) patch.cover_url = meta.coverUrl;
      if (meta.igdb && !game.rawg_id) patch.rawg_id = meta.igdb.rawgId;
      if (!(game.developers?.length) && meta.igdb?.developers?.length) {
        patch.developers = meta.igdb.developers;
      }

      const nextPlatforms = mergeUniqueStrings(game.platforms, meta.platforms);
      if (
        nextPlatforms.length > 0 &&
        nextPlatforms.join("|") !== (game.platforms ?? []).join("|")
      ) {
        patch.platforms = nextPlatforms;
      }

      const nextGenres = mergeUniqueStrings(game.genres, meta.genres);
      if (
        nextGenres.length > 0 &&
        nextGenres.join("|") !== (game.genres ?? []).join("|")
      ) {
        patch.genres = nextGenres;
      }

      if (game.metacritic == null && meta.metacritic != null) {
        patch.metacritic = meta.metacritic;
      }
      if (
        (game.steam_review_percent == null ||
          game.steam_review_percent === undefined) &&
        meta.reviewPercent != null
      ) {
        patch.steam_review_percent = meta.reviewPercent;
      } else if (
        meta.reviewPercent != null &&
        game.steam_review_percent !== meta.reviewPercent
      ) {
        patch.steam_review_percent = meta.reviewPercent;
      }
    }

    for (const steamGame of steamGames) {
      const steamHours = steamMinutesToHours(steamGame.playtimeForeverMinutes);
      const meta = resolveMeta(steamGame.appid, steamGame.name);
      const { igdb } = meta;
      if (igdb) matched += 1;
      else unmatched += 1;

      const existingGame =
        bySteamApp.get(steamGame.appid) ??
        (igdb ? byRawg.get(igdb.rawgId) : undefined) ??
        byTitle.get(meta.title.trim().toLowerCase());

      if (existingGame) {
        const storefronts = new Set(
          normalizeStorefronts(existingGame.storefronts),
        );
        storefronts.add("steam");
        const steamOnly = [...storefronts].every((s) => s === "steam");

        const statusForHours =
          existingGame.status === "wishlist" ? "owned" : existingGame.status;

        const allocation = allocateSteamHours({
          status: statusForHours,
          steamHours,
          currentHours: Number(existingGame.hours_played) || 0,
          playStorefront: existingGame.play_storefront,
          steamOnly,
        });

        const hoursBefore = hoursCountedForStats({
          ...existingGame,
          status: statusForHours,
        });

        const patch: Record<string, unknown> = {
          steam_app_id: steamGame.appid,
          storefronts: [...storefronts],
          steam_hours_played: allocation.steamSessionHours,
          steam_last_played_at: steamLastPlayedOn(steamGame.lastPlayedAt),
          play_storefront:
            existingGame.play_storefront ??
            (storefronts.size === 1 ? "steam" : existingGame.play_storefront),
        };
        if (existingGame.status === "wishlist") {
          patch.status = "owned";
        }
        if ((existingGame.status as string) === "replaying") {
          patch.status = "playing";
        }
        if (allocation.updateMainHours && allocation.mainHours != null) {
          patch.hours_played = allocation.mainHours;
        }
        if (isPlaceholderSteamTitle(existingGame.title) || !existingGame.title) {
          patch.title = meta.title;
        }
        if (!existingGame.cover_url && meta.coverUrl) {
          patch.cover_url = meta.coverUrl;
        }
        applyCatalogMeta(patch, existingGame, meta);

        const { error } = await supabase
          .from("user_games")
          .update(patch)
          .eq("id", existingGame.id);
        if (!error) {
          updated += 1;
          const merged = { ...existingGame, ...patch } as UserGame;
          bySteamApp.set(steamGame.appid, merged);
          if (merged.rawg_id != null) byRawg.set(merged.rawg_id, merged);

          const hoursAfter = hoursCountedForStats(merged);
          const { error: logError } = await applySteamHourAttribution(supabase, {
            userId,
            gameId: existingGame.id,
            hoursBefore,
            hoursAfter,
            lastSyncedAt: lastSteamSyncedAt,
            lastPlayedOn: steamLastPlayedOn(steamGame.lastPlayedAt),
            playtime2WeeksHours: steamMinutesToHours(
              steamGame.playtime2WeeksMinutes,
            ),
          });
          if (logError?.message.includes("user_game_hour_logs")) {
            return {
              ok: false,
              status: 500,
              error:
                "Falta actualizar Supabase. Ejecuta supabase/migrate-game-hour-logs.sql",
            };
          }
        } else if (error.message.includes("steam_last_played_at")) {
          return {
            ok: false,
            status: 500,
            error:
              "Falta actualizar Supabase. Ejecuta supabase/migrate-steam-last-played.sql",
          };
        } else if (error.message.includes("steam_hours_played")) {
          return {
            ok: false,
            status: 500,
            error:
              "Falta actualizar Supabase. Ejecuta supabase/migrate-game-steam-hours.sql",
          };
        }
        continue;
      }

      const insertRow = {
        user_id: userId,
        rawg_id: igdb?.rawgId ?? null,
        steam_app_id: steamGame.appid,
        title: meta.title,
        developers: igdb?.developers ?? [],
        cover_url: meta.coverUrl,
        platforms: meta.platforms.length ? meta.platforms : ["PC (Steam)"],
        genres: meta.genres,
        storefronts: ["steam"],
        play_storefront: null as string | null,
        released: igdb?.released ?? null,
        metacritic: meta.metacritic,
        steam_review_percent: meta.reviewPercent,
        status: "owned" as const,
        hours_played: steamHours,
        steam_hours_played: steamHours,
        steam_last_played_at: steamLastPlayedOn(steamGame.lastPlayedAt),
        prices: {},
        playtime_estimate: igdb?.playtimeEstimate ?? null,
        start_date: null,
        finish_date: null,
        rating: null,
      };

      const { data: inserted, error } = await supabase
        .from("user_games")
        .insert(insertRow)
        .select("*")
        .single();

      if (!error && inserted) {
        created += 1;
        const row = inserted as UserGame;
        bySteamApp.set(steamGame.appid, row);
        if (row.rawg_id != null) byRawg.set(row.rawg_id, row);

        if (steamHours > 0) {
          const { error: logError } = await applySteamHourAttribution(supabase, {
            userId,
            gameId: row.id,
            hoursBefore: 0,
            hoursAfter: steamHours,
            lastSyncedAt: null,
            lastPlayedOn: steamLastPlayedOn(steamGame.lastPlayedAt),
            playtime2WeeksHours: steamMinutesToHours(
              steamGame.playtime2WeeksMinutes,
            ),
          });
          if (logError?.message.includes("user_game_hour_logs")) {
            return {
              ok: false,
              status: 500,
              error:
                "Falta actualizar Supabase. Ejecuta supabase/migrate-game-hour-logs.sql",
            };
          }
        }
      } else if (error?.message.includes("steam_last_played_at")) {
        return {
          ok: false,
          status: 500,
          error:
            "Falta actualizar Supabase. Ejecuta supabase/migrate-steam-last-played.sql",
        };
      }
    }

    const wishlistNew = wishlist.games.filter((g) => !bySteamApp.has(g.appid));

    const { data: ignoredWishlistRows } = await supabase
      .from("user_steam_wishlist_ignored")
      .select("steam_app_id")
      .eq("user_id", userId);
    const ignoredWishlist = new Set(
      (ignoredWishlistRows ?? [])
        .map((r) => Number(r.steam_app_id))
        .filter((id) => Number.isFinite(id)),
    );

    for (const wish of wishlistNew) {
      if (ignoredWishlist.has(wish.appid)) {
        wishlistSkipped += 1;
        continue;
      }
      const meta = resolveMeta(wish.appid, wish.name);
      const { igdb } = meta;
      if (igdb) matched += 1;
      else unmatched += 1;

      if (igdb && byRawg.has(igdb.rawgId)) {
        const existingByRawg = byRawg.get(igdb.rawgId)!;
        if (!existingByRawg.steam_app_id) {
          await supabase
            .from("user_games")
            .update({ steam_app_id: wish.appid })
            .eq("id", existingByRawg.id);
        }
        wishlistSkipped += 1;
        continue;
      }

      const existingByTitle = byTitle.get(meta.title.trim().toLowerCase());
      if (existingByTitle) {
        if (!existingByTitle.steam_app_id) {
          await supabase
            .from("user_games")
            .update({ steam_app_id: wish.appid })
            .eq("id", existingByTitle.id);
          bySteamApp.set(wish.appid, {
            ...existingByTitle,
            steam_app_id: wish.appid,
          });
        }
        wishlistSkipped += 1;
        continue;
      }

      const steamPrices =
        meta.store?.priceEur != null ? { steam: meta.store.priceEur } : {};
      const addedOn = wishlistDateAddedOn(wish.dateAdded);

      const insertRow = {
        user_id: userId,
        rawg_id: igdb?.rawgId ?? null,
        steam_app_id: wish.appid,
        title: meta.title,
        developers: igdb?.developers ?? [],
        cover_url: meta.coverUrl,
        platforms: meta.platforms.length ? meta.platforms : ["PC (Steam)"],
        genres: meta.genres,
        storefronts: [] as string[],
        play_storefront: null as string | null,
        released: igdb?.released ?? null,
        metacritic: meta.metacritic,
        steam_review_percent: meta.reviewPercent,
        steam_wishlist_added_at: addedOn,
        status: "wishlist" as const,
        hours_played: 0,
        steam_hours_played: 0,
        prices: steamPrices,
        playtime_estimate: igdb?.playtimeEstimate ?? null,
        start_date: null,
        finish_date: null,
        rating: null,
      };

      const { data: inserted, error } = await supabase
        .from("user_games")
        .insert(insertRow)
        .select("*")
        .single();

      if (!error && inserted) {
        wishlistCreated += 1;
        const row = inserted as UserGame;
        bySteamApp.set(wish.appid, row);
        if (row.rawg_id != null) byRawg.set(row.rawg_id, row);
      }
    }

    for (const g of [...bySteamApp.values()]) {
      if (g.steam_app_id == null) continue;
      const meta = resolveMeta(
        g.steam_app_id,
        isPlaceholderSteamTitle(g.title) ? null : g.title,
      );
      const patch: Record<string, unknown> = {};
      applyCatalogMeta(patch, g, meta);
      if (g.status === "wishlist" || wishlistAppIds.has(g.steam_app_id)) {
        const nextPrices = steamPricePatch(g.steam_app_id, g.prices);
        if (nextPrices) patch.prices = nextPrices;
        const wish = wishlist.games.find((w) => w.appid === g.steam_app_id);
        const addedOn = wishlistDateAddedOn(wish?.dateAdded);
        if (addedOn && !g.steam_wishlist_added_at) {
          patch.steam_wishlist_added_at = addedOn;
        }
      }
      if (Object.keys(patch).length === 0) continue;
      const { error } = await supabase
        .from("user_games")
        .update(patch)
        .eq("id", g.id);
      if (!error) {
        updated += 1;
        bySteamApp.set(g.steam_app_id, { ...g, ...patch } as UserGame);
      } else if (
        error.message.includes("genres") ||
        error.message.includes("steam_review_percent") ||
        error.message.includes("steam_wishlist_added_at")
      ) {
        return {
          ok: false,
          status: 500,
          error:
            "Falta actualizar Supabase. Ejecuta supabase/migrate-game-steam-meta.sql",
        };
      }
    }

    // Logros Steam (lote pequeño; no bloquea si fallan)
    const achievementTargets = [...bySteamApp.values()]
      .filter((g) => needsAchievementRefresh(g) && g.steam_app_id != null)
      .slice(0, 40);

    for (let i = 0; i < achievementTargets.length; i += 4) {
      const chunk = achievementTargets.slice(i, i + 4);
      await Promise.all(
        chunk.map(async (g) => {
          const appid = g.steam_app_id!;
          const summary = await fetchSteamAchievementsSummary(steamId, appid);
          const patch: Record<string, unknown> = {
            steam_achievements_synced_at: new Date().toISOString(),
          };
          if (summary) {
            patch.steam_achievements_unlocked = summary.unlocked;
            patch.steam_achievements_total = summary.total;
          }
          await supabase.from("user_games").update(patch).eq("id", g.id);
        }),
      );
      if (i + 4 < achievementTargets.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    if (!wishlist.unavailable && wishlistNew.length === 0) {
      wishlistSkipped += wishlist.games.length;
    }

    const syncedAt = new Date().toISOString();
    await supabase
      .from("profiles")
      .update({ steam_synced_at: syncedAt })
      .eq("id", userId);

    return {
      ok: true,
      totalSteam: steamGames.length,
      created,
      updated,
      matched,
      unmatched,
      wishlistTotal: wishlist.games.length,
      wishlistCreated,
      wishlistSkipped,
      wishlistUnavailable,
      syncedAt,
    };
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error: e instanceof Error ? e.message : "Error al sincronizar Steam",
    };
  }
}
