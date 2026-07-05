// Region / city detection based on the free-text "location" field.
// No database column is needed — this runs on whatever text the user
// (or the Google Maps lookup / bulk upload) put into "location".

export const INDONESIA_CITIES = [
  { label: "Jakarta", keywords: ["jakarta"] },
  { label: "Bandung", keywords: ["bandung"] },
  { label: "Surabaya", keywords: ["surabaya"] },
  { label: "Bali", keywords: ["bali", "denpasar", "kuta", "seminyak", "ubud", "canggu"] },
  { label: "Medan", keywords: ["medan"] },
  { label: "Semarang", keywords: ["semarang"] },
  { label: "Yogyakarta", keywords: ["yogyakarta", "jogja"] },
  { label: "Makassar", keywords: ["makassar"] },
] as const;

export type IndonesiaCity = (typeof INDONESIA_CITIES)[number]["label"];

// Returns one of the known Indonesian city labels, or "Other" if the
// location text doesn't match any of them.
export function detectCity(location: string | null | undefined): string {
  if (!location) return "Other";
  const l = location.toLowerCase();
  for (const c of INDONESIA_CITIES) {
    if (c.keywords.some((k) => l.includes(k))) return c.label;
  }
  return "Other";
}

// Returns "Indonesia" if the location text mentions Indonesia (in English
// or Korean) or matches one of the known Indonesian cities; "Other" otherwise.
export function detectRegion(location: string | null | undefined): "Indonesia" | "Other" {
  if (!location) return "Other";
  const l = location.toLowerCase();
  if (l.includes("indonesia") || l.includes("인도네시아")) return "Indonesia";
  if (detectCity(location) !== "Other") return "Indonesia";
  return "Other";
}
