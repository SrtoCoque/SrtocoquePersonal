"use client";

import { StrengthCategoryView } from "@/components/sport/strength-category-view";
import { PECHO_EXERCISES } from "@/lib/sport";

export function PechoCategoryView({
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
      category="pecho"
      title="Pecho"
      exercises={PECHO_EXERCISES}
    />
  );
}
