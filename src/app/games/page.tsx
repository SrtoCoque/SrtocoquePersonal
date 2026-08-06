import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GamesLibraryView } from "@/components/games/games-library-view";

export default async function GamesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <Suspense
      fallback={
        <div className="min-h-screen animate-pulse bg-[var(--background)]" />
      }
    >
      <GamesLibraryView userId={user.id} email={user.email ?? null} />
    </Suspense>
  );
}
