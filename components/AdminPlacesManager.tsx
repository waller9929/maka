"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PlaceRow = {
  id: string;
  name: string;
  location: string | null;
  category: string;
  created_at: string;
};

export default function AdminPlacesManager({ initialPlaces }: { initialPlaces: PlaceRow[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [places, setPlaces] = useState(initialPlaces);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const allSelected = places.length > 0 && selected.size === places.length;

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
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-brand-gray">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          {selected.size > 0 ? `${selected.size} of ${places.length} selected` : `${places.length} places`}
        </label>
        <button
          onClick={handleDeleteSelected}
          disabled={deleting || selected.size === 0}
          className="btn-outline px-3 py-1.5 text-sm text-red-600"
        >
          {deleting ? "Deleting..." : `Delete selected (${selected.size})`}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-hidden">
        {places.length === 0 ? (
          <p className="p-6 text-sm text-brand-gray text-center">No places to manage.</p>
        ) : (
          places.map((place) => (
            <label
              key={place.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-brand-bg last:border-b-0 cursor-pointer hover:bg-brand-bg"
            >
              <input
                type="checkbox"
                checked={selected.has(place.id)}
                onChange={() => toggleOne(place.id)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{place.name}</p>
                <p className="text-xs text-brand-gray truncate">
                  {place.category} · {place.location ?? "No location"}
                </p>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
