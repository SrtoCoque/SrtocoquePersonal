import { NextResponse } from "next/server";

/** Push notifications are not wired in the Vercel embed. */
export async function GET() {
  return NextResponse.json({ error: "push not available" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: "push not available" }, { status: 501 });
}
