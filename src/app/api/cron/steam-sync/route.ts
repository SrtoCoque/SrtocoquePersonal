import { NextResponse } from "next/server";
import { createAdminClient, hasAdminCredentials } from "@/lib/supabase/admin";
import { hasSteamCredentials } from "@/lib/steam";
import { syncSteamLibraryForUser } from "@/lib/steam-sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Solo sincroniza si lleva ≥20 h sin sync (evita picar dos veces el mismo día). */
const STALE_MS = 20 * 60 * 60 * 1000;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Cron diario: sincroniza Steam de todos los perfiles vinculados.
 * Vercel Cron envía Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!hasSteamCredentials()) {
    return NextResponse.json(
      { error: "Falta STEAM_WEB_API_KEY" },
      { status: 503 },
    );
  }

  if (!hasAdminCredentials()) {
    return NextResponse.json(
      {
        error:
          "Falta SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role)",
      },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, steam_id, steam_synced_at")
    .not("steam_id", "is", null);

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("steam_id")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-steam-link.sql"
          : error.message,
      },
      { status: 500 },
    );
  }

  const now = Date.now();
  const candidates = (profiles ?? []).filter((p) => {
    if (!p.steam_id) return false;
    if (!p.steam_synced_at) return true;
    const t = Date.parse(p.steam_synced_at);
    if (!Number.isFinite(t)) return true;
    return now - t >= STALE_MS;
  });

  const results: Array<{
    userId: string;
    ok: boolean;
    error?: string;
    created?: number;
    updated?: number;
  }> = [];

  for (const profile of candidates) {
    const result = await syncSteamLibraryForUser(admin, {
      userId: profile.id,
      steamId: profile.steam_id as string,
      lastSyncedAt: profile.steam_synced_at ?? null,
    });
    if (result.ok) {
      results.push({
        userId: profile.id,
        ok: true,
        created: result.created,
        updated: result.updated,
      });
    } else {
      results.push({
        userId: profile.id,
        ok: false,
        error: result.error,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    considered: candidates.length,
    linked: profiles?.length ?? 0,
    synced: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
