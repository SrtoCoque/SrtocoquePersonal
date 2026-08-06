"use client";

import Image from "next/image";
import type { MovieProvider } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MovieProviderLogos({
  providers,
  limit = 4,
  className,
}: {
  providers: MovieProvider[] | null | undefined;
  limit?: number;
  className?: string;
}) {
  const list = (providers ?? []).slice(0, limit);
  if (list.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {list.map((provider) =>
        provider.logoUrl ? (
          <span
            key={provider.name}
            title={provider.name}
            className="relative h-5 w-5 overflow-hidden rounded-md bg-[var(--surface-3)] ring-1 ring-[var(--border)]"
          >
            <Image
              src={provider.logoUrl}
              alt={provider.name}
              fill
              className="object-cover"
              sizes="20px"
              unoptimized
            />
          </span>
        ) : (
          <span
            key={provider.name}
            title={provider.name}
            className="max-w-[4.5rem] truncate rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--muted)]"
          >
            {provider.name}
          </span>
        ),
      )}
    </div>
  );
}
