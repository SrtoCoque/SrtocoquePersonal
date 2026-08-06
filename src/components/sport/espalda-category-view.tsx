"use client";

import { StrengthCategoryView } from "@/components/sport/strength-category-view";
import { ESPALDA_EXERCISES } from "@/lib/sport";

export function EspaldaCategoryView({
  email,
  userId,
}: {
  email: string | null;
  userId: string;
}) {
  return (
    <StrengthCategoryView
      email={email}
      userId={userId}
      category="espalda"
      title="Espalda"
      exercises={ESPALDA_EXERCISES}
    />
  );
}
