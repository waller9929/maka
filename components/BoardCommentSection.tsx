"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type BoardComment = {
  id: string;
  content: string;
  created_at: string;
  created_by: string | null;
  guest_name: string | null;
  profiles: { name: string | null; email: string } | null;
};

export default function BoardCommentSection({ postId }: { postId: string }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [guestName, setGuestName] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadComments() {
    const { data } = await supabase
      .from("board_comments")
      .select("id, content, created_at, created_by, guest_name, profiles(name, email)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    setComments((data as unknown as BoardComment[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  useEffect(() => {
    if (!user) return setIsAdmin(false);
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setIsAdmin(!!data?.is_admin));
  }, [user, supabase]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/board/${postId}` },
    });
  };

  async function submitComment() {
    if (!newComment.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("board_comments").insert({
      post_id: postId,
      content: newComment.trim(),
      created_by: user ? user.id : null,
      guest_name: user ? null : guestName.trim() || null,
    });
    setPosting(false);
    if (!error) {
      setNewComment("");
      setGuestName("");
      loadComments();
    }
  }

  async function deleteComment(id: string) {
    if (!confirm("Delete this comment?")) return;
    await supabase.from("board_comments").delete().eq("id", id);
    loadComments();
  }

  return (
    <div className="border-t border-brand-bg pt-4 mt-4">
      <p className="text-sm text-brand-gray mb-3">{comments.length} comments</p>

      {loading ? (
        <p className="text-sm text-brand-gray">Loading...</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-full bg-brand-blueLight text-brand-blueDark text-xs font-medium flex items-center justify-center flex-shrink-0">
                {(c.profiles?.name ?? c.guest_name ?? c.profiles?.email ?? "?").slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{c.profiles?.name ?? c.guest_name ?? "Anonymous"}</span> — {c.content}
                </p>
                {isAdmin && (
                  <button onClick={() => deleteComment(c.id)} className="text-xs text-red-600 mt-0.5">
                    Delete (admin)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {!user && (
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full sm:w-56"
          />
        )}
        <div className="flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment"
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && submitComment()}
          />
          <button onClick={submitComment} disabled={posting} className="btn-primary px-4 text-sm">
            {posting ? "Posting..." : "Post"}
          </button>
        </div>
        {!user && (
          <p className="text-xs text-brand-gray">
            Commenting without an account. <button onClick={signInWithGoogle} className="text-brand-blue underline">Sign in with Google</button> to earn points.
          </p>
        )}
      </div>
    </div>
  );
}
