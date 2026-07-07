export type Lang = "en" | "ko" | "id";

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "ko", label: "KO" },
  { code: "id", label: "ID" },
];

type Dict = Record<string, string>;

// Covers the main member-facing UI chrome (nav, footer, filter bar, home
// page headings, board headings/buttons). Free-text content people write
// (place names, comments, board post bodies) is never translated. Deeper
// admin-only screens are left in English/Korean for this round.
const en: Dict = {
  board: "Board",
  add_a_place: "Add a place",
  sign_in_google: "Sign in with Google",
  sign_out: "Sign out",
  admin: "Admin",
  leaderboard: "Leaderboard",
  search_placeholder: "Search by name or location",
  all: "All",
  time: "Time",
  with: "With",
  region: "Region",
  city: "City",
  todays_picks: "Today's picks",
  todays_picks_sub: "Three random picks from three different categories.",
  top10: "Top 10",
  top10_sub: "Ranked by rating, then by comment count.",
  no_places: "No places yet. Be the first to add one!",
  contact: "Contact",
  write_a_post: "Write a post",
  board_title: "Board",
  board_preview_title: "From the board",
  board_preview_sub: "Latest posts across every category.",
  comments: "comments",
  views: "views",
  no_posts: "No posts yet.",
};

const ko: Dict = {
  board: "게시판",
  add_a_place: "맛집 등록",
  sign_in_google: "구글로 로그인",
  sign_out: "로그아웃",
  admin: "관리자",
  leaderboard: "리더보드",
  search_placeholder: "이름 또는 위치로 검색",
  all: "전체",
  time: "시간대",
  with: "동행",
  region: "지역",
  city: "도시",
  todays_picks: "오늘의 추천",
  todays_picks_sub: "서로 다른 카테고리에서 무작위로 3곳을 추천합니다.",
  top10: "Top 10",
  top10_sub: "평점 순, 동점이면 댓글 수 순으로 정렬됩니다.",
  no_places: "아직 등록된 맛집이 없습니다. 첫 맛집을 등록해보세요!",
  contact: "문의",
  write_a_post: "글쓰기",
  board_title: "게시판",
  board_preview_title: "게시판 소식",
  comments: "댓글",
  views: "조회",
  no_posts: "아직 게시글이 없습니다.",
};

const id: Dict = {
  board: "Papan",
  add_a_place: "Tambah tempat",
  sign_in_google: "Masuk dengan Google",
  sign_out: "Keluar",
  admin: "Admin",
  leaderboard: "Papan peringkat",
  search_placeholder: "Cari berdasarkan nama atau lokasi",
  all: "Semua",
  time: "Waktu",
  with: "Bersama",
  region: "Wilayah",
  city: "Kota",
  todays_picks: "Pilihan hari ini",
  todays_picks_sub: "Tiga pilihan acak dari tiga kategori berbeda.",
  top10: "10 Teratas",
  top10_sub: "Diurutkan berdasarkan rating, lalu jumlah komentar.",
  no_places: "Belum ada tempat. Jadilah yang pertama menambahkan!",
  contact: "Kontak",
  write_a_post: "Tulis postingan",
  board_title: "Papan",
  board_preview_title: "Dari papan",
  comments: "komentar",
  views: "dilihat",
  no_posts: "Belum ada postingan.",
};

export const DICTS: Record<Lang, Dict> = { en, ko, id };

export function translate(lang: Lang, key: string): string {
  return DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
}
