"use client";

import { StrengthCategoryView } from "@/components/sport/strength-category-view";
import { HOMBROS_EXERCISES } from "@/lib/sport";

export function HombrosCategoryView({
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
      category="hombros"
      title="Hombros"
      exercises={HOMBROS_EXERCISES}
    />
  );
}
