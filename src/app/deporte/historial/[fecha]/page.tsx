import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SportHistoryDayView } from "@/components/sport/sport-history-day-view";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function DeporteHistorialDiaPage({
  params,
}: {
  params: Promise<{ fecha: string }>;
}) {
  const { fecha } = await params;
  if (!DATE_RE.test(fecha)) notFound();

  const day = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(day.getTime())) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <SportHistoryDayView
      email={user.email ?? null}
      userId={user.id}
      date={fecha}
    />
  );
}
