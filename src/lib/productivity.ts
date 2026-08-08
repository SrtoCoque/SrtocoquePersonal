/** Productividad — tipos y helpers (bloques / horas por etiqueta). */

export type ProductivityTag = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type ProductivitySessionSource = "timer" | "manual";

export type ProductivitySession = {
  id: string;
  user_id: string;
  tag_id: string;
  duration_seconds: number;
  performed_on: string;
  started_at: string | null;
  ended_at: string | null;
  source: ProductivitySessionSource;
  notes: string | null;
  created_at: string;
};

export type ProductivitySessionWithTag = ProductivitySession & {
  tag: ProductivityTag | null;
};

export const PRODUCTIVITY_TAG_COLORS = [
  "#0d9488", // teal
  "#ca8a04", // amber
  "#dc2626", // red
  "#2563eb", // blue
  "#16a34a", // green
  "#c2410c", // orange
  "#4b5563", // gray
  "#0891b2", // cyan
] as const;

export function formatDurationHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h <= 0) return `${m} min`;
  if (m <= 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function formatHoursDecimal(seconds: number): string {
  const hours = seconds / 3600;
  if (hours === 0) return "0";
  if (Number.isInteger(hours)) return String(hours);
  return hours.toLocaleString("es-ES", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}

/** Bloques enteros: 1 hora = 1 bloque. */
export function blocksFromSeconds(seconds: number): number {
  return Math.floor(Math.max(0, seconds) / 3600);
}

export function yearFromDate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

export function monthFromDate(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getMonth();
}

export function todayISODate(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export type ProductivityPeriod = "all" | number;

export type PyramidBlock = {
  key: string;
  tagId: string;
  tagName: string;
  color: string;
  sessionId: string;
};

export type PyramidCubePlacement = PyramidBlock & {
  /** Coordenadas de rejilla centradas en origen */
  x: number;
  y: number;
  z: number;
};

/** Capacidad de una pirámide cuadrada de `levels` niveles: 1²+2²+…+n² */
export function squarePyramidCapacity(levels: number): number {
  if (levels <= 0) return 0;
  return (levels * (levels + 1) * (2 * levels + 1)) / 6;
}

/** Niveles (lado de la base) necesarios para caber `count` cubos. */
export function squarePyramidLevelsFor(count: number): number {
  if (count <= 0) return 0;
  let n = 1;
  while (squarePyramidCapacity(n) < count) n += 1;
  return n;
}

/**
 * Posiciones de una capa size×size, desde el centro hacia fuera.
 * Así una capa incompleta crece como núcleo compacto (apoyo real).
 */
export function layerPositionsCenterOut(
  size: number,
): { x: number; z: number }[] {
  if (size <= 0) return [];
  const offset = (size - 1) / 2;
  const cells: { x: number; z: number; dist: number; angle: number }[] = [];
  for (let zi = 0; zi < size; zi++) {
    for (let xi = 0; xi < size; xi++) {
      const x = xi - offset;
      const z = zi - offset;
      cells.push({
        x,
        z,
        dist: Math.hypot(x, z),
        angle: Math.atan2(z, x),
      });
    }
  }
  cells.sort(
    (a, b) => a.dist - b.dist || a.angle - b.angle || a.z - b.z || a.x - b.x,
  );
  return cells.map(({ x, z }) => ({ x, z }));
}

/**
 * Pirámide cuadrada con apilado real (de abajo arriba):
 * 1) Se elige la base n×n mínima que puede contener todos los cubos
 *    (capacidad = 1²+2²+…+n²).
 * 2) Se rellena primero la base n×n, desde el centro hacia fuera.
 * 3) Solo cuando esa capa está completa se sube a (n-1)×(n-1), etc.
 * 4) Cada capa superior queda centrada sobre la inferior.
 */
export function buildSquarePyramidPlacements(
  blocks: PyramidBlock[],
): PyramidCubePlacement[] {
  if (blocks.length === 0) return [];

  const levels = squarePyramidLevelsFor(blocks.length);
  const placements: PyramidCubePlacement[] = [];
  let idx = 0;

  for (let size = levels; size >= 1 && idx < blocks.length; size--) {
    const layerY = levels - size;
    const slots = layerPositionsCenterOut(size);
    for (const slot of slots) {
      if (idx >= blocks.length) break;
      placements.push({
        ...blocks[idx++],
        x: slot.x,
        y: layerY,
        z: slot.z,
      });
    }
  }

  return placements;
}

export function aggregateBlocksByTag(
  sessions: ProductivitySessionWithTag[],
): PyramidBlock[] {
  const blocks: PyramidBlock[] = [];
  for (const s of sessions) {
    const tag = s.tag;
    if (!tag) continue;
    const n = blocksFromSeconds(s.duration_seconds);
    for (let i = 0; i < n; i++) {
      blocks.push({
        key: `${s.id}-${i}`,
        tagId: tag.id,
        tagName: tag.name,
        color: tag.color,
        sessionId: s.id,
      });
    }
  }
  return blocks;
}

const TIMER_STORAGE_KEY = "productivity-active-timer";

export type ActiveTimerState = {
  tagId: string;
  /** Epoch ms cuando se reanudó el tramo actual (null si pausado) */
  runningSince: number | null;
  /** Segundos acumulados en pausas anteriores */
  accumulatedSeconds: number;
  startedAtISO: string;
};

export function loadActiveTimer(): ActiveTimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveTimerState;
    if (!parsed?.tagId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveActiveTimer(state: ActiveTimerState | null) {
  if (typeof window === "undefined") return;
  try {
    if (!state) window.localStorage.removeItem(TIMER_STORAGE_KEY);
    else window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function timerElapsedSeconds(state: ActiveTimerState, now = Date.now()): number {
  const live =
    state.runningSince != null
      ? Math.max(0, Math.floor((now - state.runningSince) / 1000))
      : 0;
  return state.accumulatedSeconds + live;
}
