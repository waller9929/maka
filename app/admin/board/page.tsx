import { createClient } from "@/lib/supabase/server";
import AdminBoardManager from "@/components/AdminBoardManager";

export const dynamic = "force-dynamic";

export default async function AdminBoardPage() {
  const supabase = createClient();

  const { data: posts } = await supabase
    .from("board_posts")
    .select("id, category, title, pinned, created_at")
    .order("created_at", { ascending: false });

  const { data: feeds } = await supabase
    .from("rss_feeds")
    .select("id, name, feed_url")
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="text-lg font-medium mb-4">Board</h1>
      <AdminBoardManager initialPosts={posts ?? []} initialFeeds={feeds ?? []} />
    </div>
  );
}
