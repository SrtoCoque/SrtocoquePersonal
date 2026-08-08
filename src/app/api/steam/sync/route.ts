import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchIgdbGamesBySteamAppIds, hasIgdbCredentials } from "@/lib/igdb";
import { allocateSteamHours } from "@/lib/steam-hours";
import {
  fetchSteamOwnedGames,
  hasSteamCredentials,
  steamMinutesToHours,
} from "@/lib/steam";
import type { UserGame, UserGamePlaythrough } from "@/lib/types";

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

export const maxDuration = 60;

export async function POST() {
  if (!hasSteamCredentials()) {
    return NextResponse.json(
      {
        error:
          "Falta STEAM_WEB_API_KEY. Consíguela en https://steamcommunity.com/dev/apikey",
      },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("steam_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      {
        error: profileError.message.includes("steam_id")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-steam-link.sql"
          : profileError.message,
      },
      { status: 500 },
    );
  }

  const steamId = profile?.steam_id;
  if (!steamId) {
    return NextResponse.json(
      { error: "Primero vincula tu cuenta de Steam" },
      { status: 400 },
    );
  }

  try {
    const steamGames = await fetchSteamOwnedGames(steamId);
    const [{ data: existingRows }, { data: playthroughRows }] =
      await Promise.all([
        supabase.from("user_games").select("*").eq("user_id", user.id),
        supabase
          .from("user_game_playthroughs")
          .select("*")
          .eq("user_id", user.id),
      ]);

    const existing = (existingRows as UserGame[]) ?? [];
    const playthroughsByGame = new Map<string, UserGamePlaythrough[]>();
    for (const p of (playthroughRows as UserGamePlaythrough[]) ?? []) {
      const list = playthroughsByGame.get(p.user_game_id) ?? [];
      list.push(p);
      playthroughsByGame.set(p.user_game_id, list);
    }

    const bySteamApp = new Map<number, UserGame>();
    const byRawg = new Map<number, UserGame>();
    for (const g of existing) {
      if (g.steam_app_id != null) bySteamApp.set(g.steam_app_id, g);
      if (g.rawg_id != null) byRawg.set(g.rawg_id, g);
    }

    const igdbBySteam = hasIgdbCredentials()
      ? await fetchIgdbGamesBySteamAppIds(steamGames.map((g) => g.appid))
      : new Map();

    let created = 0;
    let updated = 0;
    let matched = 0;
    let unmatched = 0;

    for (const steamGame of steamGames) {
      const steamHours = steamMinutesToHours(steamGame.playtimeForeverMinutes);
      const igdb = igdbBySteam.get(steamGame.appid) ?? null;
      if (igdb) matched += 1;
      else unmatched += 1;

      const existingGame =
        bySteamApp.get(steamGame.appid) ??
        (igdb ? byRawg.get(igdb.rawgId) : undefined);

      if (existingGame) {
        const storefronts = new Set(
          normalizeStorefronts(existingGame.storefronts),
        );
        storefronts.add("steam");
        const steamOnly = [...storefronts].every((s) => s === "steam");
        const pts = playthroughsByGame.get(existingGame.id) ?? [];

        const allocation = allocateSteamHours({
          status: existingGame.status,
          steamHours,
          currentHours: Number(existingGame.hours_played) || 0,
          playStorefront: existingGame.play_storefront,
          playthroughs: pts.map((p) => ({
            id: p.id,
            kind: p.kind,
            hours_played: Number(p.hours_played) || 0,
            created_at: p.created_at,
            storefront: p.storefront ?? null,
          })),
          steamOnly,
        });

        if (allocation.playthroughUpdate) {
          const { error: ptError } = await supabase
            .from("user_game_playthroughs")
            .update({
              hours_played: allocation.playthroughUpdate.hours_played,
            })
            .eq("id", allocation.playthroughUpdate.id);
          if (!ptError) {
            const list = playthroughsByGame.get(existingGame.id) ?? [];
            playthroughsByGame.set(
              existingGame.id,
              list.map((p) =>
                p.id === allocation.playthroughUpdate!.id
                  ? {
                      ...p,
                      hours_played: allocation.playthroughUpdate!.hours_played,
                    }
                  : p,
              ),
            );
          }
        }

        const patch: Record<string, unknown> = {
          steam_app_id: steamGame.appid,
          storefronts: [...storefronts],
          steam_hours_played: allocation.steamSessionHours,
          play_storefront:
            existingGame.play_storefront ??
            (storefronts.size === 1 ? "steam" : existingGame.play_storefront),
        };
        if (allocation.updateMainHours && allocation.mainHours != null) {
          patch.hours_played = allocation.mainHours;
        }
        if (igdb && !existingGame.rawg_id) patch.rawg_id = igdb.rawgId;
        if (igdb && !existingGame.cover_url && igdb.coverUrl) {
          patch.cover_url = igdb.coverUrl;
        }
        if (
          igdb &&
          !(existingGame.developers?.length) &&
          igdb.developers.length
        ) {
          patch.developers = igdb.developers;
        }
        if (
          igdb &&
          !(existingGame.platforms?.length) &&
          igdb.platforms.length
        ) {
          patch.platforms = igdb.platforms;
        }
        if (igdb && existingGame.metacritic == null && igdb.metacritic != null) {
          patch.metacritic = igdb.metacritic;
        }

        const { error } = await supabase
          .from("user_games")
          .update(patch)
          .eq("id", existingGame.id);
        if (!error) {
          updated += 1;
          const merged = { ...existingGame, ...patch } as UserGame;
          bySteamApp.set(steamGame.appid, merged);
          if (merged.rawg_id != null) byRawg.set(merged.rawg_id, merged);
        } else if (error.message.includes("steam_hours_played")) {
          return NextResponse.json(
            {
              error:
                "Falta actualizar Supabase. Ejecuta supabase/migrate-game-steam-hours.sql",
            },
            { status: 500 },
          );
        }
        continue;
      }

      const insertRow = {
        user_id: user.id,
        rawg_id: igdb?.rawgId ?? null,
        steam_app_id: steamGame.appid,
        title: igdb?.title ?? steamGame.name,
        developers: igdb?.developers ?? [],
        cover_url: igdb?.coverUrl ?? null,
        platforms: igdb?.platforms?.length ? igdb.platforms : ["PC (Steam)"],
        storefronts: ["steam"],
        play_storefront: null as string | null,
        released: igdb?.released ?? null,
        metacritic: igdb?.metacritic ?? null,
        status: "owned" as const,
        hours_played: steamHours,
        steam_hours_played: steamHours,
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
      }
    }

    await supabase
      .from("profiles")
      .update({ steam_synced_at: new Date().toISOString() })
      .eq("id", user.id);

    return NextResponse.json({
      ok: true,
      totalSteam: steamGames.length,
      created,
      updated,
      matched,
      unmatched,
      syncedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Error al sincronizar Steam",
      },
      { status: 500 },
    );
  }
}
