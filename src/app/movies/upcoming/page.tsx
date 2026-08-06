import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MoviesUpcomingView } from "@/components/movies/movies-upcoming-view";

export default async function MoviesUpcomingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <MoviesUpcomingView userId={user.id} email={user.email ?? null} />
  );
}
