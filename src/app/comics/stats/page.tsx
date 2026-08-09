import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComicsStatsDashboard } from "@/components/comics/comics-stats-dashboard";

export default async function ComicsStatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <ComicsStatsDashboard userId={user.id} email={user.email ?? null} />;
}
