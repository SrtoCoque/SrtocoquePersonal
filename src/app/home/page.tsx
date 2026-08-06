import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HomeHub } from "@/components/home/home-hub";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <HomeHub email={user.email ?? null} />;
}
