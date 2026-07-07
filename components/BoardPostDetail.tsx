"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BOARD_CATEGORY_LABELS } from "@/lib/board";
import type { User } from "@supabase/supabase-js";

const MAX_IMAGES = 4;

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
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(initial.title);
  const [editContent, setEditContent] = useState(initial.content);
  const [editImages, setEditImages] = useState<string[]>(initial.image_urls ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const isOwner = user?.id === post.created_by;

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

  function removeExistingImage(url: string) {
    setEditImages((prev) => prev.filter((u) => u !== url));
  }

  function handleNewFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_IMAGES - editImages.length;
    setNewFiles((prev) => [...prev, ...Array.from(files)].slice(0, Math.max(remaining, 0)));
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editContent.trim()) {
      setSaveError("Title and content can't be empty.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const uploaded: string[] = [];
      for (const file of newFiles) {
        const ext = file.name.split(".").pop();
        const path = `board/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("place-photos").upload(path, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }

      const image_urls = [...editImages, ...uploaded];
      const { error } = await supabase
        .from("board_posts")
        .update({
          title: editTitle.trim(),
          content: editContent.trim(),
          image_urls,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);
      if (error) throw error;

      setPost({ ...post, title: editTitle.trim(), content: editContent.trim(), image_urls });
      setNewFiles([]);
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      setSaveError(err.message ?? "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="card p-5 space-y-3">
        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full" placeholder="Title" />
        <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full" rows={6} placeholder="Content" />

        <div>
          <p className="text-sm font-medium mb-1">Photos</p>
          <div className="flex items-center gap-2 flex-wrap">
            {editImages.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-brand-bg" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(url)}
                  className="absolute -top-1.5 -right-1.5 bg-white border border-brand-gray rounded-full w-5 h-5 text-xs leading-none"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
            {newFiles.map((f, i) => (
              <span key={i} className="tag bg-brand-bg text-brand-gray">
                {f.name.length > 14 ? f.name.slice(0, 12) + "…" : f.name}
              </span>
            ))}
            {editImages.length + newFiles.length < MAX_IMAGES && (
              <label className="text-xs text-brand-blue underline cursor-pointer">
                Add photo
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleNewFiles(e.target.files)} />
              </label>
            )}
          </div>
        </div>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <div className="flex gap-2">
          <button onClick={saveEdit} disabled={saving} className="btn-primary px-4 py-2 text-sm">
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setEditTitle(post.title);
              setEditContent(post.content);
              setEditImages(post.image_urls ?? []);
              setNewFiles([]);
              setSaveError("");
            }}
            className="btn-outline px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
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

      {(isOwner || isAdmin) && (
        <div className="flex gap-3 mt-4 pt-3 border-t border-brand-bg">
          {isOwner && (
            <button
              onClick={() => {
                setEditTitle(post.title);
                setEditContent(post.content);
                setEditImages(post.image_urls ?? []);
                setNewFiles([]);
                setSaveError("");
                setEditing(true);
              }}
              className="text-sm text-brand-blue"
            >
              Edit
            </button>
          )}
          {isAdmin && (
            <button onClick={togglePin} className="text-sm text-brand-blue">
              {post.pinned ? "Unpin" : "Pin"} (admin)
            </button>
          )}
          {isAdmin && (
            <button onClick={deletePost} className="text-sm text-red-600">
              Delete (admin)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
