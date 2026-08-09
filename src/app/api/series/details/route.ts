import { NextRequest, NextResponse } from "next/server";
import { getTmdbTvDetails } from "@/lib/tmdb-tv";

export async function GET(request: NextRequest) {
  const idParam = request.nextUrl.searchParams.get("id");
  const tmdbId = Number(idParam);

  if (!idParam || !Number.isFinite(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
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
    const series = await getTmdbTvDetails(tmdbId);
    return NextResponse.json({ series });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener detalle de serie",
      },
      { status: 502 },
    );
  }
}
