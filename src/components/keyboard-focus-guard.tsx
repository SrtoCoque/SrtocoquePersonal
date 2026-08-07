"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

function isTextField(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest("[data-ghost-click-guard]")) return false;
  if (el.matches("textarea, [contenteditable]:not([contenteditable='false'])")) {
    return true;
  }
  if (el instanceof HTMLInputElement) {
    const type = (el.type || "text").toLowerCase();
    return ![
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
    ].includes(type);
  }
  if (el instanceof HTMLSelectElement) return true;
  return false;
}

function isFieldAvailable(el: HTMLElement): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") {
    return false;
  }
  if (el instanceof HTMLInputElement && el.readOnly && el.type === "hidden") {
    return false;
  }
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  if (el.getClientRects().length === 0) return false;
  return true;
}

function fieldRoot(from: HTMLElement): ParentNode {
  return (
    from.closest("form") ??
    from.closest("[data-dialog-panel]") ??
    from.closest("[role='dialog']") ??
    document.body
  );
}

function collectFields(from: HTMLElement): HTMLElement[] {
  const root = fieldRoot(from);
  const nodes = root.querySelectorAll(
    "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
  );
  return Array.from(nodes).filter(
    (n): n is HTMLElement => isTextField(n) && isFieldAvailable(n),
  );
}

const KBD_ACCESSORY_H = 48;

function findScrollParent(el: HTMLElement): HTMLElement | null {
  const dialogBody = el.closest("[data-dialog-body]");
  if (dialogBody instanceof HTMLElement) return dialogBody;

  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    if (
      (oy === "auto" || oy === "scroll" || style.overflow === "auto" || style.overflow === "scroll") &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Coloca el campo en la zona visible (sobre teclado + barra de flechas). */
function scrollFieldIntoView(el: HTMLElement) {
  const vv = window.visualViewport;
  const scrollParent = findScrollParent(el);

  const vvTop = vv?.offsetTop ?? 0;
  const vvBottom = vvTop + (vv?.height ?? window.innerHeight);
  // Barra de flechas encima del teclado
  const safeBottom = vvBottom - KBD_ACCESSORY_H - 12;
  const safeTop = vvTop + 12;

  const place = () => {
    const rect = el.getBoundingClientRect();
    const parentRect = scrollParent?.getBoundingClientRect();

    const visibleTop = parentRect
      ? Math.max(safeTop, parentRect.top + 8)
      : safeTop;
    const visibleBottom = parentRect
      ? Math.min(safeBottom, parentRect.bottom - 8)
      : safeBottom;

    if (visibleBottom <= visibleTop + 24) return;

    // Preferir el tercio superior del área visible (más cómodo al teclear)
    const targetY = visibleTop + (visibleBottom - visibleTop) * 0.28;
    const elMid = rect.top + rect.height / 2;
    const delta = elMid - targetY;

    if (Math.abs(delta) < 6) return;

    if (scrollParent) {
      scrollParent.scrollTop += delta;
      return;
    }
    window.scrollBy(0, delta);
  };

  // Instantáneo primero (iOS a veces ignora smooth dentro de modales)
  place();
  // Tras animar el teclado / reflow del modal
  requestAnimationFrame(place);
}

function useIsMobileUi(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return mobile;
}

/**
 * En móvil: mantiene el campo visible al abrir el teclado y muestra
 * flechas anterior/siguiente + Listo encima del teclado.
 */
export function KeyboardFocusGuard() {
  const mobile = useIsMobileUi();
  const [focused, setFocused] = useState<HTMLElement | null>(null);
  const [barTop, setBarTop] = useState<number | null>(null);
  const [nav, setNav] = useState({ hasPrev: false, hasNext: false, index: 0, total: 0 });

  const syncBarPosition = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) {
      setBarTop(null);
      return;
    }
    // Justo encima del borde inferior del viewport visible (teclado)
    setBarTop(vv.offsetTop + vv.height - 48);
  }, []);

  const refreshNav = useCallback((el: HTMLElement | null) => {
    if (!el) {
      setNav({ hasPrev: false, hasNext: false, index: 0, total: 0 });
      return;
    }
    const fields = collectFields(el);
    const index = fields.indexOf(el);
    setNav({
      hasPrev: index > 0,
      hasNext: index >= 0 && index < fields.length - 1,
      index: Math.max(0, index),
      total: fields.length,
    });
  }, []);

  const scheduleKeepVisible = useCallback((el: HTMLElement) => {
    for (const delay of [50, 120, 250, 400, 600]) {
      window.setTimeout(() => {
        if (document.activeElement === el) scrollFieldIntoView(el);
      }, delay);
    }
  }, []);

  useEffect(() => {
    if (!mobile) return;

    let hideTimer: number | null = null;
    let active: HTMLElement | null = null;

    const onFocusIn = (e: FocusEvent) => {
      if (!isTextField(e.target)) return;
      if (hideTimer != null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      active = e.target;
      setFocused(active);
      refreshNav(active);
      syncBarPosition();
      scheduleKeepVisible(active);
    };

    const onFocusOut = () => {
      // Retraso: permite pulsar las flechas sin que la barra desaparezca antes
      hideTimer = window.setTimeout(() => {
        if (
          document.activeElement &&
          isTextField(document.activeElement)
        ) {
          return;
        }
        active = null;
        setFocused(null);
        setBarTop(null);
      }, 120);
    };

    const onViewportChange = () => {
      syncBarPosition();
      if (active && document.activeElement === active) {
        refreshNav(active);
        scheduleKeepVisible(active);
      }
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onViewportChange);
    vv?.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange);

    return () => {
      if (hideTimer != null) window.clearTimeout(hideTimer);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      vv?.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [mobile, refreshNav, scheduleKeepVisible, syncBarPosition]);

  function moveFocus(dir: -1 | 1) {
    if (!focused) return;
    const fields = collectFields(focused);
    const index = fields.indexOf(focused);
    if (index < 0) return;
    const next = fields[index + dir];
    if (!next) return;
    next.focus();
    // Algunos móviles necesitan click() en inputs
    if (typeof (next as HTMLInputElement).select === "function") {
      try {
        (next as HTMLInputElement).select();
      } catch {
        /* ignore */
      }
    }
    scheduleKeepVisible(next);
  }

  function done() {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    setFocused(null);
    setBarTop(null);
  }

  if (!mobile || !focused || barTop == null) return null;

  const showArrows = nav.total >= 2;

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-[60] flex h-12 items-center gap-2 border-t border-[var(--border)]",
        "bg-[var(--surface)]/95 px-2 backdrop-blur-md",
        showArrows ? "justify-between" : "justify-end",
      )}
      style={{ top: barTop }}
      onPointerDown={(e) => e.preventDefault()}
    >
      {showArrows ? (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Campo anterior"
            disabled={!nav.hasPrev}
            onPointerDown={(e) => {
              e.preventDefault();
              if (nav.hasPrev) moveFocus(-1);
            }}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-lg",
              nav.hasPrev
                ? "text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                : "text-[var(--muted)] opacity-40",
            )}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Campo siguiente"
            disabled={!nav.hasNext}
            onPointerDown={(e) => {
              e.preventDefault();
              if (nav.hasNext) moveFocus(1);
            }}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-lg",
              nav.hasNext
                ? "text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                : "text-[var(--muted)] opacity-40",
            )}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <span className="ml-1 text-xs tabular-nums text-[var(--muted)]">
            {nav.index + 1}/{nav.total}
          </span>
        </div>
      ) : null}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          done();
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-sm font-medium text-[var(--accent-fg)]"
      >
        <Check className="h-4 w-4" />
        Listo
      </button>
    </div>
  );
}
