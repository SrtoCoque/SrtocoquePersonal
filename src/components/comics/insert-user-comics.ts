import { createClient } from "@/lib/supabase/client";
import type { ComicStatus, ComicVineVolume } from "@/lib/types";
import {
  fetchVolumeIssues,
  issueToMark,
  type PendingIssueMark,
} from "@/components/comics/comics-issues-picker";

export function todayReadAt(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Inserta el cómic; Leído marca todos los números, Leyendo solo los marcados. */
export async function insertUserComic(opts: {
  userId: string;
  comic: ComicVineVolume;
  status: ComicStatus;
  markedIssues?: PendingIssueMark[];
}): Promise<{ error: string | null }> {
  const { userId, comic, status, markedIssues = [] } = opts;
  const supabase = createClient();

  let issues = comic.issues ?? [];
  if (status === "read" && issues.length === 0 && comic.comicvineId) {
    issues = await fetchVolumeIssues(comic.comicvineId);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("user_comics")
    .insert({
      user_id: userId,
      comicvine_id: comic.comicvineId,
      title: comic.title,
      publisher: comic.publisher,
      cover_url: comic.coverUrl,
      start_year: comic.startYear,
      issue_count: issues.length > 0 ? issues.length : comic.issueCount,
      description: comic.description,
      status,
      score: null,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      error: insertError?.message.includes("user_comics")
        ? "Falta actualizar Supabase. Ejecuta supabase/schema-comics.sql"
        : (insertError?.message ?? "No se pudo guardar"),
    };
  }

  const comicId = inserted.id as string;

  const toMark =
    status === "read"
      ? issues.map(issueToMark)
      : status === "reading"
        ? markedIssues
        : [];

  if (toMark.length > 0) {
    const err = await upsertReadIssues(userId, comicId, toMark);
    if (err) return { error: err };
  }

  return { error: null };
}

export async function upsertReadIssues(
  userId: string,
  userComicId: string,
  issues: PendingIssueMark[],
): Promise<string | null> {
  if (issues.length === 0) return null;
  const supabase = createClient();
  const readAt = todayReadAt();

  const rows = issues.map((issue) => {
    const price =
      issue.price != null && Number.isFinite(issue.price) && issue.price >= 0
        ? Math.round(Number(issue.price) * 100) / 100
        : null;
    return {
      user_comic_id: userComicId,
      user_id: userId,
      comicvine_issue_id: issue.comicvineId,
      issue_number: issue.issueNumber,
      name: issue.name,
      cover_url: issue.coverUrl,
      read_at: readAt,
      price,
      purchased_at: price != null ? readAt : null,
    };
  });

  const { error } = await supabase.from("user_comic_issues").upsert(rows, {
    onConflict: "user_comic_id,comicvine_issue_id",
    ignoreDuplicates: true,
  });

  if (!error) return null;
  if (
    error.message.includes("price") ||
    error.message.includes("purchased_at")
  ) {
    return "Falta actualizar Supabase. Ejecuta supabase/migrate-comics-issue-price.sql";
  }
  if (error.message.includes("user_comic_issues")) {
    return "Falta actualizar Supabase. Ejecuta supabase/schema-comics.sql";
  }
  return error.message;
}
