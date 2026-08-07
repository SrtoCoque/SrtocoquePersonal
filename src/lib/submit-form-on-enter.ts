import type { KeyboardEvent } from "react";

/** Enter en un input del formulario → guardar (incluye date/number). */
export function submitFormOnEnter(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter") return;
  if (!(e.target instanceof HTMLInputElement)) return;
  const type = (e.target.type || "text").toLowerCase();
  if (type === "submit" || type === "button" || type === "reset") return;
  e.preventDefault();
  e.currentTarget.requestSubmit();
}
