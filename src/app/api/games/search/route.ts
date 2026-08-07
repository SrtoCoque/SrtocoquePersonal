import { NextRequest, NextResponse } from "next/server";
import { hasIgdbCredentials, searchIgdbGames } from "@/lib/igdb";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "8");
  const limit = Number.isFinite(limitParam)
    ? Math.min(40, Math.max(1, limitParam))
    : 8;

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  if (!hasIgdbCredentials()) {
    return NextResponse.json(
      {
        error:
          "Faltan IGDB_CLIENT_ID e IGDB_CLIENT_SECRET en .env.local. Crea una app Confidential en https://dev.twitch.tv/console (sirve para IGDB).",
      },
      { status: 503 },
    );
  }

  try {
    const results = await searchIgdbGames(q, limit);
    return NextResponse.json({ results });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al buscar videojuegos",
      },
      { status: 502 },
    );
  }
}
