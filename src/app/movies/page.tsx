import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MoviesLibraryView } from "@/components/movies/movies-library-view";

export default async function MoviesPage() {
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
      <MoviesLibraryView userId={user.id} email={user.email ?? null} />
    </Suspense>
  );
}
