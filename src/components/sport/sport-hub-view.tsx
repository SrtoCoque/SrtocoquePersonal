"use client";

import Link from "next/link";
import {
  Activity,
  Dumbbell,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";
import { SportHeader } from "@/components/layout/sport-header";
import { SPORT_CATEGORIES } from "@/lib/sport";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  activity: Activity,
};

export function SportHubView({ email }: { email: string | null }) {
  const cardio = SPORT_CATEGORIES.find((c) => c.slug === "cardio");
  const strength = SPORT_CATEGORIES.filter((c) => c.slug !== "cardio");

  return (
    <div className="min-h-screen">
      <SportHeader email={email} />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-5 animate-fade-in sm:mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-4xl">
            Deporte
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted)] sm:mt-2 sm:text-base">
            Elige un grupo muscular o cardio
          </p>
        </div>

        {/* —— Móvil: mosaico —— */}
        <div className="grid grid-cols-2 gap-2.5 animate-slide-up sm:hidden">
          {cardio ? (
            <Link
              href={`/deporte/${cardio.slug}`}
              className={cn(
                "col-span-2 flex aspect-[2.35/1] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br p-4 transition-transform active:scale-[0.98]",
                cardio.accent,
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)] text-emerald-600 shadow-sm dark:text-emerald-400">
                <HeartPulse className="h-6 w-6" />
              </span>
              <span className="text-center">
                <span className="block font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                  {cardio.title}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  {cardio.description}
                </span>
              </span>
            </Link>
          ) : null}

          {strength.map((cat) => {
            const Icon = ICONS[cat.icon] ?? Dumbbell;
            return (
              <Link
                key={cat.slug}
                href={`/deporte/${cat.slug}`}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br p-3 transition-transform active:scale-[0.98]",
                  cat.accent,
                )}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface)] text-emerald-600 shadow-sm dark:text-emerald-400">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
                  {cat.title}
                </span>
              </Link>
            );
          })}
        </div>

        {/* —— Desktop / tablet: filas con descripción —— */}
        <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 animate-slide-up">
          {SPORT_CATEGORIES.map((cat) => {
            const Icon = ICONS[cat.icon] ?? Dumbbell;
            return (
              <Link
                key={cat.slug}
                href={`/deporte/${cat.slug}`}
                className={cn(
                  "group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br p-5 transition-all",
                  cat.accent,
                  "hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10",
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-emerald-600 shadow-sm dark:text-emerald-400">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                    {cat.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-[var(--muted)]">
                    {cat.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
