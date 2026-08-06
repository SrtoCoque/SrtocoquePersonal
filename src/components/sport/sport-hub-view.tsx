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
  return (
    <div className="min-h-screen">
      <SportHeader email={email} />

      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
            Deporte
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Elige un grupo muscular o cardio para ver sus ejercicios
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-slide-up">
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
