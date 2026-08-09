import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchSteamPlayerAchievements,
  hasSteamCredentials,
} from "@/lib/steam";

export async function GET(request: NextRequest) {
  if (!hasSteamCredentials()) {
    return NextResponse.json(
      { error: "Falta STEAM_WEB_API_KEY" },
      { status: 503 },
    );
  }

  const appidRaw = request.nextUrl.searchParams.get("appid");
  const appid = Number(appidRaw);
  if (!Number.isFinite(appid) || appid <= 0) {
    return NextResponse.json({ error: "appid inválido" }, { status: 400 });
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
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const steamId = profile?.steam_id;
  if (!steamId) {
    return NextResponse.json(
      { error: "Vincula tu cuenta de Steam para ver logros" },
      { status: 400 },
    );
  }

  const detail = await fetchSteamPlayerAchievements(steamId, appid);
  if (!detail) {
    return NextResponse.json(
      {
        error:
          "No se pudieron cargar los logros (perfil privado, sin stats o el juego no tiene)",
        achievements: [],
        unlocked: 0,
        total: 0,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(detail);
}
