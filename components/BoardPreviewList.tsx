import Link from "next/link";
import { BOARD_CATEGORY_LABELS } from "@/lib/board";
import T from "@/components/T";

export type BoardPreviewPost = {
  id: string;
  category: string;
  title: string;
};

export default function BoardPreviewList({ posts }: { posts: BoardPreviewPost[] }) {
  if (posts.length === 0) {
    return (
      <p className="text-sm text-brand-gray">
        <T k="no_posts" />
      </p>
    );
  }

  return (
    <div className="card overflow-hidden">
      {posts.map((p) => (
        <Link
          key={p.id}
          href={`/board/${p.id}`}
          className="flex items-center gap-2 px-3 py-2 border-b border-brand-bg last:border-b-0 hover:bg-brand-bg transition-colors"
        >
          <span className="tag bg-brand-bg text-brand-gray flex-shrink-0">
            {BOARD_CATEGORY_LABELS[p.category] ?? p.category}
          </span>
          <span className="text-sm flex-1 truncate">{p.title}</span>
        </Link>
      ))}
    </div>
  );
}
