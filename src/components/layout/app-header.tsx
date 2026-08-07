"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Home,
  Library,
  LogOut,
  Search,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { HeaderMenu } from "@/components/layout/header-menu";
import { InlineHeaderSearch } from "@/components/layout/inline-header-search";
import { cn } from "@/lib/utils";

export function AppHeader({
  email,
  onAddBook,
}: {
  email?: string | null;
  /** @deprecated El alta se hace desde la biblioteca / búsqueda. */
  onAddBook?: () => void;
}) {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-40 h-14 border-b border-[var(--border)] bg-[var(--background)]/85" />
      }
    >
      <AppHeaderBar email={email} onAddBook={onAddBook} />
    </Suspense>
  );
}

function AppHeaderBar({
  email: _email,
}: {
  email?: string | null;
  onAddBook?: () => void;
}) {
  void _email;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, searchParams]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const searchActive = searchOpen || pathname.startsWith("/search");
  const libraryFilter = searchParams.get("filter");
  const onLibraryHome =
    pathname === "/library" && (!libraryFilter || libraryFilter === "all");
  const onLibraryShelf = pathname === "/library" && libraryFilter === "shelf";

  const menuItems = [
    {
      href: "/library",
      label: "Inicio",
      icon: Home,
      active: onLibraryHome,
    },
    {
      href: "/library?filter=shelf",
      label: "Biblioteca",
      icon: Library,
      active: onLibraryShelf,
    },
    {
      href: "/recommended",
      label: "Recomendados",
      icon: Sparkles,
      active: pathname.startsWith("/recommended"),
    },
    {
      href: "/stats",
      label: "Estadísticas",
      icon: BarChart3,
      active: pathname.startsWith("/stats"),
    },
  ];

  return (
    <header className="sticky top-0 z-40 overflow-x-clip border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full min-w-0 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <Link
            href="/home"
            aria-label="Cambiar de sección"
            className="flex shrink-0 items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-fg)]">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="truncate">Libros</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                    item.active
                      ? "bg-[var(--surface-2)] font-medium text-[var(--foreground)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-2)]/60 hover:text-[var(--foreground)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            size="sm"
            onClick={() => setSearchOpen((o) => !o)}
            aria-label="Buscar"
            aria-expanded={searchOpen}
            className={cn(
              "gap-1.5 font-semibold shadow-sm",
              searchActive && "ring-2 ring-[var(--accent-fg)]/30",
            )}
          >
            <Search className="h-4 w-4" />
            Buscar
          </Button>
          <div className="hidden items-center gap-1 sm:flex">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar sesión"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <HeaderMenu items={menuItems} onSignOut={signOut} />
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
