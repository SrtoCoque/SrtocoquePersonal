import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSteamCredentials, resolveSteamId64 } from "@/lib/steam";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("steam_id, steam_synced_at")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    configured: hasSteamCredentials(),
    steamId: profile?.steam_id ?? null,
    syncedAt: profile?.steam_synced_at ?? null,
  });
}

export async function POST(request: Request) {
  if (!hasSteamCredentials()) {
    return NextResponse.json(
      {
        error:
          "Falta STEAM_WEB_API_KEY en el servidor. Consíguela en https://steamcommunity.com/dev/apikey",
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

  const body = (await request.json().catch(() => null)) as {
    input?: string;
  } | null;
  const input = body?.input?.trim() ?? "";
  if (!input) {
    return NextResponse.json(
      { error: "Pega la URL de tu perfil Steam o el SteamID64" },
      { status: 400 },
    );
  }

  try {
    const steamId = await resolveSteamId64(input);
    const { error } = await supabase
      .from("profiles")
      .update({ steam_id: steamId })
      .eq("id", user.id);

    if (error) {
      const msg = error.message.includes("steam_id")
        ? "Falta actualizar Supabase. Ejecuta supabase/migrate-steam-link.sql"
        : error.message;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ steamId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo vincular Steam" },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ steam_id: null, steam_synced_at: null })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
