import { NextRequest, NextResponse } from "next/server";
import { searchGoogleBooks } from "@/lib/google-books";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "8");
  const limit = Number.isFinite(limitParam)
    ? Math.min(40, Math.max(1, limitParam))
    : 8;

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  if (!process.env.GOOGLE_BOOKS_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Falta GOOGLE_BOOKS_API_KEY en .env.local. Crea una clave en Google Cloud Console.",
      },
      { status: 503 },
    );
  }

  try {
    const results = await searchGoogleBooks(q, limit);
    return NextResponse.json({ results });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error al buscar libros",
      },
      { status: 502 },
    );
  }
}
