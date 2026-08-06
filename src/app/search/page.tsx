import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchResultsView } from "@/components/books/search-results-view";

export default async function SearchPage({
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
    <SearchResultsView
      userId={user.id}
      email={user.email ?? null}
      initialQuery={q ?? ""}
    />
  );
}
