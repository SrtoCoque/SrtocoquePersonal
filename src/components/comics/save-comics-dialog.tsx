"use client";

import { useEffect, useState } from "react";
import { BookMarked, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  comic: ComicVineVolume | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved?: () => void;
};

export function SaveComicsDialog({
  comic,
  open,
  onOpenChange,
  userId,
  onSaved,
}: Props) {
  const [destination, setDestination] = useState<ComicDestination | null>(null);
  const [marked, setMarked] = useState<PendingIssueMark[]>([]);
  const [detail, setDetail] = useState<ComicVineVolume | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open || !comic) return;
    setDestination(null);
    setMarked([]);
    setError(null);
    setDone(false);
    setDetail(comic);
    setEnriching(true);
    let cancelled = false;
    void (async () => {
      const enriched = await enrichComicVolume(comic);
      if (!cancelled) {
        setDetail(enriched);
        setEnriching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, comic]);

  const shown = detail ?? comic;
  const issues = shown?.issues ?? [];

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
    if (!shown?.comicvineId) {
      setMarked([]);
      return;
    }
    void (async () => {
      const all = await fetchVolumeIssues(shown.comicvineId);
      setMarked(all.map(issueToMark));
    })();
  }

  function handleMarkedChange(next: PendingIssueMark[]) {
    setMarked(next);
    if (destination === "wishlist") return;
    setDestination(deriveDestinationFromComicMarks(issues, next));
  }

  async function handleSave() {
    if (!comic || !destination) return;

    setSaving(true);
    setError(null);

    const enriched = detail ?? (await enrichComicVolume(comic));
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
    setDone(true);
    onSaved?.();
    setTimeout(() => onOpenChange(false), 700);
  }

  if (!comic || !shown) return null;

  const canSave = destination !== null;
  const saveLabel =
    destination === "wishlist"
      ? "Añadir a Wishlist"
      : destination === "reading"
        ? "Guardar"
        : destination === "read"
          ? "Marcar como leído"
          : "Elige una opción";

  const totalIssues = issues.length > 0 ? issues.length : shown.issueCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>Guardar cómic</DialogTitle>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <div className="flex gap-4">
            {shown.coverUrl ? (
              <ExpandableCover
                src={shown.coverUrl}
                alt={shown.title}
                thumbClassName="h-28 w-20 shrink-0 rounded-lg shadow-md"
                sizes="80px"
              />
            ) : (
              <div className="relative flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-3)] text-[var(--muted)] shadow-md">
                <BookMarked className="h-6 w-6 opacity-40" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug">
                {shown.title}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {[
                  shown.startYear ? String(shown.startYear) : null,
                  shown.publisher,
                  totalIssues ? `${totalIssues} núms.` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Sin datos"}
              </p>
              {shown.description ? (
                <p className="mt-1.5 line-clamp-3 text-xs text-[var(--muted)]">
                  {shown.description}
                </p>
              ) : null}
            </div>
          </div>

          <ComicsIssuesPicker
            issues={issues}
            loading={enriching}
            fallbackCoverUrl={shown.coverUrl}
            mode={destination === "wishlist" ? "readonly" : "pick"}
            marked={marked}
            onMarkedChange={handleMarkedChange}
          />

          <ComicsDestinationFields
            destination={destination}
            onDestinationChange={handleDestinationChange}
          />

          {error && (
            <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          {done && (
            <p className="rounded-lg bg-[var(--accent)]/10 px-3 py-2 text-sm text-[var(--accent)]">
              Guardado correctamente
            </p>
          )}

          <Button
            type="submit"
            className={cn(
              "w-full",
              destination === "wishlist" &&
                "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500",
            )}
            disabled={!canSave || saving || done}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveLabel}
          </Button>
        </form>
      </DialogBody>
    </Dialog>
  );
}
