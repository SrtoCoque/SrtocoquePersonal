"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookMarked, Plus } from "lucide-react";
import { ComicsHeader } from "@/components/layout/comics-header";
import { AddComicsModal } from "@/components/comics/add-comics-modal";
import { EditComicsDialog } from "@/components/comics/edit-comics-dialog";
import { ComicsCard } from "@/components/comics/comics-card";
import { ComicsSection } from "@/components/comics/comics-section";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { UserComic } from "@/lib/types";
import { comicDisplayStatus, isComicOnShelf } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "shelf" | "wishlist" | "reading" | "read";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "wishlist", label: "Wishlist" },
  { id: "reading", label: "Leyendo" },
  { id: "shelf", label: "Biblioteca" },
  { id: "read", label: "Leídos" },
];

function parseFilter(raw: string | null): Filter {
  if (
    raw === "shelf" ||
    raw === "wishlist" ||
    raw === "reading" ||
    raw === "read"
  ) {
    return raw;
  }
  return "all";
}

function mapComicsWithProgress(
  rows: UserComic[],
  issueRows: Array<{ user_comic_id: string }>,
): UserComic[] {
  const counts = new Map<string, number>();
  for (const row of issueRows) {
    counts.set(row.user_comic_id, (counts.get(row.user_comic_id) ?? 0) + 1);
  }
  return rows.map((c) => {
    const read = counts.get(c.id) ?? 0;
    const total = c.issue_count ?? 0;
    return {
      ...c,
      issues_read: read,
      issues_total: total,
      status: comicDisplayStatus(c.status, read, total),
    };
  });
}

export function ComicsLibraryView({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [comics, setComics] = useState<UserComic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(() =>
    parseFilter(searchParams.get("filter")),
  );
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<UserComic | null>(null);

  const loadComics = useCallback(async () => {
    const supabase = createClient();
    const [{ data, error }, { data: issues }] = await Promise.all([
      supabase
        .from("user_comics")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_comic_issues")
        .select("user_comic_id")
        .eq("user_id", userId),
    ]);

    if (!error && data) {
      setComics(
        mapComicsWithProgress(
          data as UserComic[],
          (issues ?? []) as Array<{ user_comic_id: string }>,
        ),
      );
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadComics();
  }, [loadComics]);

  useEffect(() => {
    setFilter(parseFilter(searchParams.get("filter")));
  }, [searchParams]);

  function setFilterAndUrl(next: Filter) {
    setFilter(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const wishlist = useMemo(
    () => comics.filter((c) => c.status === "wishlist"),
    [comics],
  );
  const reading = useMemo(
    () => comics.filter((c) => c.status === "reading"),
    [comics],
  );
  const shelf = useMemo(
    () => comics.filter((c) => isComicOnShelf(c.status)),
    [comics],
  );
  const read = useMemo(
    () => comics.filter((c) => c.status === "read"),
    [comics],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return comics;
    if (filter === "shelf") return shelf;
    if (filter === "wishlist") return wishlist;
    if (filter === "reading") return reading;
    return read;
  }, [comics, filter, shelf, wishlist, reading, read]);

  return (
    <div className="min-h-screen">
      <ComicsHeader email={email} />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
                Cómics
              </h1>
              <p className="text-sm text-[var(--muted)]">
                {comics.length}{" "}
                {comics.length === 1 ? "cómic guardado" : "cómics guardados"}
              </p>
            </div>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Añadir
            </Button>
          </div>

          <div className="flex w-full min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 sm:w-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterAndUrl(f.id)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  filter === f.id
                    ? "bg-[var(--accent)] text-[var(--accent-fg)] font-medium"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            <div className="h-48 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
          </div>
        ) : filter === "all" ? (
          comics.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-16 text-center">
              <BookMarked className="mb-3 h-10 w-10 text-[var(--muted)] opacity-50" />
              <p className="font-[family-name:var(--font-display)] text-lg font-medium">
                Tu biblioteca de cómics está vacía
              </p>
              <Button className="mt-5" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Añadir cómic
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              <ComicsSection
                title="Leyendo"
                subtitle="En progreso"
                comics={reading}
                onSeeMore={() => setFilterAndUrl("reading")}
                onEdit={setEditing}
                emptyLabel="No estás leyendo ningún cómic."
                compactCards
              />
              <ComicsSection
                title="Wishlist"
                subtitle="Cómics que quieres leer"
                comics={wishlist}
                onSeeMore={() => setFilterAndUrl("wishlist")}
                onEdit={setEditing}
                emptyLabel="Tu wishlist está vacía."
                compactCards
              />
              <ComicsSection
                title="Leídos"
                subtitle="Volúmenes terminados"
                comics={read}
                onSeeMore={() => setFilterAndUrl("read")}
                onEdit={setEditing}
                emptyLabel="Aún no has terminado ninguno."
                compactCards
              />
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
            <p className="font-[family-name:var(--font-display)] text-lg font-medium">
              No hay cómics en este filtro
            </p>
            <Button
              className="mt-5"
              variant="secondary"
              onClick={() => setFilterAndUrl("all")}
            >
              Volver a Todos
            </Button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4">
              {filtered.map((item) => (
                <ComicsCard key={item.id} comic={item} onEdit={setEditing} />
              ))}
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-[var(--muted)]">
          Datos de cómics cortesía de{" "}
          <a
            href="https://comicvine.gamespot.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Comic Vine
          </a>
        </p>
      </main>

      <AddComicsModal
        open={addOpen}
        onOpenChange={setAddOpen}
        userId={userId}
        onAdded={loadComics}
      />
      <EditComicsDialog
        comic={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={loadComics}
        onDeleted={loadComics}
      />
    </div>
  );
}
