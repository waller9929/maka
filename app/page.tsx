import { createClient } from "@/lib/supabase/server";
import FilterBar from "@/components/FilterBar";
import PlaceCard, { type Place } from "@/components/PlaceCard";
import Top10List, { rankTop10 } from "@/components/Top10List";
import { detectRegion, detectCity } from "@/lib/region";

export const dynamic = "force-dynamic";

// Picks 3 places from 3 different categories at random, for the
// "Today's picks" section. Runs fresh on every page load.
function pickRecommended(places: Place[]): Place[] {
  const byCategory = new Map<string, Place[]>();
  for (const p of places) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category)!.push(p);
  }
  const categories = Array.from(byCategory.keys());
  for (let i = categories.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [categories[i], categories[j]] = [categories[j], categories[i]];
  }
  return categories.slice(0, 3).map((cat) => {
    const list = byCategory.get(cat)!;
    return list[Math.floor(Math.random() * list.length)];
  });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: {
    category?: string;
    time?: string;
    companion?: string;
    q?: string;
    region?: string;
    city?: string;
  };
}) {
  const supabase = createClient();

  const { data: settings } = await supabase
    .from("app_settings")
    .select("home_title")
    .eq("id", 1)
    .single();

  const homeTitle = settings?.home_title ?? "MAKA - Work Hard, Eat Well";

  let query = supabase
    .from("places")
    .select("id, name, location, category, rating, restaurant_type, photo_url, time_tags, companion_tags, profiles(name), comments(count)")
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

  let places: Place[] = (data ?? []).map((p: any) => ({
    ...p,
    recommender_name: p.profiles?.name ?? null,
    comment_count: p.comments?.[0]?.count ?? 0,
  }));

  // Region/city aren't real columns — they're derived from the location
  // text, so we filter for them here in JS after fetching.
  if (searchParams.region) {
    places = places.filter((p) => detectRegion(p.location) === searchParams.region);
  }
  if (searchParams.city) {
    places = places.filter((p) => detectCity(p.location) === searchParams.city);
  }

  // Only show recommendations/ranking when no filters/search are active —
  // this is the unfiltered "browse everything" view, not a filtered result set.
  const isUnfiltered =
    !searchParams.category &&
    !searchParams.time &&
    !searchParams.companion &&
    !searchParams.q &&
    !searchParams.region &&
    !searchParams.city;
  const recommended = isUnfiltered ? pickRecommended(places) : [];
  const top10 = isUnfiltered ? rankTop10(places) : [];

  return (
    <div>
      <h1 className="text-lg font-medium mb-4">{homeTitle}</h1>

      {error && <p className="text-sm text-red-600">Couldn't load the list: {error.message}</p>}

      {isUnfiltered && (recommended.length > 0 || top10.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-base font-medium mb-1">Today's picks</h2>
            <p className="text-xs text-brand-gray mb-3">
              Three random picks from three different categories.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 gap-3">
              {recommended.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-base font-medium mb-1">Top 10</h2>
            <p className="text-xs text-brand-gray mb-3">
              Ranked by rating, then by comment count.
            </p>
            <Top10List places={top10} />
          </div>
        </div>
      )}

      <FilterBar />

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
