import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BOARD_CATEGORIES, BOARD_CATEGORY_LABELS } from "@/lib/board";
import T from "@/components/T";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const supabase = createClient();

  let query = supabase
    .from("board_posts")
    .select("id, category, title, source_name, pinned, view_count, created_at, created_by, guest_name, profiles(name), board_comments(count)")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (searchParams.category) query = query.eq("category", searchParams.category);

  const { data } = await query;
  const posts = (data ?? []) as any[];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-medium">
          <T k="board_title" />
        </h1>
        <Link href="/board/new" className="btn-primary px-4 py-2 text-sm">
          <T k="write_a_post" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <Link
          href="/board"
          className={`tag border ${!searchParams.category ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}
        >
          <T k="all" />
        </Link>
        {BOARD_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/board?category=${c}`}
            className={`tag border ${searchParams.category === c ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}
          >
            {BOARD_CATEGORY_LABELS[c]}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="card p-10 text-center text-brand-gray text-sm">
          <T k="no_posts" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/board/${p.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-brand-bg last:border-b-0 hover:bg-brand-bg transition-colors"
            >
              {p.pinned && <span className="tag bg-amber-100 text-amber-800 flex-shrink-0">Pinned</span>}
              <span className="tag bg-brand-bg text-brand-gray flex-shrink-0">{BOARD_CATEGORY_LABELS[p.category] ?? p.category}</span>
              <span className="text-sm flex-1 truncate">{p.title}</span>
              <span className="text-xs text-brand-gray flex-shrink-0">
                {p.profiles?.name ?? p.guest_name ?? p.source_name ?? "Anonymous"} · {p.board_comments?.[0]?.count ?? 0}{" "}
                <T k="comments" /> · {p.view_count ?? 0} <T k="views" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
