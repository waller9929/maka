import Link from "next/link";
import Image from "next/image";
import StarRating from "./StarRating";

export type Place = {
  id: string;
  name: string;
  location: string | null;
  category: string;
  rating: number;
  value_rating: number;
  price_range: string | null;
  photo_url: string | null;
  time_tags: string[];
  companion_tags: string[];
  comment_count?: number;
  recommender_name?: string | null;
};

export default function PlaceCard({ place }: { place: Place }) {
  return (
    <Link
      href={`/places/${place.id}`}
      className="card block overflow-hidden hover:border-brand-blue transition-colors"
    >
      <div className="h-28 bg-brand-bg flex items-center justify-center relative">
        {place.photo_url ? (
          <Image
            src={place.photo_url}
            alt={place.name}
            fill
            className="object-cover"
          />
        ) : (
          <span className="text-brand-gray text-xs">No photo</span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate">{place.name}</span>
          <StarRating value={place.rating} />
        </div>
        <p className="text-xs text-brand-gray mt-1">
          {place.category} · {place.location ?? "No location"}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {place.time_tags.map((t) => (
            <span key={t} className="tag bg-brand-blueLight text-brand-blueDark">
              {t}
            </span>
          ))}
        </div>
        <p className="text-xs text-brand-gray mt-2">
          {place.recommender_name ? `Added by ${place.recommender_name}` : ""}
          {place.comment_count !== undefined ? ` · ${place.comment_count} comments` : ""}
        </p>
      </div>
    </Link>
  );
}
