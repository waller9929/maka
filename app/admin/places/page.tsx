import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminPlacesManager from "@/components/AdminPlacesManager";

export const dynamic = "force-dynamic";

export default async function AdminPlacesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const { data: places } = await supabase
    .from("places")
    .select("id, name, location, category, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-lg font-medium mb-4">Manage places</h1>
      <AdminPlacesManager initialPlaces={places ?? []} />
    </div>
  );
}
