export const LEVELS = [
  { name: "Lv1 새싹", min: 0 },
  { name: "Lv2 미식가", min: 20 },
  { name: "Lv3 맛집헌터", min: 50 },
  { name: "Lv4 미식마스터", min: 100 },
  { name: "Lv5 맛집전설", min: 200 },
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

export const CATEGORIES = ["한식", "중식", "일식", "양식", "카페·디저트", "기타"] as const;
export const TIME_TAGS = ["점심", "저녁", "주말"] as const;
export const COMPANION_TAGS = ["가족과 함께", "혼자서", "친구·동료와 함께"] as const;
export const PRICE_RANGES = ["1만원 이하", "1~2만원", "2~3만원", "3만원 이상"] as const;
