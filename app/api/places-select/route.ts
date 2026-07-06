import { NextResponse } from "next/server";
import { mapGoogleTypeToCategory } from "@/lib/level";

export const dynamic = "force-dynamic";

// Given a place_id chosen from the /api/places-search results list, fetches
// full details (name, address, canonical Maps URL, first photo) the same
// way places-lookup does for a pasted link.
export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const { place_id } = await request.json();
  if (!place_id || typeof place_id !== "string") {
    return NextResponse.json({ error: "A place_id is required." }, { status: 400 });
  }

  try {
    const detailsParams = new URLSearchParams({
      place_id,
      fields: "name,formatted_address,url,photos,types",
      key: apiKey,
    });

    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams.toString()}`
    );
    const detailsData = await detailsRes.json();
    const place = detailsData.result;

    if (!place) {
      return NextResponse.json(
        { error: "Could not load details for that place." },
        { status: 422 }
      );
    }

    const category = mapGoogleTypeToCategory(place.types);

    let photoDataUrl: string | null = null;
    const photoRef = place.photos?.[0]?.photo_reference;
    if (photoRef) {
      const photoParams = new URLSearchParams({
        maxwidth: "1000",
        photo_reference: photoRef,
        key: apiKey,
      });
      const photoRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/photo?${photoParams.toString()}`
      );
      if (photoRes.ok) {
        const contentType = photoRes.headers.get("content-type") ?? "image/jpeg";
        const buffer = Buffer.from(await photoRes.arrayBuffer());
        photoDataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
      }
    }

    return NextResponse.json({
      name: place.name ?? null,
      location: place.formatted_address ?? null,
      category,
      photoDataUrl,
      googleMapsUrl: place.url ?? null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Something went wrong while loading that place." },
      { status: 500 }
    );
  }
}
