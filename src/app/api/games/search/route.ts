import { NextRequest, NextResponse } from "next/server";
import { searchRawgGames } from "@/lib/rawg";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "8");
  const limit = Number.isFinite(limitParam)
    ? Math.min(40, Math.max(1, limitParam))
    : 8;

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  if (!process.env.RAWG_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Falta RAWG_API_KEY en .env.local. Crea una clave en https://rawg.io/apidocs",
      },
      { status: 503 },
    );
  }

  try {
    const results = await searchRawgGames(q, limit);
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
