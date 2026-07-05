"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, TIME_TAGS, COMPANION_TAGS, RESTAURANT_TYPES } from "@/lib/level";
import type { User } from "@supabase/supabase-js";

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export default function PlaceForm() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const [mapsUrl, setMapsUrl] = useState("");
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsError, setMapsError] = useState("");
  const [fetchedPhotoDataUrl, setFetchedPhotoDataUrl] = useState<string | null>(null);
  const [resolvedMapsUrl, setResolvedMapsUrl] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [rating, setRating] = useState(5);
  const [restaurantType, setRestaurantType] = useState<string>(RESTAURANT_TYPES[0]);
  const [timeTags, setTimeTags] = useState<string[]>([]);
  const [companionTags, setCompanionTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, [supabase]);

  async function fetchFromMapsLink() {
    if (!mapsUrl.trim()) return;
    setMapsLoading(true);
    setMapsError("");
    try {
      const res = await fetch("/api/places-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: mapsUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed.");

      if (data.name) setName(data.name);
      if (data.location) setLocation(data.location);
      if (data.category) setCategory(data.category);
      if (data.photoDataUrl) setFetchedPhotoDataUrl(data.photoDataUrl);
      if (data.googleMapsUrl) setResolvedMapsUrl(data.googleMapsUrl);
    } catch (err: any) {
      setMapsError(err.message ?? "Could not fetch info from that link.");
    } finally {
      setMapsLoading(false);
    }
  }

  async function uploadFile(file: File, prefix: string) {
    const ext = file.name.split(".").pop();
    const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("place-photos").upload(path, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setError("Please enter a place name.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      let photo_url: string | null = null;
      if (photoFile) {
        photo_url = await uploadFile(photoFile, "photos");
      } else if (fetchedPhotoDataUrl) {
        const file = dataUrlToFile(fetchedPhotoDataUrl, "google-photo.jpg");
        photo_url = await uploadFile(file, "photos");
      }
      const menu_photo_url = menuFile ? await uploadFile(menuFile, "menus") : null;

      const { data, error: insertError } = await supabase
        .from("places")
        .insert({
          name: name.trim(),
          location: location.trim() || null,
          category,
          base_rating: rating,
          restaurant_type: restaurantType,
          time_tags: timeTags,
          companion_tags: companionTags,
          comment: comment.trim() || null,
          photo_url,
          menu_photo_url,
          google_maps_url: resolvedMapsUrl || mapsUrl.trim() || null,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      router.push(`/places/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong while saving.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-brand-gray mb-3">Sign in with Google to recommend a place.</p>
        <button
          onClick={() =>
            supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: `${window.location.origin}/auth/callback?next=/places/new` },
            })
          }
          className="btn-primary px-4 py-2 text-sm"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1">Google Maps link (optional)</label>
        <div className="flex gap-2">
          <input
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (pasted) {
                e.preventDefault();
                setMapsUrl(pasted);
                setTimeout(() => fetchFromMapsLink(), 0);
              }
            }}
            placeholder="https://maps.app.goo.gl/..."
            className="flex-1"
          />
          <button
            type="button"
            onClick={fetchFromMapsLink}
            disabled={mapsLoading || !mapsUrl.trim()}
            className="btn-outline px-3 text-sm whitespace-nowrap"
          >
            {mapsLoading ? "Fetching..." : "Fetch info"}
          </button>
        </div>
        {mapsError && <p className="text-xs text-red-600 mt-1">{mapsError}</p>}
        {fetchedPhotoDataUrl && (
          <p className="text-xs text-brand-gray mt-1">Fetched a photo from Google Maps — it will be used unless you upload your own below.</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Location</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full" placeholder="e.g. Near Gangnam Station Exit 3" />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Restaurant type</label>
        <div className="grid grid-cols-3 gap-2">
          {RESTAURANT_TYPES.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setRestaurantType(t)}
              className={`rounded-card border py-2.5 text-sm text-center transition-colors ${
                restaurantType === t
                  ? "bg-brand-blue text-white border-brand-blue"
                  : "border-brand-gray text-brand-gray"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Rating (1-5)</label>
        <input type="number" min={1} max={5} step={0.1} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full" />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Best for</label>
        <div className="flex gap-2">
          {TIME_TAGS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTimeTags(toggle(timeTags, t))}
              className={`tag border ${timeTags.includes(t) ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Good company</label>
        <div className="flex gap-2 flex-wrap">
          {COMPANION_TAGS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setCompanionTags(toggle(companionTags, t))}
              className={`tag border ${companionTags.includes(t) ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Upload a photo</label>
        <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Upload a menu photo</label>
        <input type="file" accept="image/*" onChange={(e) => setMenuFile(e.target.files?.[0] ?? null)} />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">One-line comment</label>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full" rows={3} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm">
        {submitting ? "Saving..." : "Add place (+10 points)"}
      </button>
    </form>
  );
}
