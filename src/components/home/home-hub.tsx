"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Clapperboard,
  Gamepad2,
  LogOut,
  Tv,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    href: "/library",
    title: "Libros",
    description: "Tu estantería de lecturas",
    icon: BookOpen,
    available: true,
    accent: "from-teal-500/20 to-cyan-500/5",
  },
  {
    href: "/games",
    title: "Videojuegos",
    description: "Wishlist, jugando y completados",
    icon: Gamepad2,
    available: true,
    accent: "from-violet-500/20 to-fuchsia-500/5",
  },
  {
    href: "#",
    title: "Series",
    description: "Próximamente",
    icon: Tv,
    available: false,
    accent: "from-amber-500/10 to-orange-500/5",
  },
  {
    href: "#",
    title: "Películas",
    description: "Próximamente",
    icon: Clapperboard,
    available: false,
    accent: "from-rose-500/10 to-red-500/5",
  },
] as const;

export function HomeHub({ email }: { email: string | null }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)]">
              <BookOpen className="h-4 w-4" />
            </span>
            <span>Callejón Diagon</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {email && (
              <span className="hidden md:inline max-w-[160px] truncate text-xs text-[var(--muted)]">
                {email}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar sesión"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-10 animate-fade-in">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
            ¿Qué quieres explorar?
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            Elige una sección de tu biblioteca personal
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 animate-slide-up">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const cardClass = cn(
              "group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br p-6 text-left transition-all",
              section.accent,
              section.available
                ? "hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-lg hover:shadow-[var(--accent)]/10"
                : "cursor-not-allowed opacity-60",
            );

            const content = (
              <>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--accent)] shadow-sm">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {section.description}
                </p>
                {!section.available && (
                  <span className="mt-4 inline-flex w-fit rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--muted)]">
                    Próximamente
                  </span>
                )}
              </>
            );

            if (!section.available) {
              return (
                <div key={section.title} className={cardClass}>
                  {content}
                </div>
              );
            }

            return (
              <Link key={section.title} href={section.href} className={cardClass}>
                {content}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
