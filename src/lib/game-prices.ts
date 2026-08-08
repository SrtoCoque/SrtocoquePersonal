import {
  GAME_STOREFRONTS,
  isGameStorefront,
  type GameStorefront,
} from "@/lib/game-storefronts";

export type GamePrices = Partial<Record<GameStorefront, number>>;
export type GamePricesDraft = Partial<Record<GameStorefront, number | "">>;

export function normalizeGamePrices(value: unknown): GamePrices {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: GamePrices = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!isGameStorefront(key)) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) continue;
    out[key] = n;
  }
  return out;
}

export function sumGamePrices(prices: GamePrices | null | undefined): number {
  if (!prices) return 0;
  return Object.values(prices).reduce((sum, n) => {
    const v = Number(n);
    return sum + (Number.isFinite(v) && v > 0 ? v : 0);
  }, 0);
}

/** Solo tiendas seleccionadas; omite vacíos. */
export function pricesDraftToDb(
  draft: GamePricesDraft,
  storefronts: GameStorefront[],
): GamePrices {
  const out: GamePrices = {};
  for (const sf of storefronts) {
    const raw = draft[sf];
    if (raw === "" || raw == null) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) continue;
    out[sf] = n;
  }
  return out;
}

export function pricesToDraft(prices: GamePrices): GamePricesDraft {
  const out: GamePricesDraft = {};
  for (const sf of GAME_STOREFRONTS) {
    if (prices[sf] != null) out[sf] = prices[sf];
  }
  return out;
}

export function prunePricesDraft(
  draft: GamePricesDraft,
  storefronts: GameStorefront[],
): GamePricesDraft {
  const keep = new Set(storefronts);
  const out: GamePricesDraft = {};
  for (const [key, value] of Object.entries(draft)) {
    if (isGameStorefront(key) && keep.has(key)) out[key] = value;
  }
  return out;
}

function todayPricesSetAt(): string {
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

/**
 * Conserva la fecha original si ya había precio pagado;
 * si se registra por primera vez, usa hoy; si se borra, null.
 */
export function nextPricesSetAt(input: {
  nextPrices: GamePrices;
  previousSetAt?: string | null;
  today?: string;
}): string | null {
  if (sumGamePrices(input.nextPrices) <= 0) return null;
  if (input.previousSetAt) return input.previousSetAt.slice(0, 10);
  return (input.today ?? todayPricesSetAt()).slice(0, 10);
}
