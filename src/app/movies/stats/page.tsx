import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MoviesStatsDashboard } from "@/components/movies/movies-stats-dashboard";

export default async function MoviesStatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <MoviesStatsDashboard userId={user.id} email={user.email ?? null} />;
}
