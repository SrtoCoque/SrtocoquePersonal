"use client";

import Link from "next/link";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { SportHeader } from "@/components/layout/sport-header";
import type { SportCategorySlug } from "@/lib/sport";
import { getSportCategory } from "@/lib/sport";

export function SportCategoryView({
  email,
  slug,
}: {
  email: string | null;
  slug: SportCategorySlug;
}) {
  const category = getSportCategory(slug);
  if (!category) return null;

  return (
    <div className="min-h-screen">
      <SportHeader email={email} />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/deporte"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a grupos
        </Link>

        <div className="mb-8 animate-fade-in">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
            {category.title}
          </h1>
          <p className="mt-2 text-[var(--muted)]">{category.description}</p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-6 py-16 text-center animate-slide-up">
          <Dumbbell className="mb-3 h-10 w-10 text-[var(--muted)] opacity-50" />
          <p className="font-[family-name:var(--font-display)] text-lg font-medium">
            Aún no hay ejercicios
          </p>
          <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
            Cuando me digas los de {category.title.toLowerCase()}, los
            añadimos aquí.
          </p>
        </div>
      </main>
    </div>
  );
}
