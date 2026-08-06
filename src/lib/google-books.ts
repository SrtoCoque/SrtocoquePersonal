import type { GoogleBookResult } from "@/lib/types";

type GoogleBooksVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    pageCount?: number;
    publishedDate?: string;
    description?: string;
    language?: string;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
};

type GoogleBooksResponse = {
  items?: GoogleBooksVolume[];
  error?: {
    code?: number;
    message?: string;
  };
};

const NON_FICTION_NOISE =
  /\b(erosion|wildlife|refuge|gazette|chronology|formation processes|resources|wave height|geological|geology|hydrology|sediment|coastal engineering|malheur|harney county|oregon|proceedings|symposium|thesis|dissertation|journal of|moorland|activity book|botanical)\b/i;

const FICTION_HINT =
  /\b(fiction|fantasy|science fiction|sci-fi|novel|novela|fantasia|literatura)\b/i;

function upgradeCoverUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace("http:", "https:").replace("&edge=curl", "");
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeQueryTerm(term: string) {
  return term.replace(/"/g, "");
}

async function fetchGoogleBooks(
  url: string,
  retries = 3,
): Promise<GoogleBooksResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as GoogleBooksResponse;
      const message = data.error?.message ?? "";
      const transient =
        res.status === 503 ||
        res.status === 429 ||
        /temporarily unavailable|rateLimitExceeded|quota/i.test(message);

      if (res.ok && !data.error) return data;

      lastError = new Error(message || `Google Books HTTP ${res.status}`);
      if (!transient || attempt === retries - 1) throw lastError;

      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Error de red");
      if (attempt === retries - 1) throw lastError;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("No se pudo buscar en Google Books");
}

function mapVolume(item: GoogleBooksVolume): GoogleBookResult & {
  _score: number;
} {
  const info = item.volumeInfo ?? {};
  const title = info.title ?? "Sin título";
  const authors = info.authors ?? [];
  const categories = info.categories ?? [];
  const ratingsCount = info.ratingsCount ?? 0;
  const averageRating = info.averageRating ?? 0;
  const coverUrl = upgradeCoverUrl(
    info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail,
  );
  const hasIsbn = (info.industryIdentifiers ?? []).some((id) =>
    /isbn/i.test(id.type),
  );

  return {
    googleBooksId: item.id,
    title,
    authors: authors.length ? authors : ["Autor desconocido"],
    coverUrl,
    totalPages: info.pageCount ?? null,
    publishedDate: info.publishedDate,
    description: info.description,
    categories,
    language: info.language,
    ratingsCount,
    averageRating,
    hasIsbn,
    _score: 0,
  };
}

function scoreResult(
  book: ReturnType<typeof mapVolume>,
  query: string,
): number {
  const q = normalize(query);
  const title = normalize(book.title);
  const authors = normalize(book.authors.join(" "));
  const cats = normalize((book.categories ?? []).join(" "));
  const tokens = q.split(" ").filter((t) => t.length > 1);

  let score = 0;

  if (title === q) score += 1200;
  else if (title.startsWith(q)) score += 700;
  else if (title.includes(` ${q} `) || title.includes(q)) score += 350;

  const matchedTokens = tokens.filter((t) => title.includes(t)).length;
  score += matchedTokens * 80;
  if (tokens.length && matchedTokens === tokens.length) score += 150;

  if (authors.includes(q) || tokens.some((t) => authors.includes(t))) {
    score += 200;
  }

  score += Math.min(400, Math.log10((book.ratingsCount ?? 0) + 1) * 180);
  score += (book.averageRating ?? 0) * 25;

  if (book.coverUrl) score += 120;
  if (book.hasIsbn) score += 80;
  if (book.authors[0] !== "Autor desconocido") score += 60;

  const pages = book.totalPages;
  if (pages && pages >= 80 && pages <= 1200) score += 70;
  else if (pages && pages > 2000) score -= 40;
  else if (pages && pages < 30) score -= 50;

  if (FICTION_HINT.test(cats)) score += 180;
  if (NON_FICTION_NOISE.test(book.title) || NON_FICTION_NOISE.test(cats)) {
    score -= 500;
  }

  // Sin señales de popularidad ni portada: probablemente ruido
  if (!book.coverUrl && (book.ratingsCount ?? 0) === 0) score -= 200;

  return score;
}

function buildSearchQueries(raw: string): string[] {
  const trimmed = escapeQueryTerm(raw.trim());
  if (!trimmed) return [];

  // Prioriza coincidencia en título; mantiene también búsqueda libre
  return [`intitle:${trimmed}`, trimmed];
}

export async function searchGoogleBooks(
  query: string,
  maxResults = 8,
): Promise<GoogleBookResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const fetchLimit = Math.min(40, Math.max(maxResults, 20));
  const queries = buildSearchQueries(trimmed);

  const batches = await Promise.all(
    queries.map(async (q) => {
      const params = new URLSearchParams({
        q,
        maxResults: String(fetchLimit),
        printType: "books",
        orderBy: "relevance",
      });
      if (apiKey) params.set("key", apiKey);

      const data = await fetchGoogleBooks(
        `https://www.googleapis.com/books/v1/volumes?${params.toString()}`,
      );
      return data.items ?? [];
    }),
  );

  const byId = new Map<string, ReturnType<typeof mapVolume>>();
  for (const item of batches.flat()) {
    if (!byId.has(item.id)) byId.set(item.id, mapVolume(item));
  }

  const ranked = [...byId.values()]
    .map((book) => ({
      ...book,
      _score: scoreResult(book, trimmed),
    }))
    .filter((book) => book._score > -100)
    .sort((a, b) => b._score - a._score)
    .slice(0, maxResults);

  return ranked.map(({ _score: _ignored, hasIsbn: _isbn, ...book }) => book);
}
