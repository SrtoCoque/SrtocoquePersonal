import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SeriesLibraryView } from "@/components/series/series-library-view";

export default async function SeriesPage() {
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
      <SeriesLibraryView userId={user.id} email={user.email ?? null} />
    </Suspense>
  );
}
