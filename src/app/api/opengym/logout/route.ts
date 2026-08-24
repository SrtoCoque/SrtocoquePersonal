import { NextResponse } from "next/server";

/** Gym "logout" only clears client state; Callejón Diagon session stays. */
export async function POST() {
  return NextResponse.json({ ok: true });
}
