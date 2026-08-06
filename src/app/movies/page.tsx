import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MoviesLibraryView } from "@/components/movies/movies-library-view";

export default async function MoviesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <MoviesLibraryView userId={user.id} email={user.email ?? null} />;
}
