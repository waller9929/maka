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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [error, setError] = useState("");

  async function handleDeleteOne(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    setError("");
    const { error: deleteError } = await supabase.from("places").delete().eq("id", id);
    setDeletingId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPlaces((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  async function handleDeleteAll() {
    if (places.length === 0) return;
    if (!confirm(`Delete ALL ${places.length} places? This cannot be undone.`)) return;
    if (!confirm("Are you absolutely sure? This will permanently delete every place on MAKA.")) return;
    setDeletingAll(true);
    setError("");
    const { error: deleteError } = await supabase.from("places").delete().not("id", "is", null);
    setDeletingAll(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPlaces([]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-gray">{places.length} places</p>
        <button
          onClick={handleDeleteAll}
          disabled={deletingAll || places.length === 0}
          className="btn-outline px-3 py-1.5 text-sm text-red-600"
        >
          {deletingAll ? "Deleting..." : "Delete all"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-hidden">
        {places.length === 0 ? (
          <p className="p-6 text-sm text-brand-gray text-center">No places to manage.</p>
        ) : (
          places.map((place) => (
            <div
              key={place.id}
              className="flex items-center justify-between gap-3 px-4 py-3 border-b border-brand-bg last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{place.name}</p>
                <p className="text-xs text-brand-gray truncate">
                  {place.category} · {place.location ?? "No location"}
                </p>
              </div>
              <button
                onClick={() => handleDeleteOne(place.id, place.name)}
                disabled={deletingId === place.id}
                className="text-xs text-red-600 shrink-0"
              >
                {deletingId === place.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
