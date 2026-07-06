"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WRITABLE_CATEGORIES, BOARD_CATEGORY_LABELS, type BoardCategory } from "@/lib/board";
import type { User } from "@supabase/supabase-js";

const MAX_IMAGES = 4;

export default function BoardPostForm({ defaultCategory }: { defaultCategory?: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [category, setCategory] = useState<BoardCategory>(
    (defaultCategory as BoardCategory) ?? "Free"
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!user) return setIsAdmin(false);
    supabase.from("profiles").select("is_admin").eq("id", user.id).single()
      .then(({ data }) => setIsAdmin(!!data?.is_admin));
  }, [user, supabase]);

  const availableCategories = isAdmin ? ["Notice", ...WRITABLE_CATEGORIES] : WRITABLE_CATEGORIES;

  function handleFilesSelected(selected: FileList | null) {
    if (!selected) return;
    setFiles((prev) => [...prev, ...Array.from(selected)].slice(0, MAX_IMAGES));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Please fill in a title and content.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const image_urls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `board/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("place-photos").upload(path, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
        image_urls.push(data.publicUrl);
      }

      const { data, error: insertError } = await supabase
        .from("board_posts")
        .insert({
          category,
          title: title.trim(),
          content: content.trim(),
          image_urls,
          created_by: user ? user.id : null,
          guest_name: user ? null : guestName.trim() || null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      router.push(`/board/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong while posting.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as BoardCategory)} className="w-full">
          {availableCategories.map((c) => (
            <option key={c} value={c}>{BOARD_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      {!user && (
        <div>
          <label className="text-sm font-medium block mb-1">Your name (optional)</label>
          <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full sm:w-56" placeholder="Anonymous" />
        </div>
      )}

      <div>
        <label className="text-sm font-medium block mb-1">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full" />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Content</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full" rows={6} />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Photos (optional, up to {MAX_IMAGES})</label>
        <div className="flex items-center gap-2 flex-wrap">
          {files.map((f, i) => (
            <span key={i} className="tag bg-brand-bg text-brand-gray flex items-center gap-1">
              {f.name.length > 14 ? f.name.slice(0, 12) + "…" : f.name}
              <button type="button" onClick={() => removeFile(i)} className="text-brand-gray hover:text-red-600" aria-label="Remove photo">
                ×
              </button>
            </span>
          ))}
          {files.length < MAX_IMAGES && (
            <label className="text-xs text-brand-blue underline cursor-pointer">
              Add photo{files.length > 0 ? "s" : ""}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
            </label>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm">
        {submitting ? "Posting..." : user ? "Post (+10 points)" : "Post"}
      </button>

      {!user && (
        <p className="text-xs text-brand-gray text-center">
          Posting without an account.{" "}
          <button
            type="button"
            onClick={() =>
              supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/auth/callback?next=/board/new` },
              })
            }
            className="text-brand-blue underline"
          >
            Sign in with Google
          </button>{" "}
          to earn points.
        </p>
      )}
    </form>
  );
}
