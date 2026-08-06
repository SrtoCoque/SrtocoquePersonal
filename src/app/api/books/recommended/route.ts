import { NextRequest, NextResponse } from "next/server";
import { searchRecommendedBooks } from "@/lib/google-books";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const limitParam = Number(sp.get("limit") ?? "16");
  const limit = Number.isFinite(limitParam)
    ? Math.min(40, Math.max(1, limitParam))
    : 16;

  const authors = (sp.get("authors") ?? "")
    .split("|||")
    .map((a) => a.trim())
    .filter(Boolean);

  const exclude = (sp.get("exclude") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const excludeTitles = (sp.get("titles") ?? "")
    .split("|||")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!authors.length) {
    return NextResponse.json({ results: [], authors: [] });
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
    const results = await searchRecommendedBooks({
      authors,
      excludeIds: exclude,
      excludeTitles,
      limit,
    });
    return NextResponse.json({ results, authors });
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
