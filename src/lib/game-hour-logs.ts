import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeStorefronts } from "@/lib/game-storefronts";
import type {
  GameHourLogSource,
  UserGame,
} from "@/lib/types";

const MAX_SPREAD_DAYS = 366;

function isPlayingOnSteam(game: Pick<UserGame, "storefronts" | "play_storefront">): boolean {
  const storefronts = normalizeStorefronts(game.storefronts);
  const steamOnly = storefronts.length === 1 && storefronts[0] === "steam";
  return steamOnly || game.play_storefront === "steam";
}

/**
 * Horas contables de la ficha actual (no historial de playthroughs).
 * Misma lógica que estadísticas / sync.
 */
export function hoursCountedForStats(
  game: Pick<
    UserGame,
    "status" | "hours_played" | "steam_hours_played" | "storefronts" | "play_storefront"
  >,
): number {
  const main = Number(game.hours_played) || 0;
  const steam = Number(game.steam_hours_played) || 0;
  if (game.status === "wishlist") return 0;
  if (game.status === "owned") return Math.max(main, steam);
  if (isPlayingOnSteam(game)) return Math.max(main, steam);
  return main + steam;
}

export function positiveDelta(before: number, after: number): number | null {
  const delta = (Number(after) || 0) - (Number(before) || 0);
  if (!Number.isFinite(delta) || delta <= 0) return null;
  // Evitar ruido de redondeo minúsculo
  if (delta < 0.05) return null;
  return Math.round(delta * 10) / 10;
}

/** Fecha local YYYY-MM-DD (Europa/Madrid si el runtime lo soporta). */
export function todayPlayedOn(): string {
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

function parseDay(iso: string): Date {
  const day = iso.slice(0, 10);
  return new Date(`${day}T12:00:00`);
}

function formatDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, days: number): string {
  const d = parseDay(iso);
  d.setDate(d.getDate() + days);
  return formatDay(d);
}

function daysBetweenInclusive(fromISO: string, toISO: string): number {
  const from = parseDay(fromISO);
  const to = parseDay(toISO);
  const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

/**
 * Reparte horas a partes iguales entre from y to (inclusive).
 * Steam no da historial diario; es la mejor aproximación para stats mensuales.
 */
export function distributeHoursAcrossRange(
  totalHours: number,
  fromISO: string,
  toISO: string,
): { playedOn: string; hours: number }[] {
  const total = Math.round((Number(totalHours) || 0) * 10) / 10;
  if (total <= 0) return [];

  let from = fromISO.slice(0, 10);
  let to = toISO.slice(0, 10);
  if (parseDay(from).getTime() > parseDay(to).getTime()) {
    from = to;
  }

  let dayCount = daysBetweenInclusive(from, to);
  if (dayCount > MAX_SPREAD_DAYS) {
    from = addDays(to, -(MAX_SPREAD_DAYS - 1));
    dayCount = MAX_SPREAD_DAYS;
  }

  if (dayCount === 1) {
    return [{ playedOn: to, hours: total }];
  }

  const base = Math.floor((total / dayCount) * 10) / 10;
  const parts: { playedOn: string; hours: number }[] = [];
  let assigned = 0;
  for (let i = 0; i < dayCount; i++) {
    const playedOn = addDays(from, i);
    const hours =
      i === dayCount - 1
        ? Math.round((total - assigned) * 10) / 10
        : base;
    assigned = Math.round((assigned + hours) * 10) / 10;
    if (hours > 0) parts.push({ playedOn, hours });
  }
  return parts;
}

function clampPlayedOn(iso: string, today: string): string {
  const day = iso.slice(0, 10);
  if (parseDay(day).getTime() > parseDay(today).getTime()) return today;
  return day;
}

/**
 * Reparte un delta de Steam:
 * - si hay lastPlayedOn (rtime_last_played): todo el delta ese día (última sesión)
 * - hasta playtime_2weeks → últimos 14 días (o desde lastSync si es más reciente)
 * - el resto → desde lastSync hasta antes de esa ventana
 * Si no hay lastSync, todo a hoy (primera sync / import).
 */
export function planSteamHourLogSlices(input: {
  delta: number;
  today?: string;
  lastSyncedAt?: string | null;
  playtime2WeeksHours?: number;
  /** Día de la última sesión en Steam (YYYY-MM-DD). */
  lastPlayedOn?: string | null;
}): { playedOn: string; hours: number }[] {
  const delta = positiveDelta(0, input.delta);
  if (delta == null) return [];

  const today = (input.today ?? todayPlayedOn()).slice(0, 10);

  // Horas no añadidas día a día → se adjudican a la última sesión en Steam
  if (input.lastPlayedOn) {
    return [
      {
        playedOn: clampPlayedOn(input.lastPlayedOn, today),
        hours: delta,
      },
    ];
  }

  const lastSyncRaw = input.lastSyncedAt?.slice(0, 10) ?? null;

  // Primera sync o sin fecha previa: no inventamos un año entero
  if (!lastSyncRaw) {
    return [{ playedOn: today, hours: delta }];
  }

  let lastSync = lastSyncRaw;
  if (parseDay(lastSync).getTime() > parseDay(today).getTime()) {
    lastSync = today;
  }

  // Si la última sync fue hoy, un solo día
  if (lastSync === today) {
    return [{ playedOn: today, hours: delta }];
  }

  // Empezar a repartir el día siguiente a la última sync
  const rangeStart = addDays(lastSync, 1);
  if (parseDay(rangeStart).getTime() > parseDay(today).getTime()) {
    return [{ playedOn: today, hours: delta }];
  }

  const recentWindowStart = addDays(today, -13);
  const twoWeekCap = Math.max(0, Number(input.playtime2WeeksHours) || 0);
  const useTwoWeekSplit = twoWeekCap > 0;

  const recentStart = useTwoWeekSplit
    ? parseDay(rangeStart).getTime() > parseDay(recentWindowStart).getTime()
      ? rangeStart
      : recentWindowStart
    : rangeStart;

  const recentHours = useTwoWeekSplit
    ? Math.min(delta, twoWeekCap)
    : delta;
  const olderHours = useTwoWeekSplit
    ? Math.round((delta - recentHours) * 10) / 10
    : 0;

  const slices: { playedOn: string; hours: number }[] = [];

  if (olderHours > 0) {
    const olderEnd = addDays(recentStart, -1);
    if (parseDay(rangeStart).getTime() <= parseDay(olderEnd).getTime()) {
      slices.push(
        ...distributeHoursAcrossRange(olderHours, rangeStart, olderEnd),
      );
    } else {
      slices.push(
        ...distributeHoursAcrossRange(
          olderHours + recentHours,
          recentStart,
          today,
        ),
      );
      return mergeSlicesByDay(slices);
    }
  }

  if (recentHours > 0) {
    slices.push(
      ...distributeHoursAcrossRange(recentHours, recentStart, today),
    );
  }

  return mergeSlicesByDay(slices);
}

function mergeSlicesByDay(
  slices: { playedOn: string; hours: number }[],
): { playedOn: string; hours: number }[] {
  const map = new Map<string, number>();
  for (const s of slices) {
    map.set(
      s.playedOn,
      Math.round(((map.get(s.playedOn) ?? 0) + s.hours) * 10) / 10,
    );
  }
  return [...map.entries()]
    .filter(([, h]) => h > 0)
    .map(([playedOn, hours]) => ({ playedOn, hours }))
    .sort((a, b) => a.playedOn.localeCompare(b.playedOn));
}

type InsertHourLogInput = {
  userId: string;
  gameId: string;
  delta: number;
  playedOn?: string;
  source: GameHourLogSource;
};

export async function insertHourLog(
  supabase: SupabaseClient,
  input: InsertHourLogInput,
): Promise<{ error: Error | null }> {
  const delta = Number(input.delta);
  if (!Number.isFinite(delta) || delta <= 0) {
    return { error: null };
  }

  const { error } = await supabase.from("user_game_hour_logs").insert({
    user_id: input.userId,
    user_game_id: input.gameId,
    played_on: input.playedOn ?? todayPlayedOn(),
    hours_delta: Math.round(delta * 10) / 10,
    source: input.source,
  });

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

/** Inserta solo si after > before (un solo día). */
export async function insertHourLogIfIncreased(
  supabase: SupabaseClient,
  input: {
    userId: string;
    gameId: string;
    before: number;
    after: number;
    playedOn?: string;
    source: GameHourLogSource;
  },
): Promise<{ error: Error | null; delta: number | null }> {
  const delta = positiveDelta(input.before, input.after);
  if (delta == null) return { error: null, delta: null };
  const { error } = await insertHourLog(supabase, {
    userId: input.userId,
    gameId: input.gameId,
    delta,
    playedOn: input.playedOn,
    source: input.source,
  });
  return { error, delta };
}

/** Inserta el incremento de Steam repartido (o en lastPlayedOn si existe). */
export async function insertSteamHourDeltaLogs(
  supabase: SupabaseClient,
  input: {
    userId: string;
    gameId: string;
    before: number;
    after: number;
    lastSyncedAt?: string | null;
    playtime2WeeksHours?: number;
    lastPlayedOn?: string | null;
  },
): Promise<{ error: Error | null; delta: number | null }> {
  const delta = positiveDelta(input.before, input.after);
  if (delta == null) return { error: null, delta: null };

  const slices = planSteamHourLogSlices({
    delta,
    lastSyncedAt: input.lastSyncedAt,
    playtime2WeeksHours: input.playtime2WeeksHours,
    lastPlayedOn: input.lastPlayedOn,
  });

  if (slices.length === 0) return { error: null, delta };

  const rows = slices.map((s) => ({
    user_id: input.userId,
    user_game_id: input.gameId,
    played_on: s.playedOn,
    hours_delta: s.hours,
    source: "steam_sync" as const,
  }));

  const { error } = await supabase.from("user_game_hour_logs").insert(rows);
  if (error) {
    return { error: new Error(error.message), delta };
  }
  return { error: null, delta };
}

function daysSincePlayedOn(fromISO: string, todayISO: string): number {
  const from = parseDay(fromISO.slice(0, 10));
  const to = parseDay(todayISO.slice(0, 10));
  return Math.max(
    0,
    Math.round((to.getTime() - from.getTime()) / 86_400_000),
  );
}

/**
 * Atribuye horas de Steam al historial:
 * - Si hay última sesión y las horas no se fueron sumando día a día (volcado
 *   en 1–2 días distintos a lastPlayed), consolida todo ese total en ese día.
 * - Si el juego sigue activo, suma el delta (y huecos) en lastPlayedOn.
 */
export async function applySteamHourAttribution(
  supabase: SupabaseClient,
  input: {
    userId: string;
    gameId: string;
    hoursBefore: number;
    hoursAfter: number;
    lastSyncedAt?: string | null;
    lastPlayedOn?: string | null;
    playtime2WeeksHours?: number;
  },
): Promise<{ error: Error | null }> {
  const hoursAfter = Math.round((Number(input.hoursAfter) || 0) * 10) / 10;
  if (hoursAfter <= 0 && positiveDelta(input.hoursBefore, input.hoursAfter) == null) {
    return { error: null };
  }

  const today = todayPlayedOn();
  const lastPlayedOn = input.lastPlayedOn
    ? clampPlayedOn(input.lastPlayedOn, today)
    : null;
  const twoWeeks = Math.max(0, Number(input.playtime2WeeksHours) || 0);
  const recentlyActive =
    Boolean(lastPlayedOn) &&
    twoWeeks > 0.05 &&
    daysSincePlayedOn(lastPlayedOn!, today) <= 14;

  const { data: logs, error: fetchError } = await supabase
    .from("user_game_hour_logs")
    .select("id, played_on, hours_delta")
    .eq("user_id", input.userId)
    .eq("user_game_id", input.gameId)
    .eq("source", "steam_sync");

  if (fetchError) {
    return { error: new Error(fetchError.message) };
  }

  const steamLogs = logs ?? [];
  const uniqueDays = new Set(steamLogs.map((row) => row.played_on));
  const looksLikeBulkDump =
    Boolean(lastPlayedOn) &&
    (steamLogs.length === 0 ||
      (uniqueDays.size <= 2 && !uniqueDays.has(lastPlayedOn!)));

  // Partida antigua sin tracking progresivo → todo el total a la última sesión
  if (lastPlayedOn && !recentlyActive && looksLikeBulkDump) {
    const onLastDay =
      Math.round(
        steamLogs
          .filter((row) => row.played_on === lastPlayedOn)
          .reduce((sum, row) => sum + (Number(row.hours_delta) || 0), 0) * 10,
      ) / 10;
    const onlyOnLastDay = steamLogs.every(
      (row) => row.played_on === lastPlayedOn,
    );
    if (onlyOnLastDay && Math.abs(onLastDay - hoursAfter) < 0.15) {
      return { error: null };
    }

    if (steamLogs.length > 0) {
      const { error: deleteError } = await supabase
        .from("user_game_hour_logs")
        .delete()
        .in(
          "id",
          steamLogs.map((row) => row.id),
        );
      if (deleteError) return { error: new Error(deleteError.message) };
    }

    if (hoursAfter > 0) {
      return insertHourLog(supabase, {
        userId: input.userId,
        gameId: input.gameId,
        delta: hoursAfter,
        playedOn: lastPlayedOn,
        source: "steam_sync",
      });
    }
    return { error: null };
  }

  const totalLogged =
    Math.round(
      steamLogs.reduce((sum, row) => sum + (Number(row.hours_delta) || 0), 0) *
        10,
    ) / 10;

  const { error: deltaError, delta } = await insertSteamHourDeltaLogs(supabase, {
    userId: input.userId,
    gameId: input.gameId,
    before: input.hoursBefore,
    after: input.hoursAfter,
    lastSyncedAt: input.lastSyncedAt,
    playtime2WeeksHours: input.playtime2WeeksHours,
    lastPlayedOn,
  });
  if (deltaError) return { error: deltaError };

  const loggedAfter =
    Math.round((totalLogged + (delta ?? 0)) * 10) / 10;
  const gap = positiveDelta(loggedAfter, hoursAfter);
  if (gap == null) return { error: null };

  return insertHourLog(supabase, {
    userId: input.userId,
    gameId: input.gameId,
    delta: gap,
    playedOn: lastPlayedOn ?? today,
    source: "steam_sync",
  });
}
