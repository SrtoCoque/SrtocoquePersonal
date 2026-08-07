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
    description: "Curl y antebrazos",
    accent: "from-blue-500/20 to-indigo-500/5",
    icon: "dumbbell",
  },
  {
    slug: "triceps",
    title: "Tríceps",
    description: "Extensiones y patadas",
    accent: "from-cyan-500/20 to-sky-500/5",
    icon: "dumbbell",
  },
  {
    slug: "piernas",
    title: "Piernas",
    description: "Sentadillas, femorales y gemelos",
    accent: "from-yellow-500/20 to-amber-500/5",
    icon: "dumbbell",
  },
  {
    slug: "abdominales",
    title: "Abdominales",
    description: "Plancha y core",
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
  {
    slug: "cable-low-fly",
    title: "Cable low fly",
    image: "/sport/pecho/cable-low-fly-1.png",
    images: [
      "/sport/pecho/cable-low-fly-1.png",
      "/sport/pecho/cable-low-fly-2.png",
    ],
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
  {
    slug: "upright-row",
    title: "Upright row",
    image: "/sport/espalda/upright-row-1.png",
    images: [
      "/sport/espalda/upright-row-1.png",
      "/sport/espalda/upright-row-2.png",
    ],
  },
  {
    slug: "apertura-remo-inclinado",
    title: "Apertura remo inclinado",
    image: "/sport/espalda/apertura-remo-inclinado.png",
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
  {
    slug: "pike-push-up",
    title: "Pike push up",
    image: "/sport/hombros/pike-push-up.png",
  },
  {
    slug: "shrug",
    title: "Shrug",
    image: "/sport/hombros/shrug.png",
  },
  {
    slug: "shrug-banco",
    title: "Shrug banco",
    image: "/sport/hombros/shrug-banco.png",
  },
] as const;

export type HombrosExerciseSlug = (typeof HOMBROS_EXERCISES)[number]["slug"];

export const BICEPS_EXERCISES = [
  {
    slug: "curl-horizontal",
    title: "Curl horizontal",
    image: "/sport/biceps/curl-horizontal.png",
  },
  {
    slug: "curl-recto",
    title: "Curl recto",
    image: "/sport/biceps/curl-recto.png",
  },
  {
    slug: "antebrazos",
    title: "Antebrazos",
    image: "/sport/biceps/antebrazos.png",
  },
  {
    slug: "dumbbell-incline",
    title: "Dumbbell incline",
    image: "/sport/biceps/dumbbell-incline-1.png",
    images: [
      "/sport/biceps/dumbbell-incline-1.png",
      "/sport/biceps/dumbbell-incline-2.png",
    ],
  },
  {
    slug: "curl-lateral",
    title: "Curl lateral",
    image: "/sport/biceps/curl-lateral.png",
  },
  {
    slug: "curl-reverse",
    title: "Curl reverse",
    image: "/sport/biceps/curl-reverse.png",
  },
] as const;

export type BicepsExerciseSlug = (typeof BICEPS_EXERCISES)[number]["slug"];

export const TRICEPS_EXERCISES = [
  {
    slug: "triceps",
    title: "Tríceps",
    image: "/sport/triceps/triceps.png",
  },
  {
    slug: "curl-plano",
    title: "Curl plano",
    image: "/sport/triceps/curl-plano.png",
  },
  {
    slug: "curl-de-pie",
    title: "Curl de pie",
    image: "/sport/triceps/curl-de-pie.png",
  },
  {
    slug: "patada-trasera",
    title: "Patada trasera",
    image: "/sport/triceps/patada-trasera.png",
  },
  {
    slug: "flexiones-triceps-cerrado",
    title: "Flexiones tríceps cerrado",
    image: "/sport/triceps/flexiones-triceps-cerrado.png",
  },
  {
    slug: "curl-cerrado-plano",
    title: "Curl cerrado plano",
    image: "/sport/triceps/curl-cerrado-plano-1.png",
    images: [
      "/sport/triceps/curl-cerrado-plano-1.png",
      "/sport/triceps/curl-cerrado-plano-2.png",
    ],
  },
] as const;

export type TricepsExerciseSlug = (typeof TRICEPS_EXERCISES)[number]["slug"];

export const PIERNAS_EXERCISES = [
  {
    slug: "sentadilla-abierta",
    title: "Sentadilla abierta",
    image: "/sport/piernas/sentadilla-abierta.png",
  },
  {
    slug: "sentadilla-cerrada",
    title: "Sentadilla cerrada",
    image: "/sport/piernas/sentadilla-cerrada.png",
  },
  {
    slug: "dumbbell-largo",
    title: "Dumbbell largo",
    image: "/sport/piernas/dumbbell-largo.png",
  },
  {
    slug: "sentadilla-banco",
    title: "Sentadilla banco",
    image: "/sport/piernas/sentadilla-banco.png",
  },
  {
    slug: "femorales",
    title: "Femorales",
    image: "/sport/piernas/femorales.png",
  },
  {
    slug: "femoral-banco",
    title: "Femoral banco",
    image: "/sport/piernas/femoral-banco.png",
  },
  {
    slug: "gemelos",
    title: "Gemelos",
    image: "/sport/piernas/gemelos.png",
  },
  {
    slug: "gemelos-sentado",
    title: "Gemelos sentado",
    image: "/sport/piernas/gemelos-sentado.png",
  },
  {
    slug: "hip-thrust",
    title: "Hip thrust",
    image: "/sport/piernas/hip-thrust.png",
  },
] as const;

export type PiernasExerciseSlug = (typeof PIERNAS_EXERCISES)[number]["slug"];

export const ABDOMINALES_EXERCISES = [
  {
    slug: "plancha",
    title: "Plancha",
    image: "/sport/abdominales/plancha.png",
  },
  {
    slug: "plancha-lateral",
    title: "Plancha lateral",
    image: "/sport/abdominales/plancha-lateral.png",
  },
  {
    slug: "kettlebel-lateral",
    title: "Kettlebel lateral",
    image: "/sport/abdominales/kettlebel-lateral.png",
  },
  {
    slug: "bicycle-twisting",
    title: "Bicycle twisting",
    image: "/sport/abdominales/bicycle-twisting.png",
  },
  {
    slug: "dumbbell-lateral",
    title: "Dumbbell lateral",
    image: "/sport/abdominales/dumbbell-lateral.png",
  },
  {
    slug: "abdominal",
    title: "Abdominal",
    image: "/sport/abdominales/abdominal.png",
  },
  {
    slug: "abdominal-lateral",
    title: "Abdominal lateral",
    image: "/sport/abdominales/abdominal-lateral.png",
  },
  {
    slug: "abdominal-patada",
    title: "Abdominal patada",
    image: "/sport/abdominales/abdominal-patada.png",
  },
  {
    slug: "abdominal-pierna-arriba-lateral",
    title: "Abdominal pierna arriba lateral",
    image: "/sport/abdominales/abdominal-pierna-arriba-lateral.png",
  },
  {
    slug: "rodillo",
    title: "Rodillo",
    image: "/sport/abdominales/rodillo.png",
  },
  {
    slug: "abdominal-banco",
    title: "Abdominal banco",
    image: "/sport/abdominales/abdominal-banco-1.png",
    images: [
      "/sport/abdominales/abdominal-banco-1.png",
      "/sport/abdominales/abdominal-banco-2.png",
    ],
  },
  {
    slug: "cintura-arriba",
    title: "Cintura arriba",
    image: "/sport/abdominales/cintura-arriba.png",
  },
  {
    slug: "manos-y-piernas-arriba",
    title: "Manos y piernas arriba",
    image: "/sport/abdominales/manos-y-piernas-arriba.png",
  },
  {
    slug: "cruce-piernas",
    title: "Cruce piernas",
    image: "/sport/abdominales/cruce-piernas.png",
  },
  {
    slug: "pierna-arriba-banco",
    title: "Pierna arriba banco",
    image: "/sport/abdominales/pierna-arriba-banco.png",
  },
  {
    slug: "salto-mancuerna",
    title: "Salto mancuerna",
    image: "/sport/abdominales/salto-mancuerna.png",
  },
  {
    slug: "recto-suelo-de-pie",
    title: "Recto suelo, de pie",
    image: "/sport/abdominales/recto-suelo-de-pie.png",
  },
] as const;

export type AbdominalesExerciseSlug =
  (typeof ABDOMINALES_EXERCISES)[number]["slug"];

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

const ALL_STRENGTH_EXERCISES = [
  ...PECHO_EXERCISES,
  ...ESPALDA_EXERCISES,
  ...HOMBROS_EXERCISES,
  ...BICEPS_EXERCISES,
  ...TRICEPS_EXERCISES,
  ...PIERNAS_EXERCISES,
  ...ABDOMINALES_EXERCISES,
] as const;

/** Imágenes de un ejercicio (una o varias fases). */
export function getExerciseImages(exercise: {
  image?: string | null;
  images?: readonly string[] | null;
}): string[] {
  if (exercise.images && exercise.images.length > 0) {
    return [...exercise.images];
  }
  if (exercise.image) return [exercise.image];
  return [];
}

/** Título visible de un ejercicio de fuerza (catálogo o guardado). */
export function resolveStrengthExerciseTitle(
  slug: string,
  savedTitle?: string | null,
): string {
  const saved = savedTitle?.trim();
  if (saved) return saved;
  const fromCatalog = ALL_STRENGTH_EXERCISES.find((e) => e.slug === slug);
  if (fromCatalog) return fromCatalog.title;
  return slug;
}

/** Orden de grupos para resúmenes del historial (incluye cardio). */
export const STRENGTH_CATEGORY_ORDER = [
  "cardio",
  "pecho",
  "espalda",
  "hombros",
  "biceps",
  "triceps",
  "piernas",
  "abdominales",
] as const;

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
