import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.email?.split("@")[0] || "Athlete",
      admin: false,
    },
  });
}
