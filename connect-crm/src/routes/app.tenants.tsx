import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Plus, Trash2, ShieldCheck, Search, CheckCircle2, AlertTriangle,
  Mail, MessageCircle, MessageSquare, Wallet, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import * as crm from "@/services/crmService";
import { DEFAULT_TOP_UP_INR, formatINR } from "@/lib/currency";

export const Route = createFileRoute("/app/tenants")({
  component: TenantsPage,
});

type Tenant = Awaited<ReturnType<typeof crm.listTenants>>[number];

function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);

  const refresh = () => crm.listTenants().then(setTenants);
  useEffect(() => { refresh(); }, []);

  if (!user) return null;
  if (user.role !== "super_admin") {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--shadow-sm)]">
        <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Super admin only</h2>
        <p className="text-sm text-muted-foreground">You do not have access to manage tenants.</p>
      </div>
    );
  }

  const filtered = useMemo(
    () => tenants.filter((t) => t.name.toLowerCase().includes(query.toLowerCase())),
    [tenants, query],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            All organizations on the platform. Add a tenant or configure their channels & billing.
          </p>
        </div>
        <NewTenantDialog open={open} setOpen={setOpen} onCreated={refresh} />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tenants..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
          <div className="ml-auto text-xs text-muted-foreground">{filtered.length} of {tenants.length}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Tenant</th>
                <th className="text-left p-3">Plan</th>
                <th className="text-left p-3">Industry</th>
                <th className="text-left p-3">Users</th>
                <th className="text-left p-3">Leads</th>
                <th className="text-left p-3">Campaigns</th>
                <th className="text-left p-3">Wallet</th>
                <th className="text-left p-3">Channels</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.id} · since {t.createdAt}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">{t.plan}</span></td>
                  <td className="p-3 text-muted-foreground">{t.industry || "—"}</td>
                  <td className="p-3">{t.userCount}</td>
                  <td className="p-3">{t.leadCount}</td>
                  <td className="p-3">{t.campaignCount}</td>
                  <td className="p-3">{formatINR(t.wallet)}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <ChannelDot ok={t.channels.email} icon={<Mail className="h-3 w-3" />} label="Email" />
                      <ChannelDot ok={t.channels.whatsapp} icon={<MessageCircle className="h-3 w-3" />} label="WhatsApp" />
                      <ChannelDot ok={t.channels.sms} icon={<MessageSquare className="h-3 w-3" />} label="SMS" />
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditing(t)} className="gap-1">
                      <Settings2 className="h-3.5 w-3.5" /> Manage
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="ml-1 text-destructive"
                      onClick={async () => {
                        if (!confirm(`Delete tenant ${t.name}? This removes all its data.`)) return;
                        await crm.deleteTenant(t.id);
                        toast.success("Tenant deleted");
                        refresh();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No tenants found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ManageTenantDialog tenant={editing} onClose={() => setEditing(null)} onSaved={refresh} />
    </div>
  );
}

function ChannelDot({ ok, icon, label }: { ok: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span
      title={`${label}: ${ok ? "configured" : "not configured"}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
        ok ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
      }`}
    >
      {icon}{label}
    </span>
  );
}

function NewTenantDialog({
  open, setOpen, onCreated,
}: { open: boolean; setOpen: (v: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", plan: "Starter", industry: "", country: "IN",
    adminName: "", adminEmail: "",
  });

  const submit = async () => {
    try {
      await crm.createTenant(form);
      toast.success("Tenant created");
      setOpen(false);
      setForm({ name: "", plan: "Starter", industry: "", country: "IN", adminName: "", adminEmail: "" });
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Tenant</Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle>New Tenant</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Organization name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Starter">Starter</SelectItem>
                    <SelectItem value="Growth">Growth</SelectItem>
                    <SelectItem value="Pro">Pro</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Industry</Label>
                <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div className="col-span-2 mt-2 border-t pt-3">
                <div className="text-xs uppercase text-muted-foreground mb-2">Initial admin (optional)</div>
              </div>
              <div>
                <Label>Admin name</Label>
                <Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
              </div>
              <div>
                <Label>Admin email</Label>
                <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
              </div>
            </div>
          </div>
          <SheetFooter className="mt-auto border-t px-6 py-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Create tenant</Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ManageTenantDialog({
  tenant, onClose, onSaved,
}: { tenant: Tenant | null; onClose: () => void; onSaved: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);
  const [topUp, setTopUp] = useState(DEFAULT_TOP_UP_INR);

  useEffect(() => {
    if (!tenant) { setProfile(null); setCfg(null); setBilling(null); return; }
    Promise.all([
      crm.getOrganization(tenant.id),
      crm.getChannelConfig(tenant.id),
      crm.getBilling(tenant.id, "org_admin"),
    ]).then(([p, c, b]) => { setProfile(p); setCfg(c); setBilling(b); });
  }, [tenant?.id]);

  if (!tenant) return null;

  const saveProfile = async () => {
    await crm.updateOrganization(tenant.id, profile);
    toast.success("Profile saved");
    onSaved();
  };

  const saveChannel = async (ch: "email" | "whatsapp" | "sms") => {
    await crm.updateChannelConfig(tenant.id, ch, cfg[ch]);
    toast.success(`${ch.toUpperCase()} config saved`);
  };

  const verify = async (ch: "email" | "whatsapp" | "sms") => {
    const updated = await crm.verifyChannel(tenant.id, ch);
    setCfg({ ...cfg, [ch]: updated });
    toast.success(`${ch} verified`);
    onSaved();
  };

  const doTopUp = async () => {
    const b = await crm.topUpWallet(tenant.id, topUp);
    setBilling(b);
    toast.success(`Added ${formatINR(topUp)}`);
    onSaved();
  };

  return (
    <Sheet open={!!tenant} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex h-full max-h-screen w-full flex-col gap-0 overflow-hidden p-0 lg:max-w-4xl">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> {tenant.name}
          </SheetTitle>
        </SheetHeader>

        {!profile || !cfg ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <Tabs defaultValue="profile">
                <TabsList className="flex flex-wrap h-auto">
                  <TabsTrigger value="profile" className="gap-1"><Building2 className="h-4 w-4" />Profile</TabsTrigger>
                  <TabsTrigger value="email" className="gap-1"><Mail className="h-4 w-4" />Email</TabsTrigger>
                  <TabsTrigger value="whatsapp" className="gap-1"><MessageCircle className="h-4 w-4" />WhatsApp</TabsTrigger>
                  <TabsTrigger value="sms" className="gap-1"><MessageSquare className="h-4 w-4" />SMS</TabsTrigger>
                  <TabsTrigger value="wallet" className="gap-1"><Wallet className="h-4 w-4" />Wallet</TabsTrigger>
                </TabsList>

                {/* Profile */}
                <TabsContent value="profile" className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    ["name", "Name"], ["plan", "Plan"], ["industry", "Industry"],
                    ["country", "Country"], ["timezone", "Timezone"], ["website", "Website"],
                    ["supportEmail", "Support email"], ["billingEmail", "Billing email"],
                    ["gstin", "GSTIN"],
                  ].map(([k, label]) => (
                    <div key={k}>
                      <Label>{label}</Label>
                      <Input value={profile[k] ?? ""} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })} />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Textarea value={profile.address ?? ""} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button onClick={saveProfile}>Save profile</Button>
                  </div>
                </TabsContent>

                {/* Email */}
                <TabsContent value="email" className="mt-4 space-y-3">
                  <VerifyBar ok={cfg.email.domainVerified} label="Domain & DKIM" onVerify={() => verify("email")} />
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["region", "AWS Region"], ["accessKeyId", "Access Key ID"],
                      ["secretAccessKey", "Secret Access Key"], ["fromName", "From Name"],
                      ["fromEmail", "From Email"], ["replyTo", "Reply-To"],
                      ["domain", "Sending Domain"], ["configurationSet", "Configuration Set"],
                    ].map(([k, label]) => (
                      <div key={k}>
                        <Label>{label}</Label>
                        <Input value={cfg.email[k] ?? ""} onChange={(e) => setCfg({ ...cfg, email: { ...cfg.email, [k]: e.target.value } })} />
                      </div>
                    ))}
                    <div>
                      <Label>Daily quota</Label>
                      <Input type="number" value={cfg.email.dailyQuota} onChange={(e) => setCfg({ ...cfg, email: { ...cfg.email, dailyQuota: +e.target.value } })} />
                    </div>
                    <div>
                      <Label>Send rate (msg/s)</Label>
                      <Input type="number" value={cfg.email.sendRate} onChange={(e) => setCfg({ ...cfg, email: { ...cfg.email, sendRate: +e.target.value } })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={!cfg.email.sandboxMode} onCheckedChange={(v) => setCfg({ ...cfg, email: { ...cfg.email, sandboxMode: !v } })} />
                    <span className="text-sm">Production mode (out of SES sandbox)</span>
                  </div>
                  <div className="flex justify-end"><Button onClick={() => saveChannel("email")}>Save Email</Button></div>
                </TabsContent>

                {/* WhatsApp */}
                <TabsContent value="whatsapp" className="mt-4 space-y-3">
                  <VerifyBar ok={cfg.whatsapp.verified} label="WABA verification" onVerify={() => verify("whatsapp")} />
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["wabaId", "WABA ID"], ["phoneNumberId", "Phone Number ID"],
                      ["displayPhoneNumber", "Display Phone"], ["businessName", "Business Name"],
                      ["accessToken", "Access Token"], ["verifyToken", "Verify Token"],
                      ["webhookUrl", "Webhook URL"], ["messagingLimit", "Messaging Limit"],
                    ].map(([k, label]) => (
                      <div key={k}>
                        <Label>{label}</Label>
                        <Input value={cfg.whatsapp[k] ?? ""} onChange={(e) => setCfg({ ...cfg, whatsapp: { ...cfg.whatsapp, [k]: e.target.value } })} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end"><Button onClick={() => saveChannel("whatsapp")}>Save WhatsApp</Button></div>
                </TabsContent>

                {/* SMS */}
                <TabsContent value="sms" className="mt-4 space-y-3">
                  <VerifyBar ok={cfg.sms.dltEnabled} label="DLT registration" onVerify={() => verify("sms")} />
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["provider", "Provider"], ["country", "Country"],
                      ["principalEntityId", "Principal Entity ID (PE ID)"],
                      ["senderId", "Sender ID / Header"], ["senderIdType", "Sender ID Type"],
                      ["apiKey", "API Key"], ["route", "Route"],
                    ].map(([k, label]) => (
                      <div key={k}>
                        <Label>{label}</Label>
                        <Input value={cfg.sms[k] ?? ""} onChange={(e) => setCfg({ ...cfg, sms: { ...cfg.sms, [k]: e.target.value } })} />
                      </div>
                    ))}
                    <div>
                      <Label>TPS limit</Label>
                      <Input type="number" value={cfg.sms.tps} onChange={(e) => setCfg({ ...cfg, sms: { ...cfg.sms, tps: +e.target.value } })} />
                    </div>
                  </div>
                  <div className="flex justify-end"><Button onClick={() => saveChannel("sms")}>Save SMS</Button></div>
                </TabsContent>

                {/* Wallet */}
                <TabsContent value="wallet" className="mt-4 space-y-3">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <div className="text-xs text-muted-foreground">Current balance</div>
                    <div className="text-2xl font-bold">{formatINR(billing?.wallet ?? 0)}</div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label>Top-up amount (INR)</Label>
                      <Input type="number" value={topUp} onChange={(e) => setTopUp(+e.target.value)} />
                    </div>
                    <Button onClick={doTopUp}>Add credit</Button>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-1">Recent transactions</div>
                    <div className="rounded-lg border divide-y">
                      {(billing?.transactions ?? []).slice(0, 6).map((tx: any) => (
                        <div key={tx.id} className="flex justify-between p-2 text-sm">
                          <span>{tx.date} · {tx.desc}</span>
                          <span className={tx.type === "credit" ? "text-emerald-600" : "text-destructive"}>
                            {tx.type === "credit" ? "+" : "-"}{formatINR(Math.abs(tx.amount))}
                          </span>
                        </div>
                      ))}
                      {(!billing?.transactions || billing.transactions.length === 0) && (
                        <div className="p-3 text-sm text-muted-foreground text-center">No transactions yet.</div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <SheetFooter className="mt-auto flex-shrink-0 border-t px-6 py-4">
              <Button variant="ghost" onClick={onClose}>Close</Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function VerifyBar({ ok, label, onVerify }: { ok: boolean; label: string; onVerify: () => void }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border p-3 ${ok ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
      <div className="flex items-center gap-2 text-sm">
        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
        <span>{label}: {ok ? "Verified" : "Not verified"}</span>
      </div>
      {!ok && <Button size="sm" variant="outline" onClick={onVerify}>Verify now</Button>}
    </div>
  );
}
