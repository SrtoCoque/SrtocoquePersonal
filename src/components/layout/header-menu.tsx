"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LogOut, Menu, Moon, Sun, X, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HeaderMenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

/** Menú lateral solo visible en móvil (&lt; sm). */
export function HeaderMenu({
  items,
  onSignOut,
}: {
  items: HeaderMenuItem[];
  onSignOut: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const drawer =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[100] sm:hidden" role="presentation">
            <button
              type="button"
              aria-label="Cerrar menú"
              className="absolute inset-0 bg-black/50 animate-fade-in"
              onClick={() => setOpen(false)}
            />
            <nav
              id={panelId}
              className={cn(
                "absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col",
                "border-l border-[var(--border)] bg-[var(--background)] shadow-2xl",
                "animate-slide-up",
              )}
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4">
                <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
                  Menú
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Cerrar menú"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto bg-[var(--surface)] p-3">
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors",
                        item.active
                          ? "bg-[var(--accent)]/12 font-semibold text-[var(--accent)]"
                          : "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0 opacity-80" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="shrink-0 space-y-1 border-t border-[var(--border)] bg-[var(--surface)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                >
                  {isDark ? (
                    <Sun className="h-5 w-5 shrink-0 opacity-80" />
                  ) : (
                    <Moon className="h-5 w-5 shrink-0 opacity-80" />
                  )}
                  {isDark ? "Modo claro" : "Modo oscuro"}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10"
                  onClick={() => {
                    setOpen(false);
                    void onSignOut();
                  }}
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  Cerrar sesión
                </button>
              </div>
            </nav>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="sm:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {drawer}
    </div>
  );
}
