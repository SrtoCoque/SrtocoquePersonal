"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Clapperboard,
  Dumbbell,
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
    description: "Tu biblioteca de lecturas",
    icon: BookOpen,
    available: true,
    image: "/home/libros.jpg",
  },
  {
    href: "/games",
    title: "Videojuegos",
    description: "Wishlist, jugando y completados",
    icon: Gamepad2,
    available: true,
    image: "/home/videojuegos.jpg",
  },
  {
    href: "#",
    title: "Series",
    description: "Próximamente",
    icon: Tv,
    available: false,
    image: "/home/series.jpg",
  },
  {
    href: "/movies",
    title: "Películas",
    description: "Wishlist y vistas",
    icon: Clapperboard,
    available: true,
    image: "/home/peliculas.jpg",
  },
  {
    href: "/deporte",
    title: "Deporte",
    description: "Ejercicios por grupo muscular",
    icon: Dumbbell,
    available: true,
    image: "/home/deporte.jpg",
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
      <header className="sticky top-0 z-40 overflow-x-clip border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full min-w-0 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
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
              "group relative flex min-h-[8.5rem] flex-col justify-end overflow-hidden rounded-2xl border border-[var(--border)] p-4 text-left transition-all sm:min-h-[9.5rem] sm:p-5",
              section.available
                ? "hover:-translate-y-1 hover:border-white/40 hover:shadow-lg hover:shadow-black/20"
                : "cursor-not-allowed opacity-70",
            );

            const content = (
              <>
                <Image
                  src={section.image}
                  alt=""
                  fill
                  className={cn(
                    "object-cover brightness-[0.55] contrast-[0.9] saturate-[0.45] transition-[transform,filter] duration-500",
                    section.available &&
                      "group-hover:scale-[1.04] group-hover:brightness-[0.5] group-hover:saturate-[0.5]",
                    !section.available && "grayscale-[55%] brightness-[0.45]",
                  )}
                  sizes="(max-width:640px) 100vw, 50vw"
                  priority
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/55 to-black/40"
                />
                <div className="relative z-10">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white drop-shadow-sm sm:text-xl">
                    {section.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-white/80">
                    {section.description}
                  </p>
                  {!section.available && (
                    <span className="mt-2 inline-flex w-fit rounded-md bg-white/15 px-2 py-0.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                      Próximamente
                    </span>
                  )}
                </div>
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
