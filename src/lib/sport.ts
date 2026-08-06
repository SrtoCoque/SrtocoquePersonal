export const SPORT_CATEGORIES = [
  {
    slug: "cardio",
    title: "Cardio",
    description: "Correr y bicicleta",
    accent: "from-orange-500/20 to-amber-500/5",
    icon: "heart-pulse",
  },
  {
    slug: "pecho",
    title: "Pecho",
    description: "Press y aperturas",
    accent: "from-sky-500/20 to-cyan-500/5",
    icon: "dumbbell",
  },
  {
    slug: "espalda",
    title: "Espalda",
    description: "Jalones y remos",
    accent: "from-emerald-500/20 to-teal-500/5",
    icon: "dumbbell",
  },
  {
    slug: "hombros",
    title: "Hombros",
    description: "Elevaciones y press",
    accent: "from-lime-500/20 to-green-500/5",
    icon: "dumbbell",
  },
  {
    slug: "biceps",
    title: "Bíceps",
    description: "Curl y variantes",
    accent: "from-blue-500/20 to-indigo-500/5",
    icon: "dumbbell",
  },
  {
    slug: "triceps",
    title: "Tríceps",
    description: "Fondos y extensiones",
    accent: "from-cyan-500/20 to-sky-500/5",
    icon: "dumbbell",
  },
  {
    slug: "abdominales",
    title: "Abdominales",
    description: "Core y estabilidad",
    accent: "from-teal-500/20 to-emerald-500/5",
    icon: "activity",
  },
] as const;

export type SportCategorySlug = (typeof SPORT_CATEGORIES)[number]["slug"];

export const CARDIO_ACTIVITIES = [
  {
    slug: "correr",
    title: "Correr",
    description: "Entrenos de carrera · ritmo min/km",
    accent: "from-orange-500/20 to-red-500/5",
  },
  {
    slug: "bicicleta",
    title: "Bicicleta",
    description: "Entrenos en bici · ritmo min/km",
    accent: "from-sky-500/20 to-cyan-500/5",
  },
] as const;

export type CardioActivitySlug = (typeof CARDIO_ACTIVITIES)[number]["slug"];

export type UserCardioWorkout = {
  id: string;
  user_id: string;
  activity: CardioActivitySlug;
  distance_km: number;
  duration_seconds: number;
  performed_at: string;
  notes: string | null;
  created_at: string;
};

export type StrengthSet = {
  weight_kg: number | null;
  reps: number | null;
};

/** Resumen de la última sesión: "40×10 · 40×8" o "10 · 10 · 8" */
export function formatStrengthSetsSummary(sets: StrengthSet[]): string | null {
  if (!Array.isArray(sets) || sets.length === 0) return null;
  const parts = sets
    .map((s) => {
      const w = s.weight_kg;
      const r = s.reps;
      if (w != null && r != null) return `${w}×${r}`;
      if (w != null) return `${w} kg`;
      if (r != null) return `${r} reps`;
      return null;
    })
    .filter((p): p is string => Boolean(p));
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export type UserStrengthSession = {
  id: string;
  user_id: string;
  category: string;
  exercise_slug: string;
  exercise_title: string | null;
  performed_at: string;
  sets: StrengthSet[];
  notes: string | null;
  created_at: string;
};

/** Orden: Press cerrado inclinado tras apertura inclinado */
export const PECHO_EXERCISES = [
  {
    slug: "press-plano",
    title: "Press plano",
    image: "/sport/pecho/press-plano.png",
  },
  {
    slug: "apertura-plano",
    title: "Apertura plano",
    image: "/sport/pecho/apertura-plano.png",
  },
  {
    slug: "press-cerrado-plano",
    title: "Press cerrado plano",
    image: "/sport/pecho/press-cerrado-plano.png",
  },
  {
    slug: "press-inclinado",
    title: "Press inclinado",
    image: "/sport/pecho/press-inclinado.png",
  },
  {
    slug: "apertura-inclinado",
    title: "Apertura inclinado",
    image: "/sport/pecho/apertura-inclinado.png",
  },
  {
    slug: "press-cerrado-inclinado",
    title: "Press cerrado inclinado",
    image: "/sport/pecho/press-cerrado-inclinado.png",
  },
  {
    slug: "pullover",
    title: "Pullover",
    image: "/sport/pecho/pullover.png",
  },
  {
    slug: "flexiones",
    title: "Flexiones",
    image: "/sport/pecho/flexiones.png",
  },
  {
    slug: "elevaciones-frontales",
    title: "Elevaciones frontales",
    image: "/sport/pecho/elevaciones-frontales.png",
  },
] as const;

export type PechoExerciseSlug = (typeof PECHO_EXERCISES)[number]["slug"];

export const ESPALDA_EXERCISES = [
  {
    slug: "remo",
    title: "Remo",
    image: "/sport/espalda/remo.png",
  },
  {
    slug: "remo-abierto",
    title: "Remo abierto",
    image: "/sport/espalda/remo-abierto.png",
  },
  {
    slug: "lumbares",
    title: "Lumbares",
    image: "/sport/espalda/lumbares.png",
  },
  {
    slug: "remo-banco",
    title: "Remo banco",
    image: "/sport/espalda/remo-banco.png",
  },
] as const;

export type EspaldaExerciseSlug = (typeof ESPALDA_EXERCISES)[number]["slug"];

/** Orden: Press Arnold con cierre justo después del Press de Arnold */
export const HOMBROS_EXERCISES = [
  {
    slug: "elevacion-frontal",
    title: "Elevación frontal",
    image: "/sport/hombros/elevacion-frontal.png",
  },
  {
    slug: "elevacion-lateral",
    title: "Elevación lateral",
    image: "/sport/hombros/elevacion-lateral.png",
  },
  {
    slug: "press-arnold",
    title: "Press de Arnold",
    image: "/sport/hombros/press-arnold.png",
  },
  {
    slug: "press-arnold-cierre",
    title: "Press de Arnold con cierre",
    image: "/sport/hombros/press-arnold-cierre.png",
  },
  {
    slug: "remo-vertical",
    title: "Remo vertical",
    image: "/sport/hombros/remo-vertical.png",
  },
  {
    slug: "elevacion-frontal-1-mancuerna",
    title: "Elevación frontal 1 mancuerna",
    image: "/sport/hombros/elevacion-frontal-1-mancuerna.png",
  },
  {
    slug: "elevacion-banco-inclinado",
    title: "Elevación en banco inclinado",
    image: "/sport/hombros/elevacion-banco-inclinado.png",
  },
] as const;

export type HombrosExerciseSlug = (typeof HOMBROS_EXERCISES)[number]["slug"];

export function getSportCategory(slug: string) {
  return SPORT_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function isSportCategorySlug(slug: string): slug is SportCategorySlug {
  return SPORT_CATEGORIES.some((c) => c.slug === slug);
}

export function getCardioActivity(slug: string) {
  return CARDIO_ACTIVITIES.find((a) => a.slug === slug) ?? null;
}

export function isCardioActivitySlug(slug: string): slug is CardioActivitySlug {
  return CARDIO_ACTIVITIES.some((a) => a.slug === slug);
}

export function getPechoExercise(slug: string) {
  return PECHO_EXERCISES.find((e) => e.slug === slug) ?? null;
}

export function getEspaldaExercise(slug: string) {
  return ESPALDA_EXERCISES.find((e) => e.slug === slug) ?? null;
}

export const LIBRE_SLUG_PREFIX = "libre-";

export function isLibreExerciseSlug(slug: string): boolean {
  return slug.startsWith(LIBRE_SLUG_PREFIX);
}

/** Genera slug estable para un ejercicio libre a partir del nombre. */
export function libreExerciseSlug(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${LIBRE_SLUG_PREFIX}${base || "ejercicio"}`;
}

/**
 * Último día: nombre del día de la semana si ≤ 7 días;
 * si es hoy → "Hoy"; si hace más de 7 días → fecha corta.
 */
export function formatLastPerformedLabel(
  isoDate: string | null | undefined,
  now = new Date(),
): string | null {
  if (!isoDate) return null;
  const day = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(day.getTime())) return null;

  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const diffMs = today.getTime() - day.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return day.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  }
  if (diffDays === 0) return "Hoy";
  if (diffDays <= 7) {
    const name = day.toLocaleDateString("es-ES", { weekday: "long" });
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return day.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: diffDays > 365 ? "numeric" : undefined,
  });
}

/** Segundos totales → "1h 05:30" o "45:12" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Ritmo: segundos / km → "5:24 /km" */
export function formatPaceMinPerKm(
  distanceKm: number,
  durationSeconds: number,
): string | null {
  if (!(distanceKm > 0) || !(durationSeconds > 0)) return null;
  const secPerKm = durationSeconds / distanceKm;
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  const adjMins = secs === 60 ? mins + 1 : mins;
  const adjSecs = secs === 60 ? 0 : secs;
  return `${adjMins}:${String(adjSecs).padStart(2, "0")} /km`;
}

export function durationFromParts(
  hours: number,
  minutes: number,
  seconds: number,
): number {
  return (
    Math.max(0, hours) * 3600 +
    Math.max(0, minutes) * 60 +
    Math.max(0, seconds)
  );
}
