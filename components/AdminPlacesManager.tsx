"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, RESTAURANT_TYPES } from "@/lib/level";

type PlaceRow = {
  id: string;
  name: string;
  location: string | null;
  category: string;
  restaurant_type: string | null;
  base_rating: number;
  rating: number;
  created_at: string;
};

export default function AdminPlacesManager({ initialPlaces }: { initialPlaces: PlaceRow[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [places, setPlaces] = useState(initialPlaces);
  const original = useRef<Map<string, PlaceRow>>(new Map(initialPlaces.map((p) => [p.id, p])));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const allSelected = places.length > 0 && selected.size === places.length;

  const dirtyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of places) {
      const orig = original.current.get(p.id);
      if (!orig) continue;
      if (
        orig.name !== p.name ||
        orig.location !== p.location ||
        orig.category !== p.category ||
        orig.restaurant_type !== p.restaurant_type ||
        orig.base_rating !== p.base_rating
      ) {
        ids.add(p.id);
      }
    }
    return ids;
  }, [places]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(places.map((p) => p.id)));
  }

  function updateField<K extends keyof PlaceRow>(id: string, field: K, value: PlaceRow[K]) {
    setSaved(false);
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected place(s)? This cannot be undone.`)) return;
    setDeleting(true);
    setError("");
    const { error: deleteError } = await supabase.from("places").delete().in("id", ids);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPlaces((prev) => prev.filter((p) => !selected.has(p.id)));
    ids.forEach((id) => original.current.delete(id));
    setSelected(new Set());
    router.refresh();
  }

  async function handleSaveChanges() {
    const ids = Array.from(dirtyIds);
    if (ids.length === 0) return;
    setSaving(true);
    setError("");
    setSaved(false);

    const results = await Promise.all(
      ids.map((id) => {
        const p = places.find((pl) => pl.id === id)!;
        return supabase
          .from("places")
          .update({
            name: p.name,
            location: p.location,
            category: p.category,
            restaurant_type: p.restaurant_type,
            base_rating: p.base_rating,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      })
    );

    setSaving(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      setError(failed.error.message);
      return;
    }

    for (const id of ids) {
      const p = places.find((pl) => pl.id === id);
      if (p) original.current.set(id, p);
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="flex items-center gap-2 text-sm text-brand-gray">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          {selected.size > 0 ? `${selected.size} of ${places.length} selected` : `${places.length} places`}
        </label>
        <div className="flex items-center gap-2">
          {saved && dirtyIds.size === 0 && <span className="text-sm text-brand-blue">Saved.</span>}
          <button
            onClick={handleSaveChanges}
            disabled={saving || dirtyIds.size === 0}
            className="btn-primary px-3 py-1.5 text-sm"
          >
            {saving ? "Saving..." : `Save changes (${dirtyIds.size})`}
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={deleting || selected.size === 0}
            className="btn-outline px-3 py-1.5 text-sm text-red-600"
          >
            {deleting ? "Deleting..." : `Delete selected (${selected.size})`}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-xs text-brand-gray">
        Base rating seeds the place's overall rating (shown as "Rating" across the site); the
        displayed rating is then automatically averaged in with any ratings left in comments.
      </p>

      <div className="card overflow-hidden">
        {places.length === 0 ? (
          <p className="p-6 text-sm text-brand-gray text-center">No places to manage.</p>
        ) : (
          places.map((place) => (
            <div
              key={place.id}
              className={`flex items-start gap-3 px-4 py-3 border-b border-brand-bg last:border-b-0 ${
                dirtyIds.has(place.id) ? "bg-brand-blueLight/40" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(place.id)}
                onChange={() => toggleOne(place.id)}
                className="mt-2"
              />
              <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input
                  value={place.name}
                  onChange={(e) => updateField(place.id, "name", e.target.value)}
                  className="text-sm"
                  placeholder="Name"
                />
                <input
                  value={place.location ?? ""}
                  onChange={(e) => updateField(place.id, "location", e.target.value)}
                  className="text-sm"
                  placeholder="Location"
                />
                <select
                  value={place.category}
                  onChange={(e) => updateField(place.id, "category", e.target.value)}
                  className="text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={place.restaurant_type ?? RESTAURANT_TYPES[0]}
                  onChange={(e) => updateField(place.id, "restaurant_type", e.target.value)}
                  className="text-sm"
                >
                  {RESTAURANT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={place.base_rating}
                    onChange={(e) => updateField(place.id, "base_rating", parseFloat(e.target.value) || 0)}
                    className="text-sm w-full"
                    placeholder="Base rating"
                  />
                  <span className="text-xs text-brand-gray flex-shrink-0" title="Current displayed rating">
                    → {Number(place.rating ?? 0).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
