import { NextRequest, NextResponse } from "next/server";
import { searchComicVolumes } from "@/lib/comicvine";

const MISSING_KEY =
  "Falta COMICVINE_API_KEY en .env.local. Crea una clave en https://comicvine.gamespot.com/api/";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitParam)
    ? Math.min(60, Math.max(1, limitParam))
    : 20;

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  if (!process.env.COMICVINE_API_KEY) {
    return NextResponse.json({ error: MISSING_KEY }, { status: 503 });
  }

  try {
    const results = await searchComicVolumes(q, limit);
    return NextResponse.json({ results });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al buscar cómics",
      },
      { status: 502 },
    );
  }
}
