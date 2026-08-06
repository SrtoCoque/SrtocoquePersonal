import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CardioActivityView } from "@/components/sport/cardio-activity-view";
import { isCardioActivitySlug } from "@/lib/sport";

export default async function CardioActivityPage({
  params,
}: {
  params: Promise<{ actividad: string }>;
}) {
  const { actividad } = await params;
  if (!isCardioActivitySlug(actividad)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <CardioActivityView
      email={user.email ?? null}
      userId={user.id}
      activity={actividad}
    />
  );
}
