"use client";

import { cn } from "@/lib/utils";

export function AuthShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "auth-diagon relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 auth-bg-photo"
        aria-hidden
      />
      {/* Veladura suave: grisácea pero se ve la calle */}
      <div className="pointer-events-none absolute inset-0 bg-slate-950/35" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/55" />

      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
