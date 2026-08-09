"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, BookMarked, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ComicsDestinationFields,
  comicDestinationToStatus,
  type ComicDestination,
} from "@/components/comics/comics-destination-fields";
import {
  ComicsIssuesPicker,
  fetchVolumeIssues,
  issueToMark,
  type PendingIssueMark,
} from "@/components/comics/comics-issues-picker";
import { ExpandableCover } from "@/components/comics/expandable-cover";
import { enrichComicVolume } from "@/components/comics/enrich-comics";
import { insertUserComic } from "@/components/comics/insert-user-comics";
import type { ComicVineVolume } from "@/lib/types";
import { deriveDestinationFromComicMarks } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onAdded: () => void;
};

export function AddComicsModal({ open, onOpenChange, userId, onAdded }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ComicVineVolume[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ComicVineVolume | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [destination, setDestination] = useState<ComicDestination | null>(null);
  const [marked, setMarked] = useState<PendingIssueMark[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setEnriching(false);
    setDestination(null);
    setMarked([]);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (!open || selected) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/comics/search?q=${encodeURIComponent(q)}&limit=6`,
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
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, selected]);

  async function selectComic(item: ComicVineVolume) {
    setSelected(item);
    setDestination(null);
    setMarked([]);
    setError(null);
    setEnriching(true);
    const enriched = await enrichComicVolume(item);
    setSelected(enriched);
    setEnriching(false);
  }

  const issues = selected?.issues ?? [];

  function handleDestinationChange(next: ComicDestination) {
    if (next === "wishlist") {
      setDestination("wishlist");
      setMarked([]);
      return;
    }
    if (next === "reading") {
      setDestination("reading");
      return;
    }
    setDestination("read");
    if (issues.length > 0) {
      setMarked(issues.map(issueToMark));
      return;
    }
    if (!selected?.comicvineId) {
      setMarked([]);
      return;
    }
    void (async () => {
      const all = await fetchVolumeIssues(selected.comicvineId);
      setMarked(all.map(issueToMark));
    })();
  }

  function handleMarkedChange(next: PendingIssueMark[]) {
    setMarked(next);
    if (destination === "wishlist") return;
    setDestination(deriveDestinationFromComicMarks(issues, next));
  }

  function goToFullSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    onOpenChange(false);
    router.push(`/comics/search?q=${encodeURIComponent(q)}`);
  }

  async function handleSave() {
    if (!selected || !destination) return;

    setSaving(true);
    setError(null);

    const enriched = await enrichComicVolume(selected);
    const status = comicDestinationToStatus(destination);
    const { error: insertError } = await insertUserComic({
      userId,
      comic: enriched,
      status,
      markedIssues: marked,
    });

    if (insertError) {
      setSaving(false);
      setError(insertError);
      return;
    }

    setSaving(false);
    onOpenChange(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Añadir cómic</DialogTitle>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Busca el volumen · pulsa Buscar / Enter para ver más
        </p>
      </DialogHeader>

      <DialogBody className="space-y-4">
        {!selected ? (
          <>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                goToFullSearch();
              }}
            >
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
              <Button
                type="submit"
                disabled={query.trim().length < 2}
                variant="secondary"
              >
                Buscar
              </Button>
            </form>

            {searching ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
              </div>
            ) : results.length > 0 ? (
              <ul className="space-y-2">
                {results.map((item) => (
                  <li key={item.comicvineId}>
                    <button
                      type="button"
                      onClick={() => void selectComic(item)}
                      className="flex w-full gap-3 rounded-xl border border-[var(--border)] p-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]">
                        {item.coverUrl ? (
                          <Image
                            src={item.coverUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="44px"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-[var(--muted)]">
                            <BookMarked className="h-4 w-4 opacity-40" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-medium">{item.title}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {[
                            item.startYear ? String(item.startYear) : null,
                            item.publisher,
                            item.issueCount ? `${item.issueCount} núms.` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.trim().length >= 2 ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">
                Sin resultados
              </p>
            ) : null}

            {error ? (
              <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                {error}
              </p>
            ) : null}
          </>
        ) : (
          <form
            className="space-y-4 animate-fade-in"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            >
              ← Cambiar cómic
            </button>
            <div className="flex gap-4">
              {selected.coverUrl ? (
                <ExpandableCover
                  src={selected.coverUrl}
                  alt={selected.title}
                  thumbClassName="h-28 w-20 shrink-0 rounded-lg"
                  sizes="80px"
                />
              ) : (
                <div className="relative flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-3)] text-[var(--muted)]">
                  <BookMarked className="h-6 w-6 opacity-40" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug">
                  {selected.title}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {[
                    selected.startYear ? String(selected.startYear) : null,
                    selected.publisher,
                    issues.length > 0
                      ? `${issues.length} núms.`
                      : selected.issueCount
                        ? `${selected.issueCount} núms.`
                        : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sin datos"}
                </p>
              </div>
            </div>

            <ComicsIssuesPicker
              issues={issues}
              loading={enriching}
              fallbackCoverUrl={selected.coverUrl}
              mode={destination === "wishlist" ? "readonly" : "pick"}
              marked={marked}
              onMarkedChange={handleMarkedChange}
            />

            <ComicsDestinationFields
              destination={destination}
              onDestinationChange={handleDestinationChange}
            />

            {error ? (
              <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className={cn(
                "w-full",
                destination === "wishlist" &&
                  "bg-amber-500 text-white hover:bg-amber-600",
              )}
              disabled={!destination || saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {destination === "wishlist"
                ? "Añadir a Wishlist"
                : destination === "reading"
                  ? "Guardar"
                  : destination === "read"
                    ? "Marcar como leído"
                    : "Elige una opción"}
            </Button>
          </form>
        )}
      </DialogBody>
    </Dialog>
  );
}
