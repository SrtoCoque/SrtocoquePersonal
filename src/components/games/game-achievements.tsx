"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type Achievement = {
  apiName: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockTime: number | null;
  icon: string | null;
  iconGray: string | null;
};

type Props = {
  steamAppId: number;
  /** Resumen cacheado del sync (mientras no se abre el listado) */
  cachedUnlocked?: number | null;
  cachedTotal?: number | null;
  className?: string;
};

function formatUnlockDate(unix: number | null): string | null {
  if (!unix || unix <= 0) return null;
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(unix * 1000));
  } catch {
    return null;
  }
}

export function GameAchievements({
  steamAppId,
  cachedUnlocked,
  cachedTotal,
  className,
}: Props) {
  const [listOpen, setListOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlocked, setUnlocked] = useState(cachedUnlocked ?? 0);
  const [total, setTotal] = useState(cachedTotal ?? 0);
  const [showLocked, setShowLocked] = useState(false);

  useEffect(() => {
    setListOpen(false);
    setShowLocked(false);
    setAchievements([]);
    setError(null);
    setUnlocked(cachedUnlocked ?? 0);
    setTotal(cachedTotal ?? 0);
  }, [steamAppId, cachedUnlocked, cachedTotal]);

  useEffect(() => {
    if (!listOpen) return;

    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/steam/achievements?appid=${steamAppId}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as {
          achievements?: Achievement[];
          unlocked?: number;
          total?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "No se pudieron cargar los logros");
          setAchievements([]);
          return;
        }
        const list = data.achievements ?? [];
        setAchievements(list);
        setUnlocked(data.unlocked ?? list.filter((a) => a.unlocked).length);
        setTotal(data.total ?? list.length);
        if (list.length === 0 && data.error) setError(data.error);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Error al cargar logros");
        setAchievements([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [listOpen, steamAppId]);

  const visible = useMemo(() => {
    if (showLocked) return achievements;
    return achievements.filter((a) => a.unlocked);
  }, [achievements, showLocked]);

  const lockedCount = Math.max(0, total - unlocked);
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  const hasSummary = total > 0 || unlocked > 0;

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Logros Steam</p>
            <p className="text-xs tabular-nums text-[var(--muted)]">
              {hasSummary
                ? `${unlocked}/${total} · ${pct}%`
                : listOpen && loading
                  ? "Cargando…"
                  : "Pulsa para ver el detalle"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setListOpen((o) => !o)}
          className="shrink-0 text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          {listOpen ? "Ocultar" : "Ver todos"}
        </button>
      </div>

      {hasSummary ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div
            className="h-full rounded-full bg-amber-500 transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}

      {listOpen ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--muted)]">
              {loading
                ? "Cargando listado…"
                : total > 0
                  ? `${unlocked} desbloqueados`
                  : "Sin logros"}
            </p>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--muted)]" />
            ) : lockedCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowLocked((v) => !v)}
                className="text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
              >
                {showLocked
                  ? "Solo desbloqueados"
                  : `Ver bloqueados (${lockedCount})`}
              </button>
            ) : null}
          </div>

          {error && achievements.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">{error}</p>
          ) : null}

          {!loading &&
          visible.length === 0 &&
          total > 0 &&
          !showLocked ? (
            <p className="text-xs text-[var(--muted)]">
              Aún no has desbloqueado ningún logro.
            </p>
          ) : null}

          {visible.length > 0 ? (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
              {visible.map((a) => {
                const icon = a.unlocked
                  ? a.icon || a.iconGray
                  : a.iconGray || a.icon;
                const when = formatUnlockDate(a.unlockTime);
                return (
                  <li
                    key={a.apiName || a.name}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg px-1.5 py-1.5",
                      a.unlocked ? "bg-[var(--surface)]/60" : "opacity-55",
                    )}
                  >
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-[var(--surface-3)]">
                      {icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={icon}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Trophy className="h-4 w-4 text-[var(--muted)]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-snug">
                        {a.name}
                      </p>
                      {a.description ? (
                        <p className="line-clamp-2 text-[11px] leading-snug text-[var(--muted)]">
                          {a.description}
                        </p>
                      ) : null}
                      {when ? (
                        <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                          {when}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
