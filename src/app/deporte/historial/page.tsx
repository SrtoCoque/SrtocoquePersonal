import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SportHistoryView } from "@/components/sport/sport-history-view";

export default async function DeporteHistorialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <SportHistoryView email={user.email ?? null} userId={user.id} />
  );
}
