import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComicsSearchView } from "@/components/comics/comics-search-view";

export default async function ComicsSearchPage({
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
    <ComicsSearchView
      userId={user.id}
      email={user.email ?? null}
      initialQuery={q ?? ""}
    />
  );
}
