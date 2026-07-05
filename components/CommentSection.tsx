"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const MAX_IMAGES = 4;

type Comment = {
  id: string;
  content: string;
  rating: number | null;
  image_urls: string[];
  created_at: string;
  created_by: string | null;
  guest_name: string | null;
  profiles: { name: string | null; email: string } | null;
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-brand-gray">Rating</span>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            className="text-lg leading-none px-0.5 text-amber-500"
            aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
          >
            {n <= value ? "★" : "☆"}
          </button>
        ))}
      </div>
      <span className="text-xs text-brand-gray">(optional)</span>
    </div>
  );
}

export default function CommentSection({ placeId }: { placeId: string }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [guestName, setGuestName] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select("id, content, rating, image_urls, created_at, created_by, guest_name, profiles(name, email)")
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

  function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const combined = [...newFiles, ...Array.from(files)].slice(0, MAX_IMAGES);
    setNewFiles(combined);
  }

  function removeFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    setPosting(true);
    setError("");
    try {
      const image_urls: string[] = [];
      for (const file of newFiles) {
        const ext = file.name.split(".").pop();
        const path = `comments/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("place-photos").upload(path, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
        image_urls.push(data.publicUrl);
      }

      const { error: insertError } = await supabase.from("comments").insert({
        place_id: placeId,
        content: newComment.trim(),
        rating: newRating > 0 ? newRating : null,
        image_urls,
        created_by: user ? user.id : null,
        guest_name: user ? null : guestName.trim() || null,
      });
      if (insertError) throw insertError;

      setNewComment("");
      setGuestName("");
      setNewRating(0);
      setNewFiles([]);
      loadComments();
    } catch (err: any) {
      setError(err.message ?? "Couldn't post your comment.");
    } finally {
      setPosting(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    await supabase.from("comments").update({ content: editText.trim(), updated_at: new Date().toISOString() }).eq("id", id);
    setEditingId(null);
    loadComments();
  }

  async function deleteComment(id: string) {
    if (!confirm("Delete this comment?")) return;
    await supabase.from("comments").delete().eq("id", id);
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
                {editingId === c.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1"
                    />
                    <button onClick={() => saveEdit(c.id)} className="btn-primary px-3 text-xs">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="btn-outline px-3 text-xs">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">
                      <span className="font-medium">{c.profiles?.name ?? c.guest_name ?? "Anonymous"}</span>
                      {c.rating && (
                        <span className="text-amber-500 ml-1">{"★".repeat(c.rating)}</span>
                      )}{" "}
                      — {c.content}
                    </p>
                    {c.image_urls?.length > 0 && (
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {c.image_urls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="w-14 h-14 rounded-lg object-cover border border-brand-bg" />
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-0.5">
                      {user?.id === c.created_by && (
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setEditText(c.content);
                          }}
                          className="text-xs text-brand-blue"
                        >
                          Edit
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => deleteComment(c.id)} className="text-xs text-red-600">
                          Delete (admin)
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

      <div className="mt-4 space-y-2">
        {!user && (
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full sm:w-56"
          />
        )}

        <StarPicker value={newRating} onChange={setNewRating} />

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

        <div className="flex items-center gap-2 flex-wrap">
          {newFiles.map((f, i) => (
            <span key={i} className="tag bg-brand-bg text-brand-gray flex items-center gap-1">
              {f.name.length > 14 ? f.name.slice(0, 12) + "…" : f.name}
              <button onClick={() => removeFile(i)} className="text-brand-gray hover:text-red-600" aria-label="Remove photo">
                ×
              </button>
            </span>
          ))}
          {newFiles.length < MAX_IMAGES && (
            <label className="text-xs text-brand-blue underline cursor-pointer">
              Add photo{newFiles.length > 0 ? "s" : ""} (up to {MAX_IMAGES})
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </label>
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {!user && (
          <p className="text-xs text-brand-gray">
            Commenting without an account. <button onClick={signInWithGoogle} className="text-brand-blue underline">Sign in with Google</button> to earn points for your comments.
          </p>
        )}
      </div>
    </div>
  );
}
