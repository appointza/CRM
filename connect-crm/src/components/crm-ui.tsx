import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, icon, accent = "primary", hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: "primary" | "sms" | "whatsapp" | "email" | "success";
  hint?: string;
}) {
  const accentMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    sms: "bg-[var(--sms)]/10 text-[var(--sms)]",
    whatsapp: "bg-[var(--whatsapp)]/10 text-[var(--whatsapp)]",
    email: "bg-[var(--email)]/10 text-[var(--email)]",
    success: "bg-[var(--success)]/10 text-[var(--success)]",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
          {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
        </div>
        {icon && (
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", accentMap[accent])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChannelBadge({ channel }: { channel: string }) {
  const map: Record<string, string> = {
    sms: "bg-[var(--sms)]/10 text-[var(--sms)] border-[var(--sms)]/20",
    whatsapp: "bg-[var(--whatsapp)]/10 text-[var(--whatsapp)] border-[var(--whatsapp)]/20",
    email: "bg-[var(--email)]/10 text-[var(--email)] border-[var(--email)]/20",
  };
  return (
    <span className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border capitalize", map[channel] ?? "bg-muted text-foreground")}>
      {channel}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    sent: "bg-[var(--success)]/10 text-[var(--success)]",
    scheduled: "bg-[var(--warning)]/15 text-[oklch(0.5_0.15_75)]",
    draft: "bg-muted text-muted-foreground",
    failed: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={cn("inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full capitalize", map[status] ?? "bg-muted")}>
      {status}
    </span>
  );
}

export function MiniBarChart({ data, color = "var(--primary)" }: { data: number[]; color?: string }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md transition-all"
          style={{
            height: `${(v / max) * 100}%`,
            background: `linear-gradient(180deg, ${color}, color-mix(in oklab, ${color} 50%, transparent))`,
          }}
          title={String(v)}
        />
      ))}
    </div>
  );
}

export function Progress({ value, max = 100, color = "var(--primary)" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
