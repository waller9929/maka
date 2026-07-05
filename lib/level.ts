export const LEVELS = [
  { name: "Lv1 Sprout", min: 0 },
  { name: "Lv2 Foodie", min: 20 },
  { name: "Lv3 Hunter", min: 50 },
  { name: "Lv4 Gourmet Master", min: 100 },
  { name: "Lv5 Legend", min: 200 },
] as const;

export function getLevel(points: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const lvl of LEVELS) {
    if (points >= lvl.min) current = lvl;
  }
  return current.name;
}

export function getNextLevelInfo(points: number) {
  const idx = LEVELS.findIndex((l) => l.name === getLevel(points));
  const next = LEVELS[idx + 1];
  if (!next) return null;
  return { name: next.name, pointsNeeded: next.min - points };
}

export const CATEGORIES = ["Korean", "Chinese", "Japanese", "Western", "Cafe/Dessert", "Other"] as const;
export const TIME_TAGS = ["Lunch", "Dinner", "Weekend"] as const;
export const COMPANION_TAGS = ["With family", "Solo", "With friends/colleagues"] as const;
export const PRICE_RANGES = ["Under $10", "$10-20", "$20-30", "Over $30"] as const;

// Maps Google Places "types" values to MAKA categories for bulk import
export function mapGoogleTypeToCategory(types: string[] | undefined): string {
  if (!types) return "Other";
  const t = types.join(",").toLowerCase();
  if (t.includes("korean")) return "Korean";
  if (t.includes("chinese")) return "Chinese";
  if (t.includes("japanese") || t.includes("sushi")) return "Japanese";
  if (
    t.includes("italian") ||
    t.includes("french") ||
    t.includes("steak") ||
    t.includes("pizza") ||
    t.includes("western") ||
    t.includes("american")
  )
    return "Western";
  if (t.includes("cafe") || t.includes("coffee") || t.includes("bakery") || t.includes("dessert"))
    return "Cafe/Dessert";
  return "Other";
}
