import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GamesSearchView } from "@/components/games/games-search-view";

export default async function GamesSearchPage({
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
    <GamesSearchView
      userId={user.id}
      email={user.email ?? null}
      initialQuery={q ?? ""}
    />
  );
}
