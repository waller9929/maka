import { NextResponse } from "next/server";
import { mapGoogleTypeToCategory } from "@/lib/level";

export const dynamic = "force-dynamic";

// Resolves a Google Maps link (short or full) and looks up basic place info
// (name, address, category, first photo) using the Google Places API.
// Requires the server-only env var GOOGLE_PLACES_API_KEY.
export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const { url } = await request.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "A Google Maps link is required." }, { status: 400 });
  }

  try {
    // 1. Follow redirects so short links (maps.app.goo.gl/...) resolve to the full URL.
    const resolved = await fetch(url, { redirect: "follow" });
    const finalUrl = resolved.url || url;

    // 2. Try to pull a readable place name out of the URL path.
    const nameMatch = finalUrl.match(/\/maps\/place\/([^/@]+)/);
    const rawName = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, " ")) : null;

    // 3. Try to pull lat/lng out of the URL for location bias.
    const coordMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const lat = coordMatch ? coordMatch[1] : null;
    const lng = coordMatch ? coordMatch[2] : null;

    if (!rawName) {
      return NextResponse.json(
        { error: "Could not read a place name from that link. Try pasting a different Google Maps link, or enter details manually." },
        { status: 422 }
      );
    }

    // 4. Find Place From Text — resolves the free-text name to a place_id + basic fields.
    const findParams = new URLSearchParams({
      input: rawName,
      inputtype: "textquery",
      fields: "place_id,name,formatted_address,photos,types",
      key: apiKey,
    });
    if (lat && lng) findParams.set("locationbias", `point:${lat},${lng}`);

    const findRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${findParams.toString()}`
    );
    const findData = await findRes.json();
    const candidate = findData.candidates?.[0];

    if (!candidate) {
      return NextResponse.json(
        { error: "Google could not find that place. Please enter the details manually." },
        { status: 422 }
      );
    }

    const category = mapGoogleTypeToCategory(candidate.types);

    // 5. Fetch the first photo's bytes (server-side, using the secret key) and
    // return it as a base64 data URL so the browser can upload it to Supabase Storage.
    let photoDataUrl: string | null = null;
    const photoRef = candidate.photos?.[0]?.photo_reference;
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
      name: candidate.name ?? rawName,
      location: candidate.formatted_address ?? null,
      category,
      photoDataUrl,
      googleMapsUrl: finalUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Something went wrong while looking up that link." },
      { status: 500 }
    );
  }
}
