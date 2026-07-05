import { createClient } from "@/lib/supabase/server";
import FilterBar from "@/components/FilterBar";
import PlaceCard, { type Place } from "@/components/PlaceCard";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { category?: string; time?: string; companion?: string; q?: string };
}) {
  const supabase = createClient();

  let query = supabase
    .from("places")
    .select("id, name, location, category, rating, value_rating, price_range, photo_url, time_tags, companion_tags, profiles(name), comments(count)")
    .order("created_at", { ascending: false });

  if (searchParams.category) query = query.eq("category", searchParams.category);
  if (searchParams.time) query = query.contains("time_tags", [searchParams.time]);
  if (searchParams.companion) query = query.contains("companion_tags", [searchParams.companion]);
  if (searchParams.q) query = query.or(`name.ilike.%${searchParams.q}%,location.ilike.%${searchParams.q}%`);

  const { data, error } = await query;

  if (error) {
    console.error("[places query error]", JSON.stringify(error, null, 2));
    console.error("[env check] SUPABASE_URL =", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.error("[env check] ANON_KEY length =", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0);
  }

  const places: Place[] = (data ?? []).map((p: any) => ({
    ...p,
    recommender_name: p.profiles?.name ?? null,
    comment_count: p.comments?.[0]?.count ?? 0,
  }));

  return (
    <div>
      <h1 className="text-lg font-medium mb-4">Our team's restaurants</h1>
      <FilterBar />

      {error && <p className="text-sm text-red-600">Couldn't load the list: {error.message}</p>}

      {places.length === 0 ? (
        <div className="card p-10 text-center text-brand-gray text-sm">
          No places yet. Be the first to add one!
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}
    </div>
  );
}
