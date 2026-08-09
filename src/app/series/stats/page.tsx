import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SeriesStatsDashboard } from "@/components/series/series-stats-dashboard";

export default async function SeriesStatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <SeriesStatsDashboard userId={user.id} email={user.email ?? null} />;
}
