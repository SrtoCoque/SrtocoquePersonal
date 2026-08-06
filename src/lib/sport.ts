export const SPORT_CATEGORIES = [
  {
    slug: "cardio",
    title: "Cardio",
    description: "Resistencia y ritmo",
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

export function getSportCategory(slug: string) {
  return SPORT_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function isSportCategorySlug(slug: string): slug is SportCategorySlug {
  return SPORT_CATEGORIES.some((c) => c.slug === slug);
}
