import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MoviesSearchView } from "@/components/movies/movies-search-view";

export default async function MoviesSearchPage({
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
    <MoviesSearchView
      userId={user.id}
      email={user.email ?? null}
      initialQuery={q ?? ""}
    />
  );
}
