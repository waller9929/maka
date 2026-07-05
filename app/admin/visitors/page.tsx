import { createClient } from "@/lib/supabase/server";
import VisitorDashboard from "@/components/VisitorDashboard";

export const dynamic = "force-dynamic";

export default async function AdminVisitorsPage() {
  const supabase = createClient();

  const { data: logs } = await supabase
    .from("visit_logs")
    .select("id, user_id, visited_at, profiles(name, email)")
    .order("visited_at", { ascending: true });

  const rows = (logs ?? []) as any[];

  const dayMap = new Map<string, number>();
  for (const r of rows) {
    const day = new Date(r.visited_at).toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const dailyCounts = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30);

  const userMap = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    const key = r.user_id ?? "guest";
    const label = r.user_id ? (r.profiles?.name ?? r.profiles?.email ?? "Unknown") : "Guest";
    const existing = userMap.get(key);
    if (existing) existing.count += 1;
    else userMap.set(key, { label, count: 1 });
  }
  const userCounts = Array.from(userMap.values()).sort((a, b) => b.count - a.count);

  return (
    <div>
      <h1 className="text-lg font-medium mb-4">Visitors</h1>
      <VisitorDashboard dailyCounts={dailyCounts} userCounts={userCounts} totalVisits={rows.length} />
    </div>
  );
}
