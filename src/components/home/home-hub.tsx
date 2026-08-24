"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookMarked,
  BookOpen,
  Clapperboard,
  Dumbbell,
  Gamepad2,
  LogOut,
  Timer,
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
    tint: "from-teal-950/90 via-teal-800/55 to-teal-700/35",
    border: "border-teal-500/35 hover:border-teal-300/60",
    shadow: "hover:shadow-teal-900/30",
    iconBg: "bg-teal-400/25 text-teal-50",
  },
  {
    href: "/games",
    title: "Videojuegos",
    description: "Wishlist, jugando y completados",
    icon: Gamepad2,
    available: true,
    image: "/home/videojuegos.jpg",
    tint: "from-indigo-950/90 via-indigo-800/55 to-blue-700/35",
    border: "border-indigo-500/35 hover:border-indigo-300/60",
    shadow: "hover:shadow-indigo-900/30",
    iconBg: "bg-indigo-400/25 text-indigo-50",
  },
  {
    href: "/movies",
    title: "Películas",
    description: "Wishlist y vistas",
    icon: Clapperboard,
    available: true,
    image: "/home/peliculas.jpg",
    tint: "from-rose-950/90 via-rose-800/55 to-red-700/35",
    border: "border-rose-500/35 hover:border-rose-300/60",
    shadow: "hover:shadow-rose-900/30",
    iconBg: "bg-rose-400/25 text-rose-50",
  },
  {
    href: "/deporte",
    title: "Deporte",
    description: "Ejercicios por grupo muscular",
    icon: Dumbbell,
    available: true,
    image: "/home/deporte.jpg",
    tint: "from-emerald-950/90 via-emerald-800/55 to-lime-700/35",
    border: "border-emerald-500/35 hover:border-emerald-300/60",
    shadow: "hover:shadow-emerald-900/30",
    iconBg: "bg-emerald-400/25 text-emerald-50",
  },
  {
    href: "/productividad",
    title: "Productividad",
    description: "Horas de foco y bloques",
    icon: Timer,
    available: true,
    image: "/home/productividad-rtve.jpg",
    tint: "from-teal-950/80 via-teal-900/40 to-cyan-800/20",
    border: "border-teal-500/35 hover:border-teal-300/60",
    shadow: "hover:shadow-teal-900/30",
    iconBg: "bg-teal-400/25 text-teal-50",
    imageClass:
      "brightness-[0.72] contrast-[1.05] saturate-[0.85] group-hover:brightness-[0.78] group-hover:saturate-[0.95]",
  },
  {
    href: "/series",
    title: "Series",
    description: "Wishlist, viendo y progreso",
    icon: Tv,
    available: true,
    image: "/home/series.jpg",
    tint: "from-amber-950/90 via-amber-800/55 to-orange-700/35",
    border: "border-amber-500/35 hover:border-amber-300/60",
    shadow: "hover:shadow-amber-900/30",
    iconBg: "bg-amber-400/25 text-amber-50",
  },
  {
    href: "/comics",
    title: "Cómics",
    description: "Wishlist, leyendo y números",
    icon: BookMarked,
    available: true,
    image: "/home/comics.jpg",
    tint: "from-violet-950/90 via-violet-800/55 to-purple-700/35",
    border: "border-violet-500/35 hover:border-violet-300/60",
    shadow: "hover:shadow-violet-900/30",
    iconBg: "bg-violet-400/25 text-violet-50",
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

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-14">
        <div className="mb-6 animate-fade-in sm:mb-10">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-4xl">
            ¿Qué quieres explorar?
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted)] sm:mt-2 sm:text-base">
            Elige una sección de tu biblioteca personal
          </p>
        </div>

        {/* Móvil: mosaico 2 columnas · Desktop: tarjetas anchas */}
        <div
          className={cn(
            "grid animate-slide-up gap-2.5",
            "grid-cols-2",
            "sm:grid-cols-2 sm:gap-4",
          )}
        >
          {SECTIONS.map((section, index) => {
            const Icon = section.icon;
            const isSeries = !section.available;
            // Series ocupa ancho completo al final en móvil
            const spanFull = isSeries;

            const cardClass = cn(
              "group relative overflow-hidden border text-left transition-all",
              "rounded-2xl",
              section.border,
              // Móvil: tiles cuadrados / Series a lo ancho
              spanFull
                ? "col-span-2 aspect-[2.4/1] sm:col-span-1 sm:aspect-auto sm:min-h-[9.5rem]"
                : "aspect-square sm:aspect-auto sm:min-h-[9.5rem]",
              "flex flex-col justify-end p-3 sm:p-5",
              section.available
                ? cn(
                    "active:scale-[0.98] sm:hover:-translate-y-1 sm:hover:shadow-lg",
                    section.shadow,
                  )
                : "cursor-not-allowed opacity-70",
              // Stagger sutil vía delay en CSS inline
            );

            const content = (
              <>
                <Image
                  src={section.image}
                  alt=""
                  fill
                  className={cn(
                    "object-cover transition-[transform,filter] duration-500",
                    "imageClass" in section && section.imageClass
                      ? section.imageClass
                      : cn(
                          "brightness-[0.5] contrast-[0.95] saturate-[0.35]",
                          section.available &&
                            "group-hover:scale-[1.04] group-hover:brightness-[0.48] group-hover:saturate-[0.45]",
                          !section.available &&
                            "grayscale-[40%] brightness-[0.42]",
                        ),
                    section.available && "group-hover:scale-[1.04]",
                  )}
                  sizes="(max-width:640px) 50vw, 50vw"
                  priority={index < 4}
                />
                <div
                  aria-hidden
                  className={cn(
                    "absolute inset-0 bg-gradient-to-t",
                    section.tint,
                  )}
                />
                <div className="relative z-10">
                  <div
                    className={cn(
                      "mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg backdrop-blur-sm sm:mb-2 sm:h-9 sm:w-9",
                      section.iconBg,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-white drop-shadow-sm sm:text-xl">
                    {section.title}
                  </h2>
                  <p className="mt-0.5 hidden text-sm text-white/85 sm:block">
                    {section.description}
                  </p>
                  {!section.available && (
                    <span className="mt-1.5 inline-flex w-fit rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm sm:mt-2 sm:text-xs">
                      Próximamente
                    </span>
                  )}
                </div>
              </>
            );

            if (!section.available) {
              return (
                <div
                  key={section.title}
                  className={cardClass}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={section.title}
                href={section.href}
                className={cardClass}
                style={{ animationDelay: `${index * 40}ms` }}
                onClick={() => window.scrollTo(0, 0)}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
