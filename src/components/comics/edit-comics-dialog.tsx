"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookMarked, Check, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ExpandableCover } from "@/components/comics/expandable-cover";
import { IssuePriceInline } from "@/components/comics/issue-price-inline";
import { upsertReadIssues } from "@/components/comics/insert-user-comics";
import { createClient } from "@/lib/supabase/client";
import type {
  ComicStatus,
  ComicVineIssue,
  UserComic,
  UserComicIssue,
} from "@/lib/types";
import {
  COMIC_STATUS_LABELS,
  comicDisplayStatus,
  deriveComicShelfStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  comic: UserComic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onDeleted: () => void;
};

export function EditComicsDialog({
  comic,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: Props) {
  const [status, setStatus] = useState<ComicStatus>("wishlist");
  const [score, setScore] = useState<number | "">("");
  const [issues, setIssues] = useState<ComicVineIssue[]>([]);
  const [readIssues, setReadIssues] = useState<UserComicIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyIssue, setBusyIssue] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);

  const readIds = useMemo(
    () => new Set(readIssues.map((r) => r.comicvine_issue_id)),
    [readIssues],
  );

  const readById = useMemo(() => {
    const map = new Map<number, UserComicIssue>();
    for (const r of readIssues) map.set(r.comicvine_issue_id, r);
    return map;
  }, [readIssues]);

  const totalSpent = useMemo(
    () =>
      readIssues.reduce(
        (sum, r) => sum + (r.price != null && Number.isFinite(r.price) ? Number(r.price) : 0),
        0,
      ),
    [readIssues],
  );

  const totalIssues =
    issues.length > 0 ? issues.length : (comic?.issue_count ?? 0);
  const readCount = readIssues.length;
  const displayStatus = comicDisplayStatus(status, readCount, totalIssues);

  const loadReadIssues = useCallback(
    async (comicId: string, userId: string) => {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_comic_issues")
        .select("*")
        .eq("user_comic_id", comicId)
        .eq("user_id", userId);
      const list = (data as UserComicIssue[]) ?? [];
      setReadIssues(list);
      return list;
    },
    [],
  );

  const syncShelfStatus = useCallback(
    async (
      comicId: string,
      nextRead: number,
      nextTotal: number,
      stored: ComicStatus,
    ) => {
      if (stored === "wishlist") return stored;
      const nextShelf = deriveComicShelfStatus(nextRead, nextTotal);
      if (nextShelf === stored) return stored;
      setStatus(nextShelf);
      const supabase = createClient();
      await supabase
        .from("user_comics")
        .update({ status: nextShelf })
        .eq("id", comicId);
      return nextShelf;
    },
    [],
  );

  useEffect(() => {
    if (!comic || !open) return;
    setStatus(comic.status);
    setScore(comic.score ?? "");
    setIssues([]);
    setError(null);
    setEditingScore(false);
    setEditingStatus(false);
    setLoadingIssues(true);

    let cancelled = false;
    void (async () => {
      const read = await loadReadIssues(comic.id, comic.user_id);
      if (!comic.comicvine_id) {
        if (!cancelled) setLoadingIssues(false);
        await syncShelfStatus(
          comic.id,
          read.length,
          comic.issue_count ?? 0,
          comic.status,
        );
        return;
      }
      try {
        const res = await fetch(`/api/comics/issues?id=${comic.comicvine_id}`);
        const data = (await res.json()) as {
          issues?: ComicVineIssue[];
          error?: string;
        };
        if (cancelled) return;
        const list = res.ok ? (data.issues ?? []) : [];
        setIssues(list);
        setLoadingIssues(false);

        const nextTotal = list.length > 0 ? list.length : comic.issue_count ?? 0;
        if (list.length > 0 && list.length !== comic.issue_count) {
          const supabase = createClient();
          await supabase
            .from("user_comics")
            .update({ issue_count: list.length })
            .eq("id", comic.id);
        }
        await syncShelfStatus(comic.id, read.length, nextTotal, comic.status);
      } catch {
        if (!cancelled) setLoadingIssues(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [comic, open, loadReadIssues, syncShelfStatus]);

  async function applyStatus(next: "wishlist" | "shelf") {
    if (!comic) return;
    setEditingStatus(false);

    const resolved =
      next === "wishlist"
        ? "wishlist"
        : deriveComicShelfStatus(readCount, totalIssues);

    setStatus(resolved);
    const supabase = createClient();
    await supabase
      .from("user_comics")
      .update({ status: resolved })
      .eq("id", comic.id);
    onSaved();
  }

  async function markIssues(list: ComicVineIssue[]) {
    if (!comic || list.length === 0) return;
    const toAdd = list.filter((i) => !readIds.has(i.comicvineId));
    if (toAdd.length === 0) return;

    setBusyIssue(true);
    setError(null);
    const err = await upsertReadIssues(
      comic.user_id,
      comic.id,
      toAdd.map((i) => ({
        comicvineId: i.comicvineId,
        issueNumber: i.issueNumber,
        name: i.name,
        coverUrl: i.coverUrl,
      })),
    );
    if (err) {
      setBusyIssue(false);
      setError(err);
      return;
    }
    const read = await loadReadIssues(comic.id, comic.user_id);
    await syncShelfStatus(
      comic.id,
      read.length,
      totalIssues,
      status === "wishlist" ? "reading" : status,
    );
    setBusyIssue(false);
    onSaved();
  }

  async function unmarkIssues(issueIds: number[]) {
    if (!comic || issueIds.length === 0) return;
    setBusyIssue(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("user_comic_issues")
      .delete()
      .eq("user_comic_id", comic.id)
      .in("comicvine_issue_id", issueIds);
    if (deleteError) {
      setBusyIssue(false);
      setError(deleteError.message);
      return;
    }
    const read = await loadReadIssues(comic.id, comic.user_id);
    await syncShelfStatus(comic.id, read.length, totalIssues, status);
    setBusyIssue(false);
    onSaved();
  }

  async function toggleIssue(issue: ComicVineIssue) {
    if (readIds.has(issue.comicvineId)) {
      await unmarkIssues([issue.comicvineId]);
    } else {
      await markIssues([issue]);
    }
  }

  async function saveIssuePrice(comicvineIssueId: number, priceRaw: string) {
    if (!comic) return;
    const trimmed = priceRaw.trim().replace(",", ".");
    let price: number | null = null;
    if (trimmed !== "") {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) {
        setError("El precio debe ser un número ≥ 0");
        return;
      }
      price = Math.round(n * 100) / 100;
    }
    const existing = readById.get(comicvineIssueId);
    const prevPrice =
      existing?.price != null ? String(existing.price) : "";
    const nextPrice = price == null ? "" : String(price);
    if (nextPrice === prevPrice) return;

    const purchased_at =
      price == null
        ? null
        : existing?.purchased_at?.slice(0, 10) ||
          new Date().toISOString().slice(0, 10);

    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("user_comic_issues")
      .update({ price, purchased_at })
      .eq("user_comic_id", comic.id)
      .eq("comicvine_issue_id", comicvineIssueId);

    if (updateError) {
      setError(
        updateError.message.includes("price") ||
          updateError.message.includes("purchased_at")
          ? "Falta actualizar Supabase. Ejecuta supabase/migrate-comics-issue-price.sql"
          : updateError.message,
      );
      return;
    }
    await loadReadIssues(comic.id, comic.user_id);
    onSaved();
  }

  async function toggleAll() {
    const allRead = issues.length > 0 && readCount >= issues.length;
    if (allRead) {
      await unmarkIssues(readIssues.map((r) => r.comicvine_issue_id));
    } else {
      await markIssues(issues);
    }
  }

  async function handleSave() {
    if (!comic) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("user_comics")
      .update({
        status,
        score: score === "" ? null : score,
      })
      .eq("id", comic.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onOpenChange(false);
    onSaved();
  }

  async function handleDelete() {
    if (!comic) return;
    if (!confirm(`¿Eliminar «${comic.title}»?`)) return;
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("user_comics")
      .delete()
      .eq("id", comic.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onOpenChange(false);
    onDeleted();
  }

  if (!comic) return null;

  const busy = saving || deleting || busyIssue;
  const allRead = issues.length > 0 && readCount >= issues.length;
  const progressPct =
    totalIssues > 0
      ? Math.min(100, Math.round((readCount / totalIssues) * 100))
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Editar cómic</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void handleSave();
          }}
        >
          <div className="flex gap-3">
            {comic.cover_url ? (
              <ExpandableCover
                src={comic.cover_url}
                alt={comic.title}
                thumbClassName="h-24 w-16 shrink-0 rounded-md"
                sizes="64px"
              />
            ) : (
              <div className="relative flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--surface-3)] text-[var(--muted)]">
                <BookMarked className="h-5 w-5 opacity-40" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{comic.title}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {[
                      comic.start_year ? String(comic.start_year) : null,
                      comic.publisher,
                      totalIssues > 0 ? `${totalIssues} núms.` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar cómic"
                  onClick={handleDelete}
                  disabled={busy}
                  className="shrink-0 text-[var(--danger)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {!editingStatus ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEditingStatus(true)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                      displayStatus === "wishlist"
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : displayStatus === "reading"
                          ? "border-violet-500/50 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                          : "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    <span>{COMIC_STATUS_LABELS[displayStatus]}</span>
                    {displayStatus !== "wishlist" && totalIssues > 0 ? (
                      <span className="tabular-nums opacity-80">
                        {readCount}/{totalIssues}
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void applyStatus("wishlist")}
                      className={cn(
                        "h-8 rounded-lg border px-2 text-xs font-medium",
                        displayStatus === "wishlist"
                          ? "border-amber-500 bg-amber-500/15"
                          : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                      )}
                    >
                      Wishlist
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void applyStatus("shelf")}
                      className={cn(
                        "h-8 rounded-lg border px-2 text-xs font-medium",
                        displayStatus !== "wishlist"
                          ? displayStatus === "reading"
                            ? "border-violet-500 bg-violet-500/15"
                            : "border-emerald-500 bg-emerald-500/15"
                          : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                      )}
                    >
                      Biblioteca
                      {totalIssues > 0
                        ? ` · ${COMIC_STATUS_LABELS[deriveComicShelfStatus(readCount, totalIssues)]}`
                        : ""}
                    </button>
                  </div>
                )}

                {!editingScore ? (
                  <button
                    type="button"
                    onClick={() => setEditingScore(true)}
                    className="inline-flex h-8 items-center rounded-lg border border-[var(--border)] px-2.5 text-xs font-medium tabular-nums hover:bg-[var(--surface-2)]"
                  >
                    {score === "" && comic.score == null
                      ? "Puntuación"
                      : `${score === "" ? comic.score : score}/100`}
                  </button>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    autoFocus
                    onBlur={() => setEditingScore(false)}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        setScore("");
                        return;
                      }
                      const n = Number(v);
                      if (!Number.isFinite(n)) return;
                      setScore(Math.min(100, Math.max(0, n)));
                    }}
                    className="h-8 w-20"
                    placeholder="0–100"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">Progreso</span>
              <span className="tabular-nums text-[var(--muted)]">
                {readCount}
                {totalIssues > 0 ? ` / ${totalIssues}` : ""} núms. ·{" "}
                {progressPct}%
                {totalSpent > 0
                  ? ` · ${totalSpent.toLocaleString("es-ES", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })} €`
                  : ""}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Números / tomos</Label>
              {issues.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant={allRead ? "ghost" : "secondary"}
                  className="h-8 gap-1.5"
                  disabled={busy}
                  onClick={() => void toggleAll()}
                  aria-pressed={allRead}
                >
                  {allRead ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                  {allRead ? "Ninguno" : "Todos"}
                </Button>
              ) : null}
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              Pincha el precio (o €) junto al nombre para editarlo
            </p>

            {loadingIssues ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
              </div>
            ) : issues.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--muted)]">
                {comic.comicvine_id
                  ? "Sin datos de números en Comic Vine"
                  : "Sin datos de números (falta comicvine_id)"}
              </p>
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto rounded-xl border border-[var(--border)] p-2">
                {issues.map((issue) => {
                  const seen = readIds.has(issue.comicvineId);
                  const row = readById.get(issue.comicvineId);
                  const cover = issue.coverUrl ?? comic.cover_url;
                  return (
                    <li
                      key={issue.comicvineId}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5",
                        seen && "bg-[var(--accent)]/10",
                      )}
                    >
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleIssue(issue)}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 text-left text-sm transition-colors",
                          !seen && "hover:opacity-90",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                            seen
                              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                              : "border-[var(--border)]",
                          )}
                        >
                          {seen ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span className="relative h-10 w-7 shrink-0">
                          {cover ? (
                            <ExpandableCover
                              src={cover}
                              alt={issue.name ?? ""}
                              thumbClassName="absolute inset-0 rounded"
                              sizes="28px"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center rounded bg-[var(--surface-3)]">
                              <BookMarked className="h-3 w-3 opacity-40" />
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 tabular-nums text-[var(--muted)]">
                          #{issue.issueNumber ?? "?"}
                        </span>
                        <span className="min-w-0 truncate">
                          {issue.name ?? "Sin título"}
                        </span>
                      </button>
                      {seen ? (
                        <IssuePriceInline
                          price={row?.price ?? null}
                          disabled={busy}
                          onCommit={(price) =>
                            void saveIssuePrice(issue.comicvineId, price)
                          }
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {error ? (
            <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={busy}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </form>
      </DialogBody>
    </Dialog>
  );
}
