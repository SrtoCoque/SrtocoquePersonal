import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BooksRecommendedView } from "@/components/books/books-recommended-view";

export default async function BooksRecommendedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <BooksRecommendedView userId={user.id} email={user.email ?? null} />
  );
}
