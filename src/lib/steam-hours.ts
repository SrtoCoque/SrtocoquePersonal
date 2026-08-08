import type { GameStatus } from "@/lib/types";

export type SteamHoursAllocation = {
  /** Horas de la sesión / total atribuible a Steam en ficha */
  steamSessionHours: number;
  /** Escribir en user_games.hours_played */
  updateMainHours: boolean;
  mainHours?: number;
};

/**
 * Reparte horas de Steam sobre la ficha (sin historial de partidas).
 *
 * - Solo Steam / jugando en Steam: escribe steam_hours_played y solo
 *   sube hours_played si Steam trae más (nunca baja un valor manual).
 * - Jugando en otra tienda: no toca hours_played; guarda en steam_hours_played.
 */
export function allocateSteamHours(input: {
  status: GameStatus;
  steamHours: number;
  currentHours: number;
  playStorefront: string | null | undefined;
  steamOnly: boolean;
}): SteamHoursAllocation {
  const steamHours = Math.max(0, Number(input.steamHours) || 0);
  const currentHours = Math.max(0, Number(input.currentHours) || 0);
  const { status, steamOnly } = input;
  // Compat: filas antiguas «replaying» se tratan como jugando
  const normalized: GameStatus =
    (status as string) === "replaying" ? "playing" : status;
  const playingOnSteam = steamOnly || input.playStorefront === "steam";

  // Nunca bajar horas manuales: si pusiste 140 y Steam dice 60, se quedan 140
  const pickMain = (allocated: number) =>
    Math.max(currentHours, Math.max(0, allocated));

  if (normalized === "wishlist") {
    return { steamSessionHours: steamHours, updateMainHours: false };
  }

  if (normalized === "owned") {
    return {
      steamSessionHours: steamHours,
      updateMainHours: true,
      mainHours: pickMain(steamHours),
    };
  }

  if (
    normalized === "playing" ||
    normalized === "dropped" ||
    normalized === "completed"
  ) {
    if (playingOnSteam) {
      return {
        steamSessionHours: steamHours,
        updateMainHours: true,
        mainHours: pickMain(steamHours),
      };
    }
    return { steamSessionHours: steamHours, updateMainHours: false };
  }

  return { steamSessionHours: steamHours, updateMainHours: false };
}
