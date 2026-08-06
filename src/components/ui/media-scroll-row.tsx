import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Una sola fila de portadas con scroll horizontal. */
export function MediaScrollRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "-mx-4 flex items-start gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:gap-4 sm:px-6",
        "scroll-smooth snap-x snap-mandatory",
        "[scrollbar-width:thin] [-ms-overflow-style:none]",
        "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--border)]",
        className,
      )}
    >
      {Children.map(children, (child) =>
        child == null ? null : (
          <div className="w-[42vw] max-w-[148px] shrink-0 snap-start sm:w-[136px] sm:max-w-none md:w-[148px] [&>*]:w-full">
            {child}
          </div>
        ),
      )}
    </div>
  );
}
