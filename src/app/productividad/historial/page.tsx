import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductivityHistoryView } from "@/components/productivity/productivity-history-view";

export default async function ProductividadHistorialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <ProductivityHistoryView userId={user.id} email={user.email ?? null} />
  );
}
