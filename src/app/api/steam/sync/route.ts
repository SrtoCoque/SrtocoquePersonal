import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSteamCredentials } from "@/lib/steam";
import { syncSteamLibraryForUser } from "@/lib/steam-sync";

export const maxDuration = 120;

/** Auto-sync al entrar: como máximo 1 vez por hora. */
const AUTO_SYNC_MIN_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
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
    .select("steam_id, steam_synced_at")
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

  const url = new URL(request.url);
  const isAuto = url.searchParams.get("auto") === "1";
  const syncedAt = profile?.steam_synced_at ?? null;

  if (isAuto && syncedAt) {
    const t = Date.parse(syncedAt);
    if (Number.isFinite(t) && Date.now() - t < AUTO_SYNC_MIN_MS) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "synced_within_hour",
        syncedAt,
        totalSteam: 0,
        created: 0,
        updated: 0,
        matched: 0,
        unmatched: 0,
        wishlistTotal: 0,
        wishlistCreated: 0,
        wishlistSkipped: 0,
        wishlistUnavailable: false,
      });
    }
  }

  const result = await syncSteamLibraryForUser(supabase, {
    userId: user.id,
    steamId,
    lastSyncedAt: syncedAt,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
