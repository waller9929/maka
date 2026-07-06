export const BOARD_CATEGORIES = [
  "Free",
  "Notice",
  "Marketplace",
  "QnA",
  "Experience",
  "News",
] as const;

export type BoardCategory = (typeof BOARD_CATEGORIES)[number];

export const BOARD_CATEGORY_LABELS: Record<string, string> = {
  Free: "Free board",
  Notice: "Notice",
  Marketplace: "Marketplace",
  QnA: "Q&A",
  Experience: "Experiences",
  News: "Indonesia news",
};

// Categories a regular member/guest can write to directly. Notice is
// admin-only and News is filled in automatically by the RSS crawler —
// neither should show up as a choice on the "write a post" form.
export const WRITABLE_CATEGORIES = BOARD_CATEGORIES.filter(
  (c) => c !== "News"
) as BoardCategory[];
