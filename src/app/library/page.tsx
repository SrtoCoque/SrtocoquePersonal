import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LibraryView } from "@/components/books/library-view";

export default async function LibraryPage() {
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
      <LibraryView userId={user.id} email={user.email ?? null} />
    </Suspense>
  );
}
