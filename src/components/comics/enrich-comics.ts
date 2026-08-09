import type { ComicVineVolume } from "@/lib/types";

/** Enriquece con el detalle de Comic Vine (incluye números). Si falla, deja el base. */
export async function enrichComicVolume(
  comic: ComicVineVolume,
): Promise<ComicVineVolume> {
  try {
    const res = await fetch(`/api/comics/details?id=${comic.comicvineId}`);
    const data = (await res.json()) as {
      comic?: ComicVineVolume;
      error?: string;
    };
    if (!res.ok || !data.comic) return comic;
    return {
      ...comic,
      ...data.comic,
      coverUrl: data.comic.coverUrl ?? comic.coverUrl,
      title: data.comic.title || comic.title,
      issues: data.comic.issues ?? comic.issues,
    };
  } catch {
    return comic;
  }
}
