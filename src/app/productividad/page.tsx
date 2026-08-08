import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductivityHubView } from "@/components/productivity/productivity-hub-view";

export default async function ProductividadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <ProductivityHubView userId={user.id} email={user.email ?? null} />
  );
}
