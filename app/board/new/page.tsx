import BoardPostForm from "@/components/BoardPostForm";

export const dynamic = "force-dynamic";

export default function BoardNewPostPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-lg font-medium mb-4">Write a post</h1>
      <BoardPostForm defaultCategory={searchParams.category} />
    </div>
  );
}
