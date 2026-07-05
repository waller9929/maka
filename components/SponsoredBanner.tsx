export type SponsoredAd = {
  id: string;
  business_name: string;
  message: string | null;
  image_url: string | null;
  link_url: string | null;
};

// Picks one ad at random so multiple sponsors rotate evenly across visits,
// rather than always showing whichever was added first.
export function pickActiveAd(ads: SponsoredAd[]): SponsoredAd | null {
  if (ads.length === 0) return null;
  return ads[Math.floor(Math.random() * ads.length)];
}

export default function SponsoredBanner({ ad }: { ad: SponsoredAd }) {
  const content = (
    <div className="card p-3 flex items-center gap-3 mb-5">
      {ad.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.image_url} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-brand-bg flex-shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{ad.business_name}</p>
        {ad.message && <p className="text-xs text-brand-gray truncate">{ad.message}</p>}
      </div>
      <span className="tag border border-brand-gray text-brand-gray flex-shrink-0">Sponsored</span>
    </div>
  );

  if (!ad.link_url) return content;

  return (
    <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored" className="block no-underline text-inherit">
      {content}
    </a>
  );
}
