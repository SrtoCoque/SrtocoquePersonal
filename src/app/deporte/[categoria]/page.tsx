import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SportCategoryView } from "@/components/sport/sport-category-view";
import { isSportCategorySlug } from "@/lib/sport";

export default async function DeporteCategoriaPage({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria } = await params;
  if (!isSportCategorySlug(categoria)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <SportCategoryView email={user.email ?? null} slug={categoria} />
  );
}
