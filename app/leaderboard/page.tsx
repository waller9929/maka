import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const { data } = await supabase
    .from("leaderboard")
    .select("*")
    .order("points", { ascending: false })
    .limit(50);

  const rows = data ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-lg font-medium mb-4">Contributor leaderboard</h1>
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-brand-gray text-center">No activity yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-bg text-brand-gray text-xs">
                <th className="text-left p-3 w-10">Rank</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Level</th>
                <th className="text-right p-3">Places</th>
                <th className="text-right p-3">Comments</th>
                <th className="text-right p-3">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={r.id} className="border-t border-brand-bg">
                  <td className="p-3 font-medium">{i + 1}</td>
                  <td className="p-3">{r.name ?? r.email}</td>
                  <td className="p-3">
                    <span className="tag bg-brand-blueLight text-brand-blueDark">{r.level}</span>
                  </td>
                  <td className="p-3 text-right">{r.place_count}</td>
                  <td className="p-3 text-right">{r.comment_count}</td>
                  <td className="p-3 text-right font-medium">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
