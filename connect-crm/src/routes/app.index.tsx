import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getDashboardStats } from "@/services/crmService";
import { StatCard, ChannelBadge, StatusPill, MiniBarChart } from "@/components/crm-ui";
import { Users2, Megaphone, Send, MessageSquare } from "lucide-react";
import { SalesQuickNav } from "@/components/SalesQuickNav";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, organization } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    getDashboardStats(organization?.id ?? null, user.role).then(setStats);
  }, [user, organization]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <SalesQuickNav active="dashboard" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">
          {user.role === "super_admin" ? "Platform overview across all organizations." : `${organization?.name} • ${organization?.plan ?? "Free"} plan`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={stats?.totalLeads ?? "—"} icon={<Users2 className="h-5 w-5" />} accent="primary" hint="Active contacts" />
        <StatCard label="Campaigns" value={stats?.totalCampaigns ?? "—"} icon={<Megaphone className="h-5 w-5" />} accent="primary" hint="Lifetime" />
        <StatCard label="Messages Sent" value={stats?.totalMessages ?? "—"} icon={<Send className="h-5 w-5" />} accent="success" hint="All channels" />
        <StatCard label="Channels Active" value={3} icon={<MessageSquare className="h-5 w-5" />} accent="sms" hint="SMS, WhatsApp, Email" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Messages (last 7 days)</h3>
              <p className="text-xs text-muted-foreground">Aggregated across all channels</p>
            </div>
          </div>
          <MiniBarChart data={stats?.trend ?? [0,0,0,0,0,0,0]} />
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
            <div>
              <div className="text-xs text-muted-foreground">SMS</div>
              <div className="text-lg font-semibold text-[var(--sms)]">{stats?.channels?.sms ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">WhatsApp</div>
              <div className="text-lg font-semibold text-[var(--whatsapp)]">{stats?.channels?.whatsapp ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="text-lg font-semibold text-[var(--email)]">{stats?.channels?.email ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-sm)]">
          <h3 className="font-semibold mb-4">Recent Campaigns</h3>
          <div className="space-y-3">
            {(stats?.recent ?? []).length === 0 && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
            {(stats?.recent ?? []).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <ChannelBadge channel={c.channel} />
                    <StatusPill status={c.status} />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{c.sent} sent</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
