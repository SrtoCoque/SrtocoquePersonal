/** Tipos y helpers de tiendas (usable en server y client). */

export const GAME_STOREFRONTS = [
  "steam",
  "playstation",
  "xbox",
  "nintendo",
  "gog",
  "epic",
  "downloaded",
] as const;

export type GameStorefront = (typeof GAME_STOREFRONTS)[number];

export const GAME_STOREFRONT_LABELS: Record<GameStorefront, string> = {
  steam: "Steam",
  playstation: "PlayStation",
  xbox: "Xbox",
  nintendo: "Nintendo",
  gog: "GOG",
  epic: "Epic",
  downloaded: "Descargado",
};

export function isGameStorefront(value: unknown): value is GameStorefront {
  return (
    typeof value === "string" &&
    (GAME_STOREFRONTS as readonly string[]).includes(value)
  );
}

/** Normaliza array o valor singular legado. */
export function normalizeStorefronts(value: unknown): GameStorefront[] {
  if (Array.isArray(value)) {
    return value.filter(isGameStorefront);
  }
  if (isGameStorefront(value)) return [value];
  return [];
}

export function toggleStorefront(
  current: GameStorefront[],
  id: GameStorefront,
): GameStorefront[] {
  return current.includes(id)
    ? current.filter((s) => s !== id)
    : [...current, id];
}

/**
 * Infiere tiendas posibles a partir de los nombres de plataforma de IGDB.
 * Si no hay coincidencias claras, devuelve [].
 */
export function storefrontsFromPlatformNames(
  platforms: string[] | null | undefined,
): GameStorefront[] {
  if (!platforms?.length) return [];
  const found = new Set<GameStorefront>();

  for (const raw of platforms) {
    const p = raw.toLowerCase();
    if (/playstation|\bps\s?[1-5]\b|\bpsvita\b|\bpsp\b/.test(p)) {
      found.add("playstation");
    }
    if (/xbox/.test(p)) found.add("xbox");
    if (
      /nintendo|switch|\bwii\b|3ds|gamecube|\bnes\b|\bsnes\b|game\s?boy|n64/.test(
        p,
      )
    ) {
      found.add("nintendo");
    }
    if (/steam/.test(p)) found.add("steam");
    if (/\bgog\b/.test(p)) found.add("gog");
    if (/epic/.test(p)) found.add("epic");
    if (
      /\bpc\b|windows|microsoft windows|mac(os)?|os\s?x|linux/.test(p) &&
      !/playstation|xbox|nintendo|switch/.test(p)
    ) {
      found.add("steam");
      found.add("gog");
      found.add("epic");
    }
  }

  return GAME_STOREFRONTS.filter((id) => found.has(id));
}

export function formatStorefrontPrice(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}
