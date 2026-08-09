import { NextRequest, NextResponse } from "next/server";
import { getComicVolumeDetails } from "@/lib/comicvine";

const MISSING_KEY =
  "Falta COMICVINE_API_KEY en .env.local. Crea una clave en https://comicvine.gamespot.com/api/";

export async function GET(request: NextRequest) {
  const idParam = request.nextUrl.searchParams.get("id");
  const volumeId = Number(idParam);
  const withIssues =
    request.nextUrl.searchParams.get("issues") !== "0";

  if (!idParam || !Number.isFinite(volumeId) || volumeId <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  if (!process.env.COMICVINE_API_KEY) {
    return NextResponse.json({ error: MISSING_KEY }, { status: 503 });
  }

  try {
    const comic = await getComicVolumeDetails(volumeId, { withIssues });
    return NextResponse.json({ comic });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener detalle del cómic",
      },
      { status: 502 },
    );
  }
}
