"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BOARD_CATEGORY_LABELS } from "@/lib/board";
import type { User } from "@supabase/supabase-js";

export type BoardPostData = {
  id: string;
  category: string;
  title: string;
  content: string;
  image_urls: string[];
  source_name: string | null;
  source_url: string | null;
  pinned: boolean;
  view_count: number;
  created_by: string | null;
  guest_name: string | null;
  created_at: string;
  author_name: string | null;
};

export default function BoardPostDetail({ initial }: { initial: BoardPostData }) {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [post, setPost] = useState(initial);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!user) return setIsAdmin(false);
    supabase.from("profiles").select("is_admin").eq("id", user.id).single()
      .then(({ data }) => setIsAdmin(!!data?.is_admin));
  }, [user, supabase]);

  async function togglePin() {
    const { error } = await supabase.from("board_posts").update({ pinned: !post.pinned }).eq("id", post.id);
    if (!error) {
      setPost({ ...post, pinned: !post.pinned });
      router.refresh();
    }
  }

  async function deletePost() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    await supabase.from("board_posts").delete().eq("id", post.id);
    router.push("/board");
    router.refresh();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="tag bg-brand-bg text-brand-gray">{BOARD_CATEGORY_LABELS[post.category] ?? post.category}</span>
        {post.pinned && <span className="tag bg-amber-100 text-amber-800">Pinned</span>}
      </div>

      <h1 className="text-xl font-medium">{post.title}</h1>
      <p className="text-xs text-brand-gray mt-1">
        {post.author_name ?? post.guest_name ?? post.source_name ?? "Anonymous"} · {new Date(post.created_at).toLocaleDateString()} · {post.view_count} views
      </p>

      <p className="text-sm mt-4 whitespace-pre-wrap">{post.content}</p>

      {post.image_urls?.length > 0 && (
        <div className="flex gap-2 mt-4 flex-wrap">
          {post.image_urls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-24 h-24 rounded-lg object-cover border border-brand-bg" />
            </a>
          ))}
        </div>
      )}

      {post.source_url && (
        <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue mt-3 inline-block">
          원문 보기 ↗
        </a>
      )}

      {isAdmin && (
        <div className="flex gap-3 mt-4 pt-3 border-t border-brand-bg">
          <button onClick={togglePin} className="text-sm text-brand-blue">
            {post.pinned ? "Unpin" : "Pin"} (admin)
          </button>
          <button onClick={deletePost} className="text-sm text-red-600">
            Delete (admin)
          </button>
        </div>
      )}
    </div>
  );
}
