type UserCount = { label: string; count: number };

export default function VisitorDashboard({
  dailyCounts,
  userCounts,
  totalVisits,
}: {
  dailyCounts: [string, number][];
  userCounts: UserCount[];
  totalVisits: number;
}) {
  const maxDaily = Math.max(1, ...dailyCounts.map(([, c]) => c));

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <p className="text-xs text-brand-gray mb-1">Total home page visits</p>
        <p className="text-2xl font-medium">{totalVisits.toLocaleString()}</p>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Daily visits (last 30 days)</p>
        {dailyCounts.length === 0 ? (
          <p className="text-sm text-brand-gray">No visits recorded yet.</p>
        ) : (
          <div className="card p-4">
            <div className="flex items-end gap-1 h-32">
              {dailyCounts.map(([day, count]) => (
                <div
                  key={day}
                  className="flex-1 flex flex-col items-end justify-end h-full"
                  title={`${day}: ${count} visit${count === 1 ? "" : "s"}`}
                >
                  <div
                    className="w-full bg-brand-blue rounded-t"
                    style={{ height: `${Math.max(4, (count / maxDaily) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-1 mt-1">
              {dailyCounts.map(([day]) => (
                <div key={day} className="flex-1 text-center text-[9px] text-brand-gray truncate">
                  {day.slice(5)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Visits by user</p>
        <div className="card overflow-hidden">
          {userCounts.length === 0 ? (
            <p className="p-6 text-sm text-brand-gray text-center">No visits recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-bg text-brand-gray text-xs">
                  <th className="text-left p-3">User</th>
                  <th className="text-right p-3">Visits</th>
                </tr>
              </thead>
              <tbody>
                {userCounts.map((u) => (
                  <tr key={u.label} className="border-t border-brand-bg">
                    <td className="p-3">{u.label}</td>
                    <td className="p-3 text-right font-medium">{u.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
