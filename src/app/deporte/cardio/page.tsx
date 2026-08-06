import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CardioHubView } from "@/components/sport/cardio-hub-view";

export default async function CardioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <CardioHubView email={user.email ?? null} userId={user.id} />
  );
}
