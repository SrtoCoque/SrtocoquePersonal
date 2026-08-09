"use client";

import { useMemo } from "react";
import { BookMarked, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ExpandableCover } from "@/components/comics/expandable-cover";
import { IssuePriceInline } from "@/components/comics/issue-price-inline";
import type { ComicVineIssue } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PendingIssueMark = {
  comicvineId: number;
  issueNumber: string | null;
  name: string | null;
  coverUrl: string | null;
  /** Coste de este tomo/número en euros (opcional). */
  price?: number | null;
};

export function issueToMark(issue: ComicVineIssue): PendingIssueMark {
  return {
    comicvineId: issue.comicvineId,
    issueNumber: issue.issueNumber,
    name: issue.name,
    coverUrl: issue.coverUrl,
    price: null,
  };
}

/** Descarga los números de un volumen (para «marcar todos» sin tenerlos aún). */
export async function fetchVolumeIssues(
  comicvineId: number,
): Promise<ComicVineIssue[]> {
  try {
    const res = await fetch(`/api/comics/issues?id=${comicvineId}`);
    const data = (await res.json()) as {
      issues?: ComicVineIssue[];
      error?: string;
    };
    if (!res.ok) return [];
    return data.issues ?? [];
  } catch {
    return [];
  }
}

export function issueLabel(issue: {
  issueNumber: string | null;
  name: string | null;
}): string {
  const number = issue.issueNumber ? `#${issue.issueNumber}` : null;
  return [number, issue.name].filter(Boolean).join(" · ") || "Número";
}

function parsePrice(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

type Props = {
  issues: ComicVineIssue[];
  loading?: boolean;
  fallbackCoverUrl?: string | null;
  /** wishlist / sin destino: solo ver. pick: marcar números uno a uno. */
  mode: "readonly" | "pick";
  marked: PendingIssueMark[];
  onMarkedChange: (next: PendingIssueMark[]) => void;
  className?: string;
};

export function ComicsIssuesPicker({
  issues,
  loading = false,
  fallbackCoverUrl,
  mode,
  marked,
  onMarkedChange,
  className,
}: Props) {
  const markedIds = useMemo(
    () => new Set(marked.map((m) => m.comicvineId)),
    [marked],
  );
  const markedById = useMemo(() => {
    const map = new Map<number, PendingIssueMark>();
    for (const m of marked) map.set(m.comicvineId, m);
    return map;
  }, [marked]);

  const interactive = mode === "pick";
  const allMarked = issues.length > 0 && markedIds.size >= issues.length;

  function toggleIssue(issue: ComicVineIssue) {
    if (!interactive) return;
    if (markedIds.has(issue.comicvineId)) {
      onMarkedChange(
        marked.filter((m) => m.comicvineId !== issue.comicvineId),
      );
      return;
    }
    onMarkedChange([...marked, issueToMark(issue)]);
  }

  function toggleAll() {
    if (!interactive) return;
    onMarkedChange(allMarked ? [] : issues.map(issueToMark));
  }

  function setIssuePrice(comicvineId: number, raw: string) {
    const price = parsePrice(raw);
    onMarkedChange(
      marked.map((m) =>
        m.comicvineId === comicvineId ? { ...m, price } : m,
      ),
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label>Números / tomos</Label>
        <span className="text-[11px] text-[var(--muted)]">
          {interactive
            ? "Pincha € o el precio para editarlo"
            : "Sin progreso en wishlist"}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
        </div>
      ) : issues.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-5 text-center text-sm text-[var(--muted)]">
          Sin datos de números
        </p>
      ) : (
        <div className="space-y-2 rounded-xl border border-[var(--border)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              <span className="tabular-nums font-medium">
                {markedIds.size}/{issues.length}
              </span>{" "}
              <span className="text-[var(--muted)]">marcados</span>
            </p>
            {interactive ? (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={allMarked ? "ghost" : "secondary"}
                  className="h-8 gap-1.5"
                  onClick={toggleAll}
                  aria-pressed={allMarked}
                  title={
                    allMarked ? "Desmarcar todos" : "Marcar todos los números"
                  }
                >
                  {allMarked ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                  {allMarked ? "Ninguno" : "Todos"}
                </Button>
              </div>
            ) : null}
          </div>

          <ul className="max-h-72 space-y-1.5 overflow-y-auto">
            {issues.map((issue) => {
              const seen = markedIds.has(issue.comicvineId);
              const mark = markedById.get(issue.comicvineId);
              const cover = issue.coverUrl ?? fallbackCoverUrl;
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
                    disabled={!interactive}
                    onClick={() => toggleIssue(issue)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 text-left text-sm transition-colors",
                      !seen && interactive && "hover:opacity-90",
                      !interactive && "opacity-80",
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
                  {seen && interactive ? (
                    <IssuePriceInline
                      price={mark?.price ?? null}
                      onCommit={(raw) => setIssuePrice(issue.comicvineId, raw)}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
