import type { UserGame } from "@/lib/types";

function parseActivityMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const raw = iso.length === 10 ? `${iso}T12:00:00` : iso;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Última actividad jugable: max entre Steam (rtime_last_played),
 * último log de horas, inicio de la sesión «jugando» y updated_at.
 */
export function lastPlayedActivityMs(
  game: Pick<
    UserGame,
    | "steam_last_played_at"
    | "start_date"
    | "updated_at"
    | "created_at"
  >,
  latestHourPlayedOn?: string | null,
): number {
  return Math.max(
    parseActivityMs(game.steam_last_played_at),
    parseActivityMs(latestHourPlayedOn),
    parseActivityMs(game.start_date),
    parseActivityMs(game.updated_at),
    parseActivityMs(game.created_at),
  );
}

/** Mapa user_game_id → played_on más reciente. */
export function latestHourPlayedOnByGame(
  logs: Array<{ user_game_id: string; played_on: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const log of logs) {
    const prev = map.get(log.user_game_id);
    if (!prev || log.played_on > prev) {
      map.set(log.user_game_id, log.played_on.slice(0, 10));
    }
  }
  return map;
}

export function compareByLastPlayed(
  a: UserGame,
  b: UserGame,
  latestHours: Map<string, string>,
): number {
  return (
    lastPlayedActivityMs(b, latestHours.get(b.id)) -
    lastPlayedActivityMs(a, latestHours.get(a.id))
  );
}
