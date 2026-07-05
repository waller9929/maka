import Link from "next/link";
import Image from "next/image";
import StarRating from "./StarRating";
import { RESTAURANT_TYPE_INFO } from "@/lib/level";

export type Place = {
  id: string;
  name: string;
  location: string | null;
  category: string;
  rating: number;
  restaurant_type: string | null;
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
          {place.restaurant_type && RESTAURANT_TYPE_INFO[place.restaurant_type] && (
            <span className={`tag ${RESTAURANT_TYPE_INFO[place.restaurant_type].badgeClass}`}>
              {RESTAURANT_TYPE_INFO[place.restaurant_type].label}
            </span>
          )}
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
