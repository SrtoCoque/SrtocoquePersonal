import type { ComicVineIssue, ComicVineVolume } from "@/lib/types";

const API_BASE = "https://comicvine.gamespot.com/api";
/** Comic Vine bloquea peticiones sin un User-Agent propio y único. */
const USER_AGENT = "srtocoque-comics/1.0";
const ISSUES_PAGE_SIZE = 100;
/** Tope de páginas por volumen (evita volúmenes gigantes tipo Action Comics). */
const MAX_ISSUE_PAGES = 8;

type ComicVineImage = {
  icon_url?: string | null;
  tiny_url?: string | null;
  thumb_url?: string | null;
  small_url?: string | null;
  medium_url?: string | null;
  screen_url?: string | null;
  super_url?: string | null;
  original_url?: string | null;
};

type ComicVineVolumeRaw = {
  id?: number;
  name?: string | null;
  start_year?: string | number | null;
  count_of_issues?: number | null;
  publisher?: { name?: string | null } | null;
  image?: ComicVineImage | null;
  description?: string | null;
  deck?: string | null;
  site_detail_url?: string | null;
};

type ComicVineIssueRaw = {
  id?: number;
  name?: string | null;
  issue_number?: string | number | null;
  image?: ComicVineImage | null;
  cover_date?: string | null;
  volume?: { id?: number; name?: string | null } | null;
};

type ComicVineResponse<T> = {
  error?: string;
  status_code?: number;
  limit?: number;
  offset?: number;
  number_of_page_results?: number;
  number_of_total_results?: number;
  results?: T;
};

function apiKey(): string {
  const key = process.env.COMICVINE_API_KEY;
  if (!key) throw new Error("Falta COMICVINE_API_KEY");
  return key;
}

function imageUrl(image: ComicVineImage | null | undefined): string | null {
  if (!image) return null;
  const url =
    image.super_url ||
    image.original_url ||
    image.screen_url ||
    image.medium_url ||
    image.small_url ||
    image.thumb_url;
  if (!url) return null;
  // Comic Vine devuelve un placeholder cuando no hay portada real
  if (url.includes("blank.png") || url.includes("blank-")) return null;
  return url;
}

/** Comic Vine devuelve descripciones en HTML; para la ficha basta texto plano. */
function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

function toYear(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(String(value).slice(0, 4));
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchComicVine<T>(
  path: string,
  params: Record<string, string>,
  retries = 3,
): Promise<ComicVineResponse<T>> {
  const search = new URLSearchParams({
    api_key: apiKey(),
    format: "json",
    ...params,
  });
  const url = `${API_BASE}/${path}?${search.toString()}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      });

      if (res.status === 401 || res.status === 403) {
        throw new Error(
          "Comic Vine rechazó la petición (revisa COMICVINE_API_KEY)",
        );
      }

      if (!res.ok) {
        lastError = new Error(`Comic Vine HTTP ${res.status}`);
        if (attempt === retries - 1) throw lastError;
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }

      const data = (await res.json()) as ComicVineResponse<T>;
      if (data.status_code != null && data.status_code !== 1) {
        throw new Error(data.error || `Comic Vine error ${data.status_code}`);
      }
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("Error de red");
      const fatal =
        lastError.message.includes("COMICVINE_API_KEY") ||
        lastError.message.startsWith("Comic Vine error");
      if (fatal || attempt === retries - 1) throw lastError;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("No se pudo contactar con Comic Vine");
}

function mapVolume(raw: ComicVineVolumeRaw): ComicVineVolume {
  return {
    comicvineId: Number(raw.id),
    title: raw.name?.trim() || "Sin título",
    publisher: raw.publisher?.name?.trim() || null,
    coverUrl: imageUrl(raw.image),
    startYear: toYear(raw.start_year),
    issueCount:
      raw.count_of_issues != null && Number.isFinite(raw.count_of_issues)
        ? Math.max(0, Number(raw.count_of_issues))
        : null,
    description: stripHtml(raw.deck ?? raw.description),
    siteDetailUrl: raw.site_detail_url ?? null,
  };
}

function mapIssue(raw: ComicVineIssueRaw): ComicVineIssue | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const number =
    raw.issue_number != null ? String(raw.issue_number).trim() : null;
  return {
    comicvineId: id,
    issueNumber: number || null,
    name: raw.name?.trim() || null,
    coverUrl: imageUrl(raw.image),
    coverDate: raw.cover_date || null,
  };
}

/** Ordena por fecha de portada y, a igualdad, por número. */
function sortIssues(issues: ComicVineIssue[]): ComicVineIssue[] {
  return [...issues].sort((a, b) => {
    const da = a.coverDate ?? "";
    const db = b.coverDate ?? "";
    if (da !== db) {
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : 1;
    }
    const na = Number(a.issueNumber);
    const nb = Number(b.issueNumber);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return (a.issueNumber ?? "").localeCompare(b.issueNumber ?? "");
  });
}

function scoreVolume(volume: ComicVineVolume, query: string): number {
  const q = query.toLowerCase().trim();
  const title = volume.title.toLowerCase();
  let score = 0;

  if (title === q) score += 1000;
  else if (title.startsWith(q)) score += 600;
  else if (title.includes(q)) score += 300;

  if (volume.coverUrl) score += 80;
  score += Math.min(120, (volume.issueCount ?? 0) * 2);
  if (volume.startYear) score += Math.min(60, (volume.startYear - 1930) / 2);

  return score;
}

export async function searchComicVolumes(
  query: string,
  maxResults = 20,
): Promise<ComicVineVolume[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = Math.min(100, Math.max(maxResults, 20));
  // El endpoint de búsqueda es quisquilloso con field_list: pedimos todo.
  const data = await fetchComicVine<ComicVineVolumeRaw[]>("search/", {
    query: trimmed,
    resources: "volume",
    limit: String(limit),
  });

  return (data.results ?? [])
    .map(mapVolume)
    .filter((v) => Number.isFinite(v.comicvineId) && v.comicvineId > 0)
    .map((v) => ({ v, score: scoreVolume(v, trimmed) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ v }) => v);
}

/** Números de un volumen. Pagina de 100 en 100 hasta agotar o llegar al tope. */
export async function getComicVolumeIssues(
  volumeId: number,
): Promise<ComicVineIssue[]> {
  const out: ComicVineIssue[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_ISSUE_PAGES; page++) {
    const data = await fetchComicVine<ComicVineIssueRaw[]>("issues/", {
      filter: `volume:${volumeId}`,
      sort: "cover_date:asc",
      field_list: "id,name,issue_number,image,cover_date,volume",
      limit: String(ISSUES_PAGE_SIZE),
      offset: String(offset),
    });

    const batch = (data.results ?? [])
      .map(mapIssue)
      .filter((i): i is ComicVineIssue => i !== null);
    out.push(...batch);

    const total = data.number_of_total_results ?? out.length;
    offset += ISSUES_PAGE_SIZE;
    if (batch.length === 0 || offset >= total) break;
  }

  const unique = new Map<number, ComicVineIssue>();
  for (const issue of out) unique.set(issue.comicvineId, issue);
  return sortIssues([...unique.values()]);
}

export async function getComicVolumeDetails(
  volumeId: number,
  options: { withIssues?: boolean } = {},
): Promise<ComicVineVolume> {
  const { withIssues = true } = options;

  const data = await fetchComicVine<ComicVineVolumeRaw>(
    `volume/4050-${volumeId}/`,
    {
      field_list:
        "id,name,start_year,count_of_issues,publisher,image,deck,description,site_detail_url",
    },
  );

  if (!data.results) throw new Error("Volumen no encontrado en Comic Vine");
  const volume = mapVolume(data.results);

  if (!withIssues) return volume;

  const issues = await getComicVolumeIssues(volumeId);
  return {
    ...volume,
    issues,
    issueCount: issues.length > 0 ? issues.length : volume.issueCount,
    coverUrl: volume.coverUrl ?? issues[0]?.coverUrl ?? null,
  };
}
