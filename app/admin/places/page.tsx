import { createClient } from "@/lib/supabase/server";
import AdminPlacesManager from "@/components/AdminPlacesManager";

export const dynamic = "force-dynamic";

export default async function AdminPlacesPage() {
  const supabase = createClient();

  const { data: places } = await supabase
    .from("places")
    .select("id, name, location, category, restaurant_type, base_rating, rating, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-lg font-medium mb-4">Manage places</h1>
      <AdminPlacesManager initialPlaces={places ?? []} />
    </div>
  );
}
