"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BOARD_CATEGORY_LABELS } from "@/lib/board";

type PostRow = {
  id: string;
  category: string;
  title: string;
  pinned: boolean;
  created_at: string;
};

type FeedRow = {
  id: string;
  name: string;
  feed_url: string;
};

export default function AdminBoardManager({
  initialPosts,
  initialFeeds,
}: {
  initialPosts: PostRow[];
  initialFeeds: FeedRow[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [feeds, setFeeds] = useState(initialFeeds);
  const [feedName, setFeedName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [addingFeed, setAddingFeed] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState("");
  const [error, setError] = useState("");

  async function togglePin(post: PostRow) {
    const { error: updateError } = await supabase
      .from("board_posts")
      .update({ pinned: !post.pinned })
      .eq("id", post.id);
    if (!updateError) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, pinned: !p.pinned } : p)));
      router.refresh();
    }
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const { error: deleteError } = await supabase.from("board_posts").delete().eq("id", id);
    if (!deleteError) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    }
  }

  async function addFeed() {
    if (!feedName.trim() || !feedUrl.trim()) {
      setError("Enter both a name and a feed URL.");
      return;
    }
    setAddingFeed(true);
    setError("");
    const { data, error: insertError } = await supabase
      .from("rss_feeds")
      .insert({ name: feedName.trim(), feed_url: feedUrl.trim() })
      .select()
      .single();
    setAddingFeed(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setFeeds((prev) => [...prev, data as FeedRow]);
    setFeedName("");
    setFeedUrl("");
    router.refresh();
  }

  async function deleteFeed(id: string) {
    if (!confirm("Remove this RSS feed source?")) return;
    const { error: deleteError } = await supabase.from("rss_feeds").delete().eq("id", id);
    if (!deleteError) {
      setFeeds((prev) => prev.filter((f) => f.id !== id));
      router.refresh();
    }
  }

  async function fetchNow() {
    setFetching(true);
    setFetchResult("");
    setError("");
    try {
      const res = await fetch("/api/cron/fetch-news", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fetch failed.");
      setFetchResult(`Added ${data.inserted ?? 0} new article(s).`);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Couldn't fetch news right now.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-3">
        <p className="text-sm font-medium">인니 소식 RSS 피드 소스</p>
        <p className="text-xs text-brand-gray">
          여기 등록된 피드에서 주기적으로(그리고 아래 버튼으로 수동으로도) 기사를 가져와 "인니 소식"
          게시판에 제목/요약/원문링크 형태로 올립니다.
        </p>

        <div className="space-y-2">
          {feeds.map((f) => (
            <div key={f.id} className="flex items-center gap-2 text-sm">
              <span className="font-medium">{f.name}</span>
              <span className="text-brand-gray truncate flex-1">{f.feed_url}</span>
              <button onClick={() => deleteFeed(f.id)} className="text-xs text-red-600 flex-shrink-0">
                Remove
              </button>
            </div>
          ))}
          {feeds.length === 0 && <p className="text-xs text-brand-gray">No RSS feeds registered yet.</p>}
        </div>

        <div className="flex gap-2 flex-wrap">
          <input value={feedName} onChange={(e) => setFeedName(e.target.value)} placeholder="Source name (e.g. Antara News)" className="flex-1 min-w-[160px]" />
          <input value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="RSS feed URL" className="flex-1 min-w-[200px]" />
          <button onClick={addFeed} disabled={addingFeed} className="btn-outline px-3 text-sm">
            {addingFeed ? "Adding..." : "Add feed"}
          </button>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-brand-bg">
          <button onClick={fetchNow} disabled={fetching || feeds.length === 0} className="btn-primary px-4 py-1.5 text-sm">
            {fetching ? "Fetching..." : "Fetch now"}
          </button>
          {fetchResult && <span className="text-sm text-brand-blue">{fetchResult}</span>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="card overflow-hidden">
        {posts.length === 0 ? (
          <p className="p-6 text-sm text-brand-gray text-center">No posts yet.</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-brand-bg last:border-b-0">
              <span className="tag bg-brand-bg text-brand-gray flex-shrink-0">{BOARD_CATEGORY_LABELS[p.category] ?? p.category}</span>
              <Link href={`/board/${p.id}`} className="text-sm flex-1 truncate hover:underline">
                {p.title}
              </Link>
              <button onClick={() => togglePin(p)} className="text-xs text-brand-blue flex-shrink-0">
                {p.pinned ? "Unpin" : "Pin"}
              </button>
              <button onClick={() => deletePost(p.id)} className="text-xs text-red-600 flex-shrink-0">
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
