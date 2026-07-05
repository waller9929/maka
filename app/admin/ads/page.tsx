import { createClient } from "@/lib/supabase/server";
import AdminAdsManager from "@/components/AdminAdsManager";

export const dynamic = "force-dynamic";

export default async function AdminAdsPage() {
  const supabase = createClient();

  const { data: ads } = await supabase
    .from("sponsored_ads")
    .select("id, business_name, message, image_url, link_url, starts_at, ends_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-lg font-medium mb-4">Ads</h1>
      <AdminAdsManager initialAds={ads ?? []} />
    </div>
  );
}
