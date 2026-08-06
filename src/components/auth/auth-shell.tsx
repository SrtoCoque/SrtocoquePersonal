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
      {/* Cielo nocturno + callejuela */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#3a2218_0%,_#120a08_45%,_#070403_100%)]" />
        <div className="absolute inset-0 opacity-40 mix-blend-soft-light auth-brick" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Faroles */}
        <div className="auth-lantern absolute left-[12%] top-[18%] h-40 w-40 rounded-full bg-[#e8a54b]/25 blur-3xl" />
        <div className="auth-lantern auth-lantern-delay absolute right-[10%] top-[28%] h-52 w-52 rounded-full bg-[#ffb347]/20 blur-3xl" />
        <div className="auth-lantern absolute bottom-[20%] left-[40%] h-32 w-32 rounded-full bg-[#c45c26]/15 blur-3xl" />

        {/* Destellos */}
        <span className="auth-sparkle absolute left-[20%] top-[30%] h-1 w-1 rounded-full bg-[#ffe7a0]" />
        <span className="auth-sparkle auth-sparkle-2 absolute right-[22%] top-[22%] h-1.5 w-1.5 rounded-full bg-[#ffd76a]" />
        <span className="auth-sparkle auth-sparkle-3 absolute left-[55%] top-[16%] h-1 w-1 rounded-full bg-[#fff1c2]" />
        <span className="auth-sparkle auth-sparkle-4 absolute right-[35%] bottom-[28%] h-1 w-1 rounded-full bg-[#ffe7a0]" />
        <span className="auth-sparkle auth-sparkle-5 absolute left-[30%] bottom-[22%] h-1.5 w-1.5 rounded-full bg-[#ffd76a]" />

        {/* Siluetas de fachadas */}
        <div className="absolute inset-x-0 bottom-0 flex h-36 items-end justify-between px-2 opacity-50 sm:h-44 sm:px-8">
          <div className="h-[70%] w-[18%] rounded-t-sm bg-[#1a0f0c] shadow-[inset_0_0_0_1px_rgba(212,160,50,0.08)]" />
          <div className="h-full w-[22%] rounded-t-md bg-[#221410] shadow-[inset_0_0_0_1px_rgba(212,160,50,0.1)]" />
          <div className="h-[85%] w-[16%] rounded-t-sm bg-[#180e0b]" />
          <div className="h-[95%] w-[24%] rounded-t-lg bg-[#271612] shadow-[inset_0_0_20px_rgba(232,165,75,0.08)]" />
          <div className="h-[75%] w-[18%] rounded-t-sm bg-[#1c100d]" />
        </div>
      </div>

      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
