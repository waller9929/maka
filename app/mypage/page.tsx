import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLevel, getNextLevelInfo } from "@/lib/level";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: myPlaces } = await supabase
    .from("places")
    .select("id, name, category, rating, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  const points = profile?.points ?? 0;
  const level = getLevel(points);
  const next = getNextLevelInfo(points);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="card p-5">
        <p className="text-sm text-brand-gray">{profile?.email}</p>
        <h1 className="text-xl font-medium mt-1">{profile?.name ?? "이름 없음"}</h1>
        <div className="flex items-center gap-2 mt-3">
          <span className="tag bg-brand-blue text-white text-sm">{level}</span>
          <span className="text-sm text-brand-gray">{points}점</span>
        </div>
        {next && (
          <p className="text-xs text-brand-gray mt-2">
            다음 레벨 {next.name}까지 {next.pointsNeeded}점 남았어요.
          </p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium mb-3">내가 등록한 맛집 ({myPlaces?.length ?? 0})</h2>
        {!myPlaces || myPlaces.length === 0 ? (
          <p className="text-sm text-brand-gray">아직 등록한 맛집이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {myPlaces.map((p) => (
              <li key={p.id}>
                <Link href={`/places/${p.id}`} className="text-sm text-brand-blue hover:underline">
                  {p.name}
                </Link>
                <span className="text-xs text-brand-gray ml-2">{p.category} · ★{p.rating}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
