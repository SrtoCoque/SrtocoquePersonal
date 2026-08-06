"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bike, Footprints } from "lucide-react";
import { SportHeader } from "@/components/layout/sport-header";
import {
  CARDIO_ACTIVITIES,
  formatLastPerformedLabel,
  type CardioActivitySlug,
} from "@/lib/sport";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function CardioHubView({
  email,
  userId,
}: {
  email: string | null;
  userId: string;
}) {
  const [lastByActivity, setLastByActivity] = useState<
    Partial<Record<CardioActivitySlug, string>>
  >({});

  const loadLastDates = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_cardio_workouts")
      .select("activity, performed_at")
      .eq("user_id", userId)
      .order("performed_at", { ascending: false });

    const map: Partial<Record<CardioActivitySlug, string>> = {};
    for (const row of data ?? []) {
      const activity = row.activity as CardioActivitySlug;
      const day = (row.performed_at as string)?.slice(0, 10);
      if (!activity || !day || map[activity]) continue;
      map[activity] = day;
    }
    setLastByActivity(map);
  }, [userId]);

  useEffect(() => {
    loadLastDates();
  }, [loadLastDates]);

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
            Cardio
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Elige actividad para registrar entrenos
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 animate-slide-up">
          {CARDIO_ACTIVITIES.map((activity) => {
            const Icon = activity.slug === "correr" ? Footprints : Bike;
            const lastLabel = formatLastPerformedLabel(
              lastByActivity[activity.slug],
            );
            return (
              <Link
                key={activity.slug}
                href={`/deporte/cardio/${activity.slug}`}
                className={cn(
                  "group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br p-5 transition-all",
                  activity.accent,
                  "hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10",
                )}
              >
                {lastLabel ? (
                  <span className="absolute right-3 top-3 z-10 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    {lastLabel}
                  </span>
                ) : null}
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-emerald-600 shadow-sm dark:text-emerald-400">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 pr-14">
                  <span className="block font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                    {activity.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-[var(--muted)]">
                    {activity.description}
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
