import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SeriesSearchView } from "@/components/series/series-search-view";

export default async function SeriesSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { q } = await searchParams;

  return (
    <SeriesSearchView
      userId={user.id}
      email={user.email ?? null}
      initialQuery={q ?? ""}
    />
  );
}
