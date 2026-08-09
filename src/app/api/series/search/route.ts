import { NextRequest, NextResponse } from "next/server";
import { searchTmdbTv } from "@/lib/tmdb-tv";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "8");
  const limit = Number.isFinite(limitParam)
    ? Math.min(40, Math.max(1, limitParam))
    : 8;

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  if (!process.env.TMDB_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Falta TMDB_API_KEY en .env.local. Crea una clave en https://www.themoviedb.org/settings/api",
      },
      { status: 503 },
    );
  }

  try {
    const results = await searchTmdbTv(q, limit);
    return NextResponse.json({ results });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al buscar series",
      },
      { status: 502 },
    );
  }
}
