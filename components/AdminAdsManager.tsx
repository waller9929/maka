"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdRow = {
  id: string;
  business_name: string;
  message: string | null;
  image_url: string | null;
  link_url: string | null;
  starts_at: string;
  ends_at: string | null;
};

function isActive(ad: AdRow) {
  const today = new Date().toISOString().slice(0, 10);
  return ad.starts_at <= today && (!ad.ends_at || ad.ends_at >= today);
}

export default function AdminAdsManager({ initialAds }: { initialAds: AdRow[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [ads, setAds] = useState(initialAds);
  const [businessName, setBusinessName] = useState("");
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!businessName.trim()) {
      setError("Enter a business name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let image_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `ads/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("place-photos").upload(path, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
        image_url = data.publicUrl;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("sponsored_ads")
        .insert({
          business_name: businessName.trim(),
          message: message.trim() || null,
          link_url: linkUrl.trim() || null,
          starts_at: startsAt,
          ends_at: endsAt || null,
          image_url,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      setAds((prev) => [inserted as AdRow, ...prev]);
      setBusinessName("");
      setMessage("");
      setLinkUrl("");
      setEndsAt("");
      setFile(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ad? This cannot be undone.")) return;
    setDeletingId(id);
    const { error: deleteError } = await supabase.from("sponsored_ads").delete().eq("id", id);
    setDeletingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setAds((prev) => prev.filter((a) => a.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-3">
        <p className="text-sm font-medium">Add a sponsored ad</p>
        <p className="text-xs text-brand-gray">
          Only one ad is shown at a time on the homepage, just above the filter bar. If more than
          one is active, a random one is shown on each visit. Ads outside their date range are
          automatically hidden.
        </p>

        <div>
          <label className="text-sm font-medium block mb-1">Business name</label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Warung Bu Rini"
            className="w-full"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Message (optional)</label>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="New opening — 15% off this month"
            className="w-full"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Link (optional)</label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Image (optional)</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Starts</label>
            <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Ends (optional)</label>
            <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button onClick={handleAdd} disabled={saving} className="btn-primary px-4 py-2 text-sm">
          {saving ? "Adding..." : "Add ad"}
        </button>
      </div>

      <div className="card overflow-hidden">
        {ads.length === 0 ? (
          <p className="p-6 text-sm text-brand-gray text-center">No ads yet.</p>
        ) : (
          ads.map((ad) => (
            <div key={ad.id} className="flex items-center gap-3 px-4 py-3 border-b border-brand-bg last:border-b-0">
              {ad.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-brand-bg flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{ad.business_name}</p>
                <p className="text-xs text-brand-gray truncate">
                  {ad.starts_at} ~ {ad.ends_at ?? "no end date"}
                </p>
              </div>
              <span
                className={`tag flex-shrink-0 ${
                  isActive(ad) ? "bg-green-100 text-green-800" : "bg-brand-bg text-brand-gray"
                }`}
              >
                {isActive(ad) ? "Active" : "Not active"}
              </span>
              <button
                onClick={() => handleDelete(ad.id)}
                disabled={deletingId === ad.id}
                className="btn-outline px-3 py-1.5 text-xs text-red-600 flex-shrink-0"
              >
                {deletingId === ad.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
