"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Home,
  Library,
  LogOut,
  Plus,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { InlineHeaderSearch } from "@/components/layout/inline-header-search";
import { cn } from "@/lib/utils";

export function AppHeader({
  email,
  onAddBook,
}: {
  email?: string | null;
  onAddBook?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

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
            href="/library"
            className="flex items-center gap-2 shrink-0 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)]">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Libros</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/home"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)]/60 hover:text-[var(--foreground)]"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Inicio</span>
            </Link>
            <Link
              href="/library"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                pathname === "/library"
                  ? "bg-[var(--surface-2)] text-[var(--foreground)] font-medium"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]/60",
              )}
            >
              <Library className="h-4 w-4" />
              <span className="hidden sm:inline">Biblioteca</span>
            </Link>
            <button
              type="button"
              onClick={() => setSearchOpen((o) => !o)}
              aria-label="Buscar"
              aria-expanded={searchOpen}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                searchOpen || pathname.startsWith("/search")
                  ? "bg-[var(--surface-2)] text-[var(--foreground)] font-medium"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]/60",
              )}
            >
              <Search className="h-4 w-4" />
              <span>Buscar</span>
            </button>
            <Link
              href="/stats"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                pathname.startsWith("/stats")
                  ? "bg-[var(--surface-2)] text-[var(--foreground)] font-medium"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]/60",
              )}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Estadísticas</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {onAddBook && (
            <Button size="sm" onClick={onAddBook} className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Añadir libro</span>
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

      <InlineHeaderSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        searchPath="/search"
        placeholder="Título, autor..."
      />
    </header>
  );
}
