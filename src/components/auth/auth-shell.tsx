"use client";

import Image from "next/image";
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
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/diagon-alley.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center auth-bg-photo"
        />
        <div className="absolute inset-0 bg-[#0b1218]/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-slate-950/25 to-black/75" />

        <span className="auth-sparkle absolute left-[18%] top-[24%] h-1 w-1 rounded-full bg-sky-100" />
        <span className="auth-sparkle auth-sparkle-2 absolute right-[20%] top-[18%] h-1.5 w-1.5 rounded-full bg-slate-100" />
        <span className="auth-sparkle auth-sparkle-3 absolute left-[58%] top-[14%] h-1 w-1 rounded-full bg-cyan-100" />
      </div>

      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
