import type { GamePlaythroughKind, GameStatus } from "@/lib/types";

export type SteamHoursPlaythrough = {
  id: string;
  kind: GamePlaythroughKind;
  hours_played: number;
  created_at: string;
  storefront?: string | null;
};

export type SteamHoursAllocation = {
  /** Horas de la sesión / resto atribuible a Steam */
  steamSessionHours: number;
  /** Escribir en user_games.hours_played (partida actual visible) */
  updateMainHours: boolean;
  mainHours?: number;
  /** Actualizar partida del historial (solo si es de Steam) */
  playthroughUpdate?: { id: string; hours_played: number };
};

function isSteamPlaythrough(
  p: SteamHoursPlaythrough,
  steamOnly: boolean,
): boolean {
  if (p.storefront === "steam") return true;
  // Solo-Steam: partidas antiguas sin tienda cuentan como Steam
  if (steamOnly && (p.storefront == null || p.storefront === "")) return true;
  return false;
}

/**
 * Reparte horas de Steam según tienda de la partida actual.
 *
 * - Solo Steam: alinea hours_played (y historial Steam) con el total de Steam.
 * - Varias tiendas + jugando/completado en Steam: suma el excedente a esa partida.
 * - Varias tiendas + jugando en otra: no toca hours_played; guarda el resto en
 *   steam_hours_played (sesión Steam aparte).
 */
export function allocateSteamHours(input: {
  status: GameStatus;
  steamHours: number;
  currentHours: number;
  playStorefront: string | null | undefined;
  playthroughs: SteamHoursPlaythrough[];
  steamOnly: boolean;
}): SteamHoursAllocation {
  const steamHours = Math.max(0, Number(input.steamHours) || 0);
  const currentHours = Math.max(0, Number(input.currentHours) || 0);
  const { status, steamOnly } = input;
  const playingOnSteam = steamOnly || input.playStorefront === "steam";

  const steamPts = input.playthroughs
    .filter((p) => isSteamPlaythrough(p, steamOnly))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const sumSteamArchived = steamPts.reduce(
    (acc, p) => acc + (Number(p.hours_played) || 0),
    0,
  );

  const session = Math.max(0, steamHours - sumSteamArchived);

  const pickMain = (allocated: number, fallback = currentHours) =>
    steamOnly ? Math.max(0, allocated) : Math.max(fallback, allocated);

  if (status === "owned") {
    // Biblioteca / sin empezar: las horas de Steam van al juego aunque no esté «Jugando»
    return {
      steamSessionHours: session,
      updateMainHours: true,
      mainHours: pickMain(session),
    };
  }

  if (status === "wishlist") {
    return { steamSessionHours: session, updateMainHours: false };
  }

  if (
    status === "playing" ||
    status === "replaying" ||
    status === "dropped"
  ) {
    if (playingOnSteam) {
      return {
        steamSessionHours: session,
        updateMainHours: true,
        mainHours: pickMain(session),
      };
    }
    return { steamSessionHours: session, updateMainHours: false };
  }

  // completed
  if (!playingOnSteam) {
    return { steamSessionHours: session, updateMainHours: false };
  }

  if (steamPts.length === 0) {
    return {
      steamSessionHours: session,
      updateMainHours: true,
      mainHours: pickMain(steamHours),
    };
  }

  const latest = steamPts[steamPts.length - 1]!;
  const prior = sumSteamArchived - (Number(latest.hours_played) || 0);
  const latestHours = pickMain(
    steamHours - prior,
    Number(latest.hours_played) || 0,
  );

  return {
    steamSessionHours: latestHours,
    updateMainHours: true,
    mainHours: latestHours,
    playthroughUpdate: {
      id: latest.id,
      hours_played: latestHours,
    },
  };
}
