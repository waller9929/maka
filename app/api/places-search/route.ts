import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Searches Google Places for a free-text restaurant query — or, when the
// browser supplies the user's current lat/lng, finds nearby restaurants —
// and returns a short list of candidates for the "Search on Google" picker
// in the add-place form. Keeps the API key server-side, same as places-lookup.
export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const { query, lat, lng } = await request.json();
  const hasLocation = typeof lat === "number" && typeof lng === "number";
  const hasQuery = typeof query === "string" && query.trim().length > 0;

  if (!hasQuery && !hasLocation) {
    return NextResponse.json({ error: "Enter a search term." }, { status: 400 });
  }

  try {
    let url: string;

    if (hasLocation && !hasQuery) {
      // Pure "restaurants near me": Nearby Search ranked by distance.
      const params = new URLSearchParams({
        location: `${lat},${lng}`,
        rankby: "distance",
        type: "restaurant",
        key: apiKey,
      });
      url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
    } else {
      // Free-text search, optionally biased toward the user's location.
      const params = new URLSearchParams({
        query: query.trim(),
        key: apiKey,
      });
      if (hasLocation) {
        params.set("location", `${lat},${lng}`);
        params.set("radius", "5000");
      }
      url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { error: data.error_message ?? `Google search failed (${data.status}).` },
        { status: 502 }
      );
    }

    const results = (data.results ?? []).slice(0, 8).map((r: any) => ({
      place_id: r.place_id,
      name: r.name,
      formatted_address: r.formatted_address ?? r.vicinity ?? null,
    }));

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Something went wrong while searching." },
      { status: 500 }
    );
  }
}
