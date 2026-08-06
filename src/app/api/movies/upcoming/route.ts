import { NextRequest, NextResponse } from "next/server";
import { fetchUpcomingTheatricalMovies } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limitParam = Number(sp.get("limit") ?? "16");
  const limit = Number.isFinite(limitParam)
    ? Math.min(40, Math.max(1, limitParam))
    : 16;

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
    const results = await fetchUpcomingTheatricalMovies({ limit });
    return NextResponse.json({ results });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener próximos estrenos",
      },
      { status: 502 },
    );
  }
}
