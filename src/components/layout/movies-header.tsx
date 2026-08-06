"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Clapperboard,
  Home,
  Library,
  LogOut,
  Plus,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/movies", label: "Biblioteca", icon: Library },
  { href: "/movies/search", label: "Buscar", icon: Search },
  { href: "/movies/stats", label: "Estadísticas", icon: BarChart3 },
];

export function MoviesHeader({
  email,
  onAddMovie,
}: {
  email?: string | null;
  onAddMovie?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-6 min-w-0">
          <Link
            href="/movies"
            className="flex items-center gap-2 shrink-0 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white">
              <Clapperboard className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Películas</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/home"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)]/60 hover:text-[var(--foreground)]"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Inicio</span>
            </Link>
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/movies"
                  ? pathname === "/movies"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-[var(--surface-2)] text-[var(--foreground)] font-medium"
                      : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]/60",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {onAddMovie && (
            <Button size="sm" onClick={onAddMovie} className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Añadir película</span>
            </Button>
          )}
          <ThemeToggle />
          {email && (
            <span className="hidden md:inline max-w-[140px] truncate text-xs text-[var(--muted)]">
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
  );
}
