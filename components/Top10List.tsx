import Link from "next/link";
import type { Place } from "./PlaceCard";

// Ranks places by rating first, then by comment count as a tiebreaker.
export function rankTop10(places: Place[]): Place[] {
  return [...places]
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return (b.comment_count ?? 0) - (a.comment_count ?? 0);
    })
    .slice(0, 10);
}

export default function Top10List({ places }: { places: Place[] }) {
  if (places.length === 0) {
    return <p className="text-sm text-brand-gray">No ranked places yet.</p>;
  }

  return (
    <div className="card overflow-hidden">
      {places.map((place, i) => (
        <Link
          key={place.id}
          href={`/places/${place.id}`}
          className="flex items-center gap-3 px-3 py-2 border-b border-brand-bg last:border-b-0 hover:bg-brand-bg transition-colors"
        >
          <span className="text-xs text-brand-gray w-4 shrink-0">{i + 1}</span>
          <span className="text-sm flex-1 truncate">{place.name}</span>
          <span className="text-xs text-brand-gray shrink-0">
            ★ {Number(place.rating ?? 0).toFixed(1)}
            <span className="ml-1">· {place.comment_count ?? 0}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
