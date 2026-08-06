import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SportHubView } from "@/components/sport/sport-hub-view";

export default async function DeportePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <SportHubView email={user.email ?? null} />;
}
