import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import BoardPostDetail from "@/components/BoardPostDetail";
import BoardCommentSection from "@/components/BoardCommentSection";

export const dynamic = "force-dynamic";

export default async function BoardPostPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: post } = await supabase
    .from("board_posts")
    .select("*, profiles(name)")
    .eq("id", params.id)
    .single();

  if (!post) notFound();

  await supabase.rpc("increment_board_post_view", { post_id: post.id });

  return (
    <div className="max-w-2xl mx-auto">
      <BoardPostDetail
        initial={{
          ...post,
          author_name: (post as any).profiles?.name ?? null,
          view_count: (post.view_count ?? 0) + 1,
        }}
      />
      <div className="card p-5 mt-4">
        <BoardCommentSection postId={post.id} />
      </div>
    </div>
  );
}
