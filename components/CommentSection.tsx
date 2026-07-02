"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  profiles: { name: string | null; email: string } | null;
};

export default function CommentSection({ placeId }: { placeId: string }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select("id, content, created_at, created_by, profiles(name, email)")
      .eq("place_id", placeId)
      .order("created_at", { ascending: true });
    setComments((data as unknown as Comment[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

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
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/places/${placeId}` },
    });
  };

  async function submitComment() {
    if (!newComment.trim() || !user) return;
    const { error } = await supabase
      .from("comments")
      .insert({ place_id: placeId, content: newComment.trim(), created_by: user.id });
    if (!error) {
      setNewComment("");
      loadComments();
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    await supabase.from("comments").update({ content: editText.trim(), updated_at: new Date().toISOString() }).eq("id", id);
    setEditingId(null);
    loadComments();
  }

  async function deleteComment(id: string) {
    if (!confirm("이 댓글을 삭제하시겠습니까?")) return;
    await supabase.from("comments").delete().eq("id", id);
    loadComments();
  }

  return (
    <div className="border-t border-brand-bg pt-4 mt-4">
      <p className="text-sm text-brand-gray mb-3">댓글 {comments.length}개</p>

      {loading ? (
        <p className="text-sm text-brand-gray">불러오는 중...</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-full bg-brand-blueLight text-brand-blueDark text-xs font-medium flex items-center justify-center flex-shrink-0">
                {(c.profiles?.name ?? c.profiles?.email ?? "?").slice(0, 1)}
              </div>
              <div className="flex-1">
                {editingId === c.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1"
                    />
                    <button onClick={() => saveEdit(c.id)} className="btn-primary px-3 text-xs">
                      저장
                    </button>
                    <button onClick={() => setEditingId(null)} className="btn-outline px-3 text-xs">
                      취소
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">
                      <span className="font-medium">{c.profiles?.name ?? "익명"}</span>{" "}
                      — {c.content}
                    </p>
                    <div className="flex gap-2 mt-0.5">
                      {user?.id === c.created_by && (
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setEditText(c.content);
                          }}
                          className="text-xs text-brand-blue"
                        >
                          수정
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => deleteComment(c.id)} className="text-xs text-red-600">
                          삭제(관리자)
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        {user ? (
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
            />
            <button onClick={submitComment} className="btn-primary px-4 text-sm">
              등록
            </button>
          </div>
        ) : (
          <button onClick={signInWithGoogle} className="btn-outline px-4 py-2 text-sm">
            로그인하고 댓글 남기기
          </button>
        )}
      </div>
    </div>
  );
}
