import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatsDashboard } from "@/components/stats/stats-dashboard";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <StatsDashboard userId={user.id} email={user.email ?? null} />;
}
