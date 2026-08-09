"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
};

const GHOST_CLICK_MS = 400;

/**
 * Tras cerrar un modal en móvil, el click/touchend puede caer en lo de detrás
 * (p. ej. otra tarjeta de ejercicio). Un escudo temporal lo absorbe.
 */
function installGhostClickGuard() {
  if (typeof document === "undefined") return;

  const shield = document.createElement("div");
  shield.setAttribute("aria-hidden", "true");
  shield.dataset.ghostClickGuard = "1";
  Object.assign(shield.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    touchAction: "none",
    cursor: "default",
  });

  const block = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };

  for (const type of [
    "pointerdown",
    "pointerup",
    "mousedown",
    "mouseup",
    "click",
    "touchstart",
    "touchend",
    "touchcancel",
  ] as const) {
    shield.addEventListener(type, block, true);
  }

  document.body.appendChild(shield);
  window.setTimeout(() => {
    shield.remove();
  }, GHOST_CLICK_MS);
}

function closeSafely(close: () => void) {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  installGhostClickGuard();
  close();
}

/**
 * Ajusta el overlay al visualViewport para que, al abrir el teclado en móvil,
 * el sheet quede por encima y no se escondan inputs/footer.
 */
function useKeyboardViewport(open: boolean) {
  const [frame, setFrame] = React.useState({
    height: 0,
    offsetTop: 0,
  });

  React.useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const vv = window.visualViewport;
    const sync = () => {
      const next = vv
        ? { height: vv.height, offsetTop: vv.offsetTop }
        : { height: window.innerHeight, offsetTop: 0 };
      setFrame((prev) =>
        prev.height === next.height && prev.offsetTop === next.offsetTop
          ? prev
          : next,
      );
    };

    sync();
    // resize = teclado; scroll del visualViewport al hacer scroll en el sheet
    // no debe re-renderizar el overlay (provoca saltos al inicio en iOS).
    vv?.addEventListener("resize", sync);
    window.addEventListener("resize", sync);

    return () => {
      vv?.removeEventListener("resize", sync);
      window.removeEventListener("resize", sync);
    };
  }, [open]);

  return frame;
}

const KBD_ACCESSORY_PX = 48;

function isDialogTextField(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  const viewport = useKeyboardViewport(open);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [fieldFocused, setFieldFocused] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setFieldFocused(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSafely(() => onOpenChange(false));
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  // Solo reservar hueco si hay barra de flechas (2+ campos)
  React.useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    let blurTimer: number | null = null;

    const countFields = () => {
      const nodes = panel.querySelectorAll(
        "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
      );
      let n = 0;
      for (const node of nodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node instanceof HTMLInputElement) {
          const type = (node.type || "text").toLowerCase();
          if (
            [
              "button",
              "checkbox",
              "radio",
              "submit",
              "reset",
              "file",
              "hidden",
              "image",
              "range",
              "color",
            ].includes(type)
          ) {
            continue;
          }
        }
        n += 1;
      }
      return n;
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!isDialogTextField(e.target)) return;
      if (blurTimer != null) {
        window.clearTimeout(blurTimer);
        blurTimer = null;
      }
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("[data-skip-keyboard-nav]")
      ) {
        setFieldFocused(false);
        return;
      }
      // Hueco solo si habrá barra de flechas
      setFieldFocused(countFields() >= 2);
    };

    const onFocusOut = () => {
      blurTimer = window.setTimeout(() => {
        if (
          document.activeElement &&
          panel.contains(document.activeElement) &&
          isDialogTextField(document.activeElement)
        ) {
          return;
        }
        setFieldFocused(false);
      }, 120);
    };

    panel.addEventListener("focusin", onFocusIn);
    panel.addEventListener("focusout", onFocusOut);
    return () => {
      if (blurTimer != null) window.clearTimeout(blurTimer);
      panel.removeEventListener("focusin", onFocusIn);
      panel.removeEventListener("focusout", onFocusOut);
    };
  }, [open]);

  if (!open) return null;

  const hasViewport = viewport.height > 0;
  const accessory =
    fieldFocused && typeof window !== "undefined" && window.innerWidth < 640
      ? KBD_ACCESSORY_PX
      : 0;
  const frameHeight = hasViewport
    ? Math.max(160, Math.round(viewport.height - accessory))
    : 0;

  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center sm:items-center sm:p-4"
      style={
        hasViewport
          ? {
              top: viewport.offsetTop,
              height: frameHeight,
              alignItems: undefined,
            }
          : { inset: 0 }
      }
    >
      <div className="flex h-full w-full flex-col justify-end sm:items-center sm:justify-center">
        <button
          type="button"
          aria-label="Cerrar"
          className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSafely(() => onOpenChange(false));
          }}
        />
        <div
          ref={panelRef}
          data-dialog-panel
          className={cn(
            "relative z-10 flex w-full flex-col overflow-hidden",
            "max-h-full sm:max-h-[min(90vh,100%)] sm:max-w-lg",
            "rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl",
            "sm:rounded-2xl",
            "pb-[env(safe-area-inset-bottom)]",
            "animate-slide-up sm:animate-scale-in",
            className,
          )}
          style={
            hasViewport
              ? { maxHeight: `${frameHeight}px` }
              : undefined
          }
          onPointerDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function DialogHeader({
  className,
  children,
  onClose,
}: {
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5 sm:py-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative z-20 h-9 w-9 shrink-0"
          aria-label="Cerrar"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSafely(onClose);
          }}
          onClick={(e) => {
            // El cierre ya va en pointerdown; evitamos un segundo disparo.
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function DialogTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      className={cn(
        "font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-xl",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function DialogBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-dialog-body
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DialogFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
