import { NextRequest, NextResponse } from "next/server";
import { discoverRecommendedMovies } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limitParam = Number(sp.get("limit") ?? "16");
  const limit = Number.isFinite(limitParam)
    ? Math.min(40, Math.max(1, limitParam))
    : 16;

  const genres = (sp.get("genres") ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  const exclude = (sp.get("exclude") ?? "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id));

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
    const results = await discoverRecommendedMovies({
      genreNames: genres,
      excludeIds: exclude,
      limit,
    });
    return NextResponse.json({ results, genres });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener recomendaciones",
      },
      { status: 502 },
    );
  }
}
