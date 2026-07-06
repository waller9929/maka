import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Text-searches Google Places for a free-text restaurant query and returns
// a short list of candidates for the "Search on Google" picker in the
// add-place form. Keeps the API key server-side, same as places-lookup.
export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const { query } = await request.json();
  if (!query || typeof query !== "string" || !query.trim()) {
    return NextResponse.json({ error: "Enter a search term." }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      query: query.trim(),
      key: apiKey,
    });

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
    );
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
      formatted_address: r.formatted_address ?? null,
    }));

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Something went wrong while searching." },
      { status: 500 }
    );
  }
}
