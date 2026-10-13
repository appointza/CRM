import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getReports } from "@/services/crmService";
import { ChannelBadge, StatusPill, Progress } from "@/components/crm-ui";

export const Route = createFileRoute("/app/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { user, organization } = useAuth();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => { if (user) getReports(organization?.id ?? null, user.role).then(setRows); }, [user, organization]);
  if (!user) return null;

  const totals = rows.reduce((a, r) => ({ sent: a.sent + r.sent, delivered: a.delivered + r.delivered, failed: a.failed + r.failed }), { sent: 0, delivered: 0, failed: 0 });
  const deliveryRate = totals.sent ? Math.round((totals.delivered / totals.sent) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Campaign performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
          <div className="text-xs uppercase text-muted-foreground">Total Sent</div>
          <div className="text-3xl font-bold mt-2">{totals.sent}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
          <div className="text-xs uppercase text-muted-foreground">Delivery Rate</div>
          <div className="text-3xl font-bold mt-2 text-[var(--success)]">{deliveryRate}%</div>
          <div className="mt-3"><Progress value={deliveryRate} color="var(--success)" /></div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
          <div className="text-xs uppercase text-muted-foreground">Failed</div>
          <div className="text-3xl font-bold mt-2 text-destructive">{totals.failed}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Delivered</th>
                <th className="px-4 py-3">Failed</th>
                <th className="px-4 py-3 w-48">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rate = r.sent ? Math.round((r.delivered / r.sent) * 100) : 0;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3"><ChannelBadge channel={r.channel} /></td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3">{r.sent}</td>
                    <td className="px-4 py-3 text-[var(--success)]">{r.delivered}</td>
                    <td className="px-4 py-3 text-destructive">{r.failed}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Progress value={rate} /><span className="text-xs text-muted-foreground w-10">{rate}%</span></div></td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">No data yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
