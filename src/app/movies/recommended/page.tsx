import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MoviesRecommendedView } from "@/components/movies/movies-recommended-view";

export default async function MoviesRecommendedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <MoviesRecommendedView userId={user.id} email={user.email ?? null} />
  );
}
