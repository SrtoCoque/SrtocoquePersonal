"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookMarked,
  Bookmark,
  BookOpen,
  Check,
  Loader2,
  Search,
} from "lucide-react";
import { ComicsHeader } from "@/components/layout/comics-header";
import { EditComicsDialog } from "@/components/comics/edit-comics-dialog";
import { SaveComicsDialog } from "@/components/comics/save-comics-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { ComicVineVolume, UserComic } from "@/lib/types";
import { comicDisplayStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const IN_LIBRARY: Record<
  UserComic["status"],
  { label: string; bar: string; ring: string; Icon: typeof Check }
> = {
  wishlist: {
    label: "En tu wishlist",
    bar: "bg-amber-500 text-white",
    ring: "ring-2 ring-amber-500/70 border-amber-500/40",
    Icon: Bookmark,
  },
  reading: {
    label: "Leyendo",
    bar: "bg-violet-500 text-white",
    ring: "ring-2 ring-violet-500/70 border-violet-500/40",
    Icon: BookOpen,
  },
  read: {
    label: "Leído",
    bar: "bg-emerald-600 text-white",
    ring: "ring-2 ring-emerald-500/70 border-emerald-500/40",
    Icon: Check,
  },
};

export function ComicsSearchView({
  userId,
  email,
  initialQuery,
}: {
  userId: string;
  email: string | null;
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ComicVineVolume[]>([]);
  const [library, setLibrary] = useState<UserComic[]>([]);
  const [loading, setLoading] = useState(() => initialQuery.trim().length >= 2);
  const [error, setError] = useState<string | null>(null);
  const [selectedNew, setSelectedNew] = useState<ComicVineVolume | null>(null);
  const [editing, setEditing] = useState<UserComic | null>(null);

  const libraryByComicvineId = useMemo(() => {
    const map = new Map<number, UserComic>();
    for (const c of library) {
      if (c.comicvine_id != null) map.set(c.comicvine_id, c);
    }
    return map;
  }, [library]);

  const loadLibrary = useCallback(async () => {
    const supabase = createClient();
    const [{ data }, { data: issues }] = await Promise.all([
      supabase.from("user_comics").select("*").eq("user_id", userId),
      supabase
        .from("user_comic_issues")
        .select("user_comic_id")
        .eq("user_id", userId),
    ]);
    if (data) {
      const counts = new Map<string, number>();
      for (const row of issues ?? []) {
        const issue = row as { user_comic_id: string };
        counts.set(
          issue.user_comic_id,
          (counts.get(issue.user_comic_id) ?? 0) + 1,
        );
      }
      setLibrary(
        (data as UserComic[]).map((c) => {
          const read = counts.get(c.id) ?? 0;
          const total = c.issue_count ?? 0;
          return {
            ...c,
            issues_read: read,
            issues_total: total,
            status: comicDisplayStatus(c.status, read, total),
          };
        }),
      );
    }
  }, [userId]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const q = initialQuery.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/comics/search?q=${encodeURIComponent(q)}&limit=40`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as {
          results?: ComicVineVolume[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Error al buscar");
        setResults(data.results ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error de búsqueda");
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [initialQuery]);

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    router.push(`/comics/search?q=${encodeURIComponent(q)}`);
  }

  function handleClick(item: ComicVineVolume) {
    const existing = libraryByComicvineId.get(item.comicvineId);
    if (existing) {
      setEditing(existing);
      return;
    }
    setSelectedNew(item);
  }

  return (
    <div className="min-h-screen">
      <ComicsHeader email={email} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/comics"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a cómics
        </Link>

        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Buscar cómics
          </h1>
        </div>

        <form onSubmit={submitSearch} className="mb-8 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Título del cómic..."
              className="pl-9"
              autoFocus
              autoComplete="off"
              enterKeyHint="search"
              data-skip-keyboard-scroll="true"
            />
          </div>
          <Button type="submit" disabled={query.trim().length < 2 || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>

        {error && (
          <p className="mb-4 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-2xl bg-[var(--surface-2)]"
              />
            ))}
          </div>
        ) : results.length === 0 && initialQuery.trim().length >= 2 ? (
          <p className="py-12 text-center text-sm text-[var(--muted)]">
            Sin resultados para «{initialQuery}»
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
            {results.map((item) => {
              const existing = libraryByComicvineId.get(item.comicvineId);
              const meta = existing ? IN_LIBRARY[existing.status] : null;
              const StatusIcon = meta?.Icon ?? BookMarked;
              return (
                <button
                  key={item.comicvineId}
                  type="button"
                  onClick={() => handleClick(item)}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] text-left transition-all hover:-translate-y-0.5",
                    meta
                      ? meta.ring
                      : "border-[var(--border)] hover:border-[var(--accent)]/40",
                  )}
                >
                  <div className="relative aspect-[2/3] bg-[var(--surface-3)]">
                    {item.coverUrl ? (
                      <Image
                        src={item.coverUrl}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="200px"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[var(--muted)]">
                        <BookMarked className="h-8 w-8 opacity-40" />
                      </div>
                    )}
                    {meta ? (
                      <div
                        className={cn(
                          "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold",
                          meta.bar,
                        )}
                      >
                        <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-1">{meta.label}</span>
                        {existing &&
                        existing.status !== "wishlist" &&
                        (existing.issues_total ?? 0) > 0 ? (
                          <span className="shrink-0 tabular-nums opacity-95">
                            {existing.issues_read ?? 0}/{existing.issues_total}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">
                      {item.title}
                    </p>
                    <p className="line-clamp-1 text-xs text-[var(--muted)]">
                      {[
                        item.startYear ? String(item.startYear) : null,
                        item.publisher,
                        item.issueCount ? `${item.issueCount} núms.` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <SaveComicsDialog
        comic={selectedNew}
        open={!!selectedNew}
        onOpenChange={(o) => {
          if (!o) setSelectedNew(null);
        }}
        userId={userId}
        onSaved={loadLibrary}
      />
      <EditComicsDialog
        comic={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={loadLibrary}
        onDeleted={loadLibrary}
      />
    </div>
  );
}
