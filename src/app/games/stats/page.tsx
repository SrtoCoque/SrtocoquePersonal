import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GamesStatsDashboard } from "@/components/games/games-stats-dashboard";

export default async function GamesStatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <GamesStatsDashboard userId={user.id} email={user.email ?? null} />;
}
