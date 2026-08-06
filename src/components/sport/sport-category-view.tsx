"use client";

import { StrengthCategoryView } from "@/components/sport/strength-category-view";
import type { SportCategorySlug } from "@/lib/sport";
import {
  ESPALDA_EXERCISES,
  HOMBROS_EXERCISES,
  PECHO_EXERCISES,
  getSportCategory,
} from "@/lib/sport";

const CATALOGS: Partial<
  Record<
    SportCategorySlug,
    readonly { slug: string; title: string; image?: string | null }[]
  >
> = {
  pecho: PECHO_EXERCISES,
  espalda: ESPALDA_EXERCISES,
  hombros: HOMBROS_EXERCISES,
  biceps: [],
  triceps: [],
  abdominales: [],
};

/** Grupos de fuerza (todo menos cardio). */
const STRENGTH_SLUGS = new Set<SportCategorySlug>([
  "pecho",
  "espalda",
  "hombros",
  "biceps",
  "triceps",
  "abdominales",
]);

export function SportCategoryView({
  email,
  userId,
  slug,
}: {
  email: string | null;
  userId: string;
  slug: SportCategorySlug;
}) {
  const category = getSportCategory(slug);
  if (!category) return null;

  if (STRENGTH_SLUGS.has(slug)) {
    return (
      <StrengthCategoryView
        email={email}
        userId={userId}
        category={slug}
        title={category.title}
        exercises={CATALOGS[slug] ?? []}
      />
    );
  }

  return null;
}
