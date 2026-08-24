import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OpenGymEmbed } from "@/components/sport/opengym-embed";

export default async function Deporte2Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <OpenGymEmbed />;
}
