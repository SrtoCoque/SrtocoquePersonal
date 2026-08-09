import { NextRequest, NextResponse } from "next/server";
import { getTmdbTvSeason } from "@/lib/tmdb-tv";

export async function GET(request: NextRequest) {
  const idParam = request.nextUrl.searchParams.get("id");
  const seasonParam = request.nextUrl.searchParams.get("season");
  const tmdbId = Number(idParam);
  const season = Number(seasonParam);

  if (!idParam || !Number.isFinite(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  if (
    seasonParam == null ||
    !Number.isFinite(season) ||
    season < 0 ||
    !Number.isInteger(season)
  ) {
    return NextResponse.json({ error: "season inválida" }, { status: 400 });
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
    const seasonData = await getTmdbTvSeason(tmdbId, season);
    return NextResponse.json({ season: seasonData });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener temporada",
      },
      { status: 502 },
    );
  }
}
