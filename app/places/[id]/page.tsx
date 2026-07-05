import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PlaceDetail from "@/components/PlaceDetail";
import CommentSection from "@/components/CommentSection";

export const dynamic = "force-dynamic";

export default async function PlaceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: place } = await supabase
    .from("places")
    .select("*, profiles(name)")
    .eq("id", params.id)
    .single();

  if (!place) notFound();

  await supabase.rpc("increment_place_view", { place_id: place.id });

  return (
    <div className="max-w-2xl mx-auto">
      <PlaceDetail
        initial={{
          ...place,
          recommender_name: (place as any).profiles?.name ?? null,
          view_count: (place.view_count ?? 0) + 1,
        }}
      />
      <div className="card p-5 mt-4">
        <CommentSection placeId={place.id} />
      </div>
    </div>
  );
}
