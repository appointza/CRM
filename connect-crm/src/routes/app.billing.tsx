import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getBilling, topUpWallet } from "@/services/crmService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChannelBadge } from "@/components/crm-ui";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  MessageCircle,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TOP_UP_INR,
  TOP_UP_PRESETS_INR,
  formatINR,
  formatINRPreset,
} from "@/lib/currency";

export const Route = createFileRoute("/app/billing")({
  component: BillingPage,
});

const TOP_UP_PRESETS = [...TOP_UP_PRESETS_INR];

const CHANNEL_META = [
  { key: "sms", label: "SMS", icon: MessageSquare, color: "var(--sms)" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "var(--whatsapp)" },
  { key: "email", label: "Email", icon: Mail, color: "var(--email)" },
] as const;

function BillingPage() {
  const { user, organization } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(DEFAULT_TOP_UP_INR);
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [txFilter, setTxFilter] = useState<"all" | "credit" | "debit">("all");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const bill = await getBilling(organization?.id ?? null, user.role);
      setData(bill);
    } catch (e: any) {
      toast.error(e?.message || "Could not load billing");
    } finally {
      setLoading(false);
    }
  }, [user, organization]);

  useEffect(() => {
    load();
  }, [load]);

  const rates = data?.rates ?? { sms: 0.35, whatsapp: 0.8, email: 0.15 };
  const lowThreshold = data?.lowBalanceThreshold ?? 500;
  const balance = data?.wallet ?? 0;
  const isLowBalance = balance < lowThreshold;

  const totalMessages = useMemo(() => {
    const u = data?.usage ?? {};
    return (u.sms ?? 0) + (u.whatsapp ?? 0) + (u.email ?? 0);
  }, [data]);

  const filteredTx = useMemo(() => {
    const list = data?.transactions ?? [];
    if (txFilter === "all") return list;
    return list.filter((t: any) => t.type === txFilter);
  }, [data, txFilter]);

  const submitTopUp = async () => {
    if (!organization?.id) {
      toast.error("Select an organization");
      return;
    }
    if (topUpAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setTopUpBusy(true);
    try {
      const next = await topUpWallet(organization.id, topUpAmount);
      setData(next);
      setTopUpOpen(false);
      toast.success(`Added ${formatINR(topUpAmount)} to wallet`);
    } catch (e: any) {
      toast.error(e?.message || "Top-up failed");
    } finally {
      setTopUpBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Billing & Wallet</h1>
          <p className="text-sm text-muted-foreground">
            Prepaid wallet for SMS, WhatsApp, and email. Messages are charged per send.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {isLowBalance && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">Low wallet balance</p>
            <p className="text-muted-foreground mt-0.5">
              Balance is below {formatINR(lowThreshold)}. Top up to keep campaigns and messages sending.
            </p>
          </div>
          <Button size="sm" className="ml-auto shrink-0" onClick={() => setTopUpOpen(true)}>
            Top up
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className="rounded-2xl p-6 text-primary-foreground shadow-[var(--shadow-lg)] lg:row-span-2"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="flex items-center gap-2 text-sm opacity-90">
            <Wallet className="h-4 w-4" />
            Wallet balance
          </div>
          <div className="text-4xl font-bold mt-2">
            {loading ? "—" : formatINR(balance)}
          </div>
          <p className="text-sm opacity-80 mt-2">
            {totalMessages} message{totalMessages === 1 ? "" : "s"} sent this month
          </p>
          <Button
            variant="secondary"
            className="mt-5"
            onClick={() => setTopUpOpen(true)}
            disabled={!organization?.id}
          >
            <Plus className="h-4 w-4 mr-1" />
            Top up wallet
          </Button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CHANNEL_META.map((c) => {
              const Icon = c.icon;
              const count = data?.usage?.[c.key] ?? 0;
              const rate = rates[c.key] ?? 0;
              return (
                <div
                  key={c.key}
                  className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase text-muted-foreground">{c.label}</div>
                    <Icon className="h-4 w-4" style={{ color: c.color }} />
                  </div>
                  <div className="text-2xl font-bold mt-2" style={{ color: c.color }}>
                    {loading ? "—" : count}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">this month</div>
                  <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border">
                    {formatINR(rate)} / message
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)]">
            <div className="font-semibold text-sm mb-3">Message rates</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {CHANNEL_META.map((c) => (
                <div key={c.key} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <ChannelBadge channel={c.key} />
                  <span className="font-medium">{formatINR(rates[c.key] ?? 0)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Charges apply when a message is successfully sent. Failed sends are not billed.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
        <div className="p-5 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="font-semibold">Transaction history</div>
          <div className="flex gap-2">
            {(["all", "credit", "debit"] as const).map((f) => (
              <Button
                key={f}
                type="button"
                size="sm"
                variant={txFilter === f ? "default" : "outline"}
                onClick={() => setTxFilter(f)}
              >
                {f === "all" ? "All" : f === "credit" ? "Top-ups" : "Usage"}
              </Button>
            ))}
          </div>
        </div>
        <div className="divide-y">
          {loading && (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading transactions…</div>
          )}
          {!loading &&
            filteredTx.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                      t.type === "credit"
                        ? "bg-[var(--success)]/10 text-[var(--success)]"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {t.type === "credit" ? (
                      <ArrowDownRight className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.desc}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{t.date}</span>
                      {t.channel && <ChannelBadge channel={t.channel} />}
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    "font-semibold shrink-0",
                    t.type === "credit" ? "text-[var(--success)]" : "text-foreground",
                  )}
                >
                  {t.amount > 0 ? "+" : ""}
                  {formatINR(Math.abs(t.amount))}
                </div>
              </div>
            ))}
          {!loading && filteredTx.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {txFilter === "all"
                ? "No transactions yet. Top up your wallet to get started."
                : `No ${txFilter === "credit" ? "top-ups" : "usage charges"} yet.`}
            </div>
          )}
        </div>
      </div>

      <Sheet open={topUpOpen} onOpenChange={setTopUpOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Top up wallet</SheetTitle>
            <SheetDescription>
              Add prepaid credit. Current balance: {formatINR(balance)}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label>Amount (INR)</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TOP_UP_PRESETS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={topUpAmount === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTopUpAmount(p)}
                >
                  {formatINRPreset(p)}
                </Button>
              ))}
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setTopUpOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitTopUp} disabled={topUpBusy}>
              {topUpBusy ? "Adding…" : `Add ${formatINR(topUpAmount)}`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
