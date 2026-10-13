import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Building2, Mail, MessageCircle, MessageSquare, Wallet, KeyRound,
  CheckCircle2, AlertTriangle, Copy, Plus, Trash2, Webhook,
  Tags, Pencil, User, LogOut, Facebook, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/config/apiConfig";
import * as crm from "@/services/crmService";
import { REFERENCE_VALUE_CATEGORIES, referenceCategoryLabel } from "@/constants/referenceValueCategories";
import { DEFAULT_TOP_UP_INR, TOP_UP_PRESETS_INR, formatINR, formatINRPreset } from "@/lib/currency";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, organization, setSession, logout } = useAuth();
  const navigate = useNavigate();
  const orgId = organization?.id ?? "";

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  if (user.role === "staff") {
    return (
      <div className="space-y-6">
        <ProfileSection user={user} organization={organization} onLogout={handleLogout} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="flex flex-wrap h-auto bg-muted p-1 gap-1">
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="organization" className="gap-2"><Building2 className="h-4 w-4" />Organization</TabsTrigger>
          <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" />Email (SES)</TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2"><MessageCircle className="h-4 w-4" />WhatsApp</TabsTrigger>
          <TabsTrigger value="facebook" className="gap-2"><Facebook className="h-4 w-4" />Facebook</TabsTrigger>
          <TabsTrigger value="sms" className="gap-2"><MessageSquare className="h-4 w-4" />SMS (DLT)</TabsTrigger>
          <TabsTrigger value="wallet" className="gap-2"><Wallet className="h-4 w-4" />Wallet</TabsTrigger>
          <TabsTrigger value="reference" className="gap-2"><Tags className="h-4 w-4" />Reference values</TabsTrigger>
          <TabsTrigger value="googlemaps" className="gap-2"><MapPin className="h-4 w-4" />Google Maps</TabsTrigger>
          <TabsTrigger value="api" className="gap-2"><KeyRound className="h-4 w-4" />API & Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSection user={user} organization={organization} onLogout={handleLogout} />
        </TabsContent>
        <TabsContent value="organization" className="mt-6">
          <OrganizationSection orgId={orgId} onSaved={(o) => setSession(user, { ...organization!, ...o })} />
        </TabsContent>
        <TabsContent value="email" className="mt-6"><EmailSection orgId={orgId} /></TabsContent>
        <TabsContent value="whatsapp" className="mt-6"><WhatsAppSection orgId={orgId} /></TabsContent>
        <TabsContent value="facebook" className="mt-6"><FacebookSection orgId={orgId} /></TabsContent>
        <TabsContent value="sms" className="mt-6"><SmsSection orgId={orgId} /></TabsContent>
        <TabsContent value="wallet" className="mt-6"><WalletSection orgId={orgId} role={user.role} /></TabsContent>
        <TabsContent value="reference" className="mt-6"><ReferenceValuesSection orgId={orgId} /></TabsContent>
        <TabsContent value="googlemaps" className="mt-6"><GoogleMapsSection orgId={orgId} /></TabsContent>
        <TabsContent value="api" className="mt-6"><ApiSection orgId={orgId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileSection({
  user,
  organization,
  onLogout,
}: {
  user: { name: string; email: string; role: string };
  organization: { name?: string } | null;
  onLogout: () => void;
}) {
  return (
    <Section
      icon={<User className="h-5 w-5" />}
      title="Profile"
      subtitle="Your account details"
      footer={
        <Button variant="destructive" onClick={onLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      }
    >
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-semibold text-primary-foreground shrink-0"
          style={{ background: "var(--gradient-primary)" }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">{user.name}</div>
          <div className="text-sm text-muted-foreground truncate">{user.email}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Role</div>
          <div className="text-sm font-medium mt-1 capitalize">{user.role.replace(/_/g, " ")}</div>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Organization</div>
          <div className="text-sm font-medium mt-1 truncate">{organization?.name ?? "—"}</div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- Reusable section card ---------- */
function Section({ icon, title, subtitle, children, footer }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-3 p-6 border-b border-border">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
      {footer && <div className="p-6 pt-0 flex justify-end gap-2">{footer}</div>}
    </div>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
      ok ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-destructive/10 text-destructive"
    }`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

type ChannelSlice = "email" | "whatsapp" | "facebook" | "sms";

function ChannelSettingsLoadState({
  orgId,
  loading,
  error,
  onRetry,
}: {
  orgId: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (!orgId) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">No organization linked to your session</p>
        <p>
          Register a new workspace, or log out and sign in again. If you reset the database, old saved sessions
          point to organizations that no longer exist.
        </p>
      </div>
    );
  }
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm space-y-3">
        <p className="font-medium text-destructive">Could not load settings</p>
        <p className="text-muted-foreground">{error}</p>
        <p className="text-xs text-muted-foreground">
          Ensure the API is running at {getApiBaseUrl() || "your VITE_API_BASE_URL"}, then log out and log in again.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  return null;
}

function useChannelSettings(orgId: string, slice: ChannelSlice) {
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(!!orgId);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!orgId) {
      setCfg(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    crm
      .getChannelConfig(orgId)
      .then((c) => setCfg(c[slice]))
      .catch((e: unknown) => {
        setCfg(null);
        setError(e instanceof Error ? e.message : "Could not load channel settings");
      })
      .finally(() => setLoading(false));
  }, [orgId, slice]);

  useEffect(() => {
    load();
  }, [load]);

  return { cfg, setCfg, loading, error, load };
}

/* ---------- Organization ---------- */
function OrganizationSection({ orgId, onSaved }: { orgId: string; onSaved: (o: any) => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { if (orgId) crm.getOrganization(orgId).then(setData); }, [orgId]);
  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const change = (k: string) => (e: any) => setData({ ...data, [k]: e.target?.value ?? e });
  const save = async () => {
    const o = await crm.updateOrganization(orgId, data);
    onSaved(o);
    toast.success("Organization updated");
  };

  return (
    <Section
      icon={<Building2 className="h-5 w-5" />}
      title="Organization profile"
      subtitle="Public details used in invoices, sender names and webhook notifications."
      footer={<Button onClick={save}>Save changes</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Organization name"><Input value={data.name ?? ""} onChange={change("name")} /></Field>
        <Field label="Plan">
          <Select value={data.plan ?? "Starter"} onValueChange={(v) => setData({ ...data, plan: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Starter", "Growth", "Pro", "Enterprise"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Industry"><Input value={data.industry ?? ""} onChange={change("industry")} /></Field>
        <Field label="Website"><Input value={data.website ?? ""} onChange={change("website")} /></Field>
        <Field label="Support email"><Input type="email" value={data.supportEmail ?? ""} onChange={change("supportEmail")} /></Field>
        <Field label="Billing email"><Input type="email" value={data.billingEmail ?? ""} onChange={change("billingEmail")} /></Field>
        <Field label="Country">
          <Select value={data.country ?? "IN"} onValueChange={(v) => setData({ ...data, country: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["IN", "US", "GB", "AE", "SG", "AU"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Timezone"><Input value={data.timezone ?? ""} onChange={change("timezone")} /></Field>
        <Field label="GSTIN (India)"><Input value={data.gstin ?? ""} onChange={change("gstin")} placeholder="29ABCDE1234F1Z5" /></Field>
        <Field label="Address" wide><Textarea rows={2} value={data.address ?? ""} onChange={change("address")} /></Field>
      </div>
    </Section>
  );
}

/* ---------- Google Maps ---------- */
function GoogleMapsSection({ orgId }: { orgId: string }) {
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    crm.getChannelConfig(orgId)
      .then((cfg) => setGoogleApiKey(cfg.googleApiKey ?? ""))
      .catch((e) => setError(e?.message ?? "Could not load settings"))
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }
  if (error) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-destructive">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={load}>Retry</Button>
      </div>
    );
  }

  const save = async () => {
    const saved = await crm.updateChannelConfig(orgId, "google", { googleApiKey: googleApiKey.trim() });
    setGoogleApiKey(saved.googleApiKey ?? googleApiKey.trim());
    toast.success("Google API key saved");
  };

  return (
    <Section
      icon={<MapPin className="h-5 w-5" />}
      title="Google Maps & Places"
      subtitle="API key for Sales map view and business search. Enable Places API, Geocoding API, and Maps Embed API in Google Cloud."
      footer={<Button onClick={save}>Save API key</Button>}
    >
      <div className="grid grid-cols-1 gap-4 max-w-xl">
        <Field label="Google API key">
          <Input
            type="password"
            autoComplete="off"
            value={googleApiKey}
            onChange={(e) => setGoogleApiKey(e.target.value)}
            placeholder="AIza…"
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Stored in your organization database (<code className="text-xs">channel_configurations.google_api_key</code>), not in server .env.
        </p>
      </div>
    </Section>
  );
}

/* ---------- Email / SES ---------- */
function EmailSection({ orgId }: { orgId: string }) {
  const { cfg, setCfg, loading, error, load } = useChannelSettings(orgId, "email");
  const gate = (
    <ChannelSettingsLoadState orgId={orgId} loading={loading} error={error} onRetry={load} />
  );
  if (!cfg) return gate;

  const set = (k: string, v: any) => setCfg({ ...cfg, [k]: v });
  const save = async () => {
    const saved = await crm.updateChannelConfig(orgId, "email", cfg);
    setCfg(saved);
    toast.success("Email (SES) settings saved");
  };
  const verify = async () => {
    await crm.updateChannelConfig(orgId, "email", cfg);
    const next = await crm.verifyChannel(orgId, "email");
    setCfg(next);
    toast.success("Email settings saved and domain marked verified");
  };

  return (
    <Section
      icon={<Mail className="h-5 w-5" style={{ color: "var(--email)" }} />}
      title="Email — Amazon SES"
      subtitle="Configure SES region, sender identity, DKIM/SPF/DMARC and sending limits."
      footer={
        <>
          <Button variant="outline" onClick={verify}>Verify domain</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        <StatusChip ok={cfg.domainVerified} label={`Domain ${cfg.domainVerified ? "verified" : "unverified"}`} />
        <StatusChip ok={cfg.dkimVerified} label={`DKIM ${cfg.dkimVerified ? "OK" : "missing"}`} />
        <StatusChip ok={cfg.spfVerified} label={`SPF ${cfg.spfVerified ? "OK" : "missing"}`} />
        <StatusChip ok={!cfg.sandboxMode} label={cfg.sandboxMode ? "Sandbox mode" : "Production access"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="AWS Region">
          <Select value={cfg.region} onValueChange={(v) => set("region", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["us-east-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-south-1", "ap-southeast-1"].map((r) =>
                <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Configuration set"><Input value={cfg.configurationSet} onChange={(e) => set("configurationSet", e.target.value)} /></Field>
        <Field label="AWS Access Key ID"><Input value={cfg.accessKeyId} onChange={(e) => set("accessKeyId", e.target.value)} placeholder="AKIA…" /></Field>
        <Field label="AWS Secret Access Key"><Input type="password" value={cfg.secretAccessKey} onChange={(e) => set("secretAccessKey", e.target.value)} /></Field>
        <Field label="From name"><Input value={cfg.fromName} onChange={(e) => set("fromName", e.target.value)} /></Field>
        <Field label="From email"><Input type="email" value={cfg.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} placeholder="hello@yourdomain.com" /></Field>
        <Field label="Reply-To"><Input value={cfg.replyTo} onChange={(e) => set("replyTo", e.target.value)} /></Field>
        <Field label="Sending domain"><Input value={cfg.domain} onChange={(e) => set("domain", e.target.value)} /></Field>
        <Field label="DMARC policy">
          <Select value={cfg.dmarcPolicy} onValueChange={(v) => set("dmarcPolicy", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["none", "quarantine", "reject"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Daily quota"><Input type="number" value={cfg.dailyQuota} onChange={(e) => set("dailyQuota", Number(e.target.value))} /></Field>
        <Field label="Send rate (msg/sec)"><Input type="number" value={cfg.sendRate} onChange={(e) => set("sendRate", Number(e.target.value))} /></Field>
        <Field label="Sandbox mode">
          <div className="flex items-center gap-2 h-10">
            <Switch checked={cfg.sandboxMode} onCheckedChange={(v) => set("sandboxMode", v)} />
            <span className="text-sm text-muted-foreground">Only verified recipients can receive</span>
          </div>
        </Field>
      </div>
    </Section>
  );
}

/* ---------- WhatsApp Business API ---------- */
function WhatsAppSection({ orgId }: { orgId: string }) {
  const { cfg, setCfg, loading, error, load } = useChannelSettings(orgId, "whatsapp");
  const gate = (
    <ChannelSettingsLoadState orgId={orgId} loading={loading} error={error} onRetry={load} />
  );
  if (!cfg) return gate;

  const set = (k: string, v: any) => setCfg({ ...cfg, [k]: v });
  const save = async () => {
    const saved = await crm.updateChannelConfig(orgId, "whatsapp", cfg);
    setCfg(saved);
    if (saved.registrationError) {
      toast.error(`Saved, but phone registration failed: ${saved.registrationError}`);
    } else {
      toast.success("WhatsApp connected and WABA subscription updated");
    }
  };
  const verify = async () => {
    await crm.updateChannelConfig(orgId, "whatsapp", cfg);
    const next = await crm.verifyChannel(orgId, "whatsapp");
    setCfg(next);
    toast.success("Meta credentials and WABA subscription verified");
  };

  return (
    <Section
      icon={<MessageCircle className="h-5 w-5" style={{ color: "var(--whatsapp)" }} />}
      title="WhatsApp Business API"
      subtitle="Connect and register your Meta number for inbound and outbound messages. Save validates Meta credentials and subscribes the WABA."
      footer={<><Button variant="outline" onClick={verify}>Verify number</Button><Button onClick={save}>Save</Button></>}
    >
      <div className="flex flex-wrap gap-2">
        <StatusChip ok={cfg.verified} label={cfg.verified ? "Number verified" : "Not verified"} />
        <StatusChip
          ok={cfg.wabaSubscribed}
          label={cfg.wabaSubscribed ? "WABA subscribed" : "WABA not subscribed"}
        />
        <StatusChip
          ok={cfg.phoneRegistered}
          label={cfg.phoneRegistered ? "Inbound registered" : "Registration not confirmed"}
        />
        {cfg.metaPhoneStatus ? (
          <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-muted">
            Meta status: {String(cfg.metaPhoneStatus)}
          </span>
        ) : null}
        <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-muted">
          Quality: {cfg.qualityRating}
        </span>
        <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-muted">
          Limit: {cfg.messagingLimit}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Provider">
          <Select value={cfg.provider} onValueChange={(v) => set("provider", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="meta_cloud_api">Meta Cloud API</SelectItem>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="gupshup">Gupshup</SelectItem>
              <SelectItem value="360dialog">360dialog</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Business name"><Input value={cfg.businessName} onChange={(e) => set("businessName", e.target.value)} /></Field>
        <Field label="WABA ID"><Input value={cfg.wabaId} onChange={(e) => set("wabaId", e.target.value)} /></Field>
        <Field label="Phone number ID"><Input value={cfg.phoneNumberId} onChange={(e) => set("phoneNumberId", e.target.value)} /></Field>
        <Field label="Display phone number"><Input value={cfg.displayPhoneNumber} onChange={(e) => set("displayPhoneNumber", e.target.value)} placeholder="+91 98000 12345" /></Field>
        <Field label="Access token"><Input type="password" value={cfg.accessToken} onChange={(e) => set("accessToken", e.target.value)} placeholder="EAAG…" /></Field>
        <Field label="Meta App Secret">
          <Input type="password" value={cfg.appSecret ?? ""} onChange={(e) => set("appSecret", e.target.value)} placeholder="From Meta App → Settings → Basic" />
        </Field>
        <Field label="Two-step verification PIN">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={cfg.registrationPin ?? ""}
            onChange={(e) => set("registrationPin", e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit PIN (needed to register production numbers)"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Only required once when moving a number to Cloud API. If Meta already shows CONNECTED, click{" "}
            <b>Verify number</b> — no PIN needed. &quot;Registration not confirmed&quot; is cosmetic if
            sending works but Meta status was not synced yet.
          </p>
        </Field>
        {cfg.registrationError ? (
          <Field label="Last registration note" wide>
            <p className="text-xs text-destructive">{cfg.registrationError}</p>
          </Field>
        ) : null}
        <Field label="Callback URL (paste in Meta)" wide>
          <CopyInput value={cfg.webhookUrl} readOnly className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground mt-1">
            Meta → WhatsApp → Configuration → Webhook. Subscribe the <b>messages</b> field. For local dev, expose
            your API (e.g. ngrok on port 5050) and set ApplicationSettings:baseUrl on the server.
          </p>
        </Field>
        <Field label="Webhook verify token" wide>
          <CopyInput
            value={cfg.verifyToken ?? ""}
            onChange={(v) => set("verifyToken", v)}
            placeholder="Generated on first load — copy into Meta verify token"
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Paste this exact value in Meta as the webhook verify token, then click <b>Save</b> here so it stays in
            sync with the server.
          </p>
        </Field>
        <Field label="Webhook security" wide>
          <p className="text-xs text-muted-foreground">
            Save your Meta App Secret above (same value as in Meta App Dashboard → Basic). Incoming webhook POSTs
            are validated against secrets stored in your organization channel settings — no server .env required.
          </p>
        </Field>
      </div>
    </Section>
  );
}

/* ---------- Facebook Messenger ---------- */
function FacebookSection({ orgId }: { orgId: string }) {
  const { cfg, setCfg, loading, error, load } = useChannelSettings(orgId, "facebook");
  const gate = (
    <ChannelSettingsLoadState orgId={orgId} loading={loading} error={error} onRetry={load} />
  );
  if (!cfg) return gate;

  const set = (k: string, v: any) => setCfg({ ...cfg, [k]: v });
  const save = async () => {
    const saved = await crm.updateChannelConfig(orgId, "facebook", cfg);
    setCfg(saved);
    toast.success("Facebook settings saved");
  };
  const verify = async () => {
    await crm.updateChannelConfig(orgId, "facebook", cfg);
    const next = await crm.verifyChannel(orgId, "facebook");
    setCfg(next);
    toast.success("Facebook settings saved and page marked verified");
  };

  return (
    <Section
      icon={<Facebook className="h-5 w-5 text-[#0084ff]" />}
      title="Facebook Messenger"
      subtitle="Connect your Facebook Page so inbound Messenger conversations appear under Chat → Facebook. Click Save after entering credentials."
      footer={<><Button variant="outline" onClick={verify}>Verify page</Button><Button onClick={save}>Save</Button></>}
    >
      <div className="flex flex-wrap gap-2">
        <StatusChip ok={cfg.verified} label={cfg.verified ? "Page verified" : "Not verified"} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Page name"><Input value={cfg.pageName} onChange={(e) => set("pageName", e.target.value)} placeholder="Appointza CRM" /></Field>
        <Field label="Page ID"><Input value={cfg.pageId} onChange={(e) => set("pageId", e.target.value)} placeholder="1234567890" /></Field>
        <Field label="Page access token" wide>
          <Input type="password" value={cfg.pageAccessToken} onChange={(e) => set("pageAccessToken", e.target.value)} placeholder="EAAG…" />
          <p className="text-xs text-muted-foreground mt-1">
            From Meta App → Messenger → Settings → Access tokens. Required to send replies from Chat → Facebook.
          </p>
        </Field>
        <Field label="Meta App Secret">
          <Input type="password" value={cfg.appSecret ?? ""} onChange={(e) => set("appSecret", e.target.value)} placeholder="Meta App → Settings → Basic" />
        </Field>
        <Field label="Callback URL (paste in Meta)" wide>
          <CopyInput value={cfg.webhookUrl} readOnly className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground mt-1">
            Meta App Dashboard → Messenger → Webhooks. Subscribe the page to the <code>messages</code> field.
          </p>
        </Field>
        <Field label="Webhook verify token" wide>
          <CopyInput
            value={cfg.verifyToken ?? ""}
            onChange={(v) => set("verifyToken", v)}
            placeholder="Generated on first load — copy into Meta verify token"
            className="font-mono text-xs"
          />
        </Field>
      </div>
    </Section>
  );
}

/* ---------- SMS / DLT (India) ---------- */
function SmsSection({ orgId }: { orgId: string }) {
  const { cfg, setCfg, loading, error, load } = useChannelSettings(orgId, "sms");
  const gate = (
    <ChannelSettingsLoadState orgId={orgId} loading={loading} error={error} onRetry={load} />
  );
  if (!cfg) return gate;

  const set = (k: string, v: any) => setCfg({ ...cfg, [k]: v });
  const save = async () => {
    const saved = await crm.updateChannelConfig(orgId, "sms", cfg);
    setCfg(saved);
    toast.success("SMS settings saved");
  };
  const verify = async () => {
    await crm.updateChannelConfig(orgId, "sms", cfg);
    const next = await crm.verifyChannel(orgId, "sms");
    setCfg(next);
    toast.success("SMS settings saved and DLT marked verified");
  };

  return (
    <Section
      icon={<MessageSquare className="h-5 w-5" style={{ color: "var(--sms)" }} />}
      title="SMS — DLT compliant (India)"
      subtitle="Configure aggregator, DLT Principal Entity ID, sender header and route."
      footer={<><Button variant="outline" onClick={verify}>Verify DLT</Button><Button onClick={save}>Save</Button></>}
    >
      <div className="flex flex-wrap gap-2">
        <StatusChip ok={cfg.dltEnabled} label={cfg.dltEnabled ? "DLT registered" : "DLT not registered"} />
        <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-muted">
          Country: {cfg.country}
        </span>
        <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-muted">
          {cfg.tps} TPS
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Provider">
          <Select value={cfg.provider} onValueChange={(v) => set("provider", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["msg91", "gupshup", "kaleyra", "twilio", "textlocal"].map((p) =>
                <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="API key / Auth token"><Input type="password" value={cfg.apiKey} onChange={(e) => set("apiKey", e.target.value)} /></Field>
        <Field label="DLT Principal Entity ID (PE ID)"><Input value={cfg.principalEntityId} onChange={(e) => set("principalEntityId", e.target.value)} placeholder="19-digit number" /></Field>
        <Field label="Sender ID / Header (6 chars)">
          <Input value={cfg.senderId} maxLength={6} onChange={(e) => set("senderId", e.target.value.toUpperCase())} placeholder="ACMEIN" />
        </Field>
        <Field label="Sender ID type">
          <Select value={cfg.senderIdType} onValueChange={(v) => set("senderIdType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Promotional", "Transactional", "Service-Implicit", "Service-Explicit"].map((t) =>
                <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Route">
          <Select value={cfg.route} onValueChange={(v) => set("route", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Promotional", "Transactional", "OTP"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Throughput (TPS)"><Input type="number" value={cfg.tps} onChange={(e) => set("tps", Number(e.target.value))} /></Field>
      </div>

      <p className="text-xs text-muted-foreground">
        Per TRAI regulations, every SMS must be linked to a DLT-approved template ID. Manage templates from the Templates section.
      </p>
    </Section>
  );
}

/* ---------- Wallet ---------- */
function WalletSection({ orgId, role }: { orgId: string; role: string }) {
  const [bill, setBill] = useState<any>(null);
  const [amount, setAmount] = useState(DEFAULT_TOP_UP_INR);
  useEffect(() => { if (orgId) crm.getBilling(orgId, role).then(setBill); }, [orgId, role]);
  if (!bill) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const topUp = async () => {
    const next = await crm.topUpWallet(orgId, amount);
    setBill(next);
    toast.success(`Wallet topped up by ${formatINR(amount)}`);
  };

  return (
    <Section
      icon={<Wallet className="h-5 w-5" />}
      title="Wallet & billing"
      subtitle="Prepaid wallet used for SMS, WhatsApp and email sending."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Wallet balance</div>
          <div className="text-3xl font-bold mt-1">{formatINR(bill.wallet)}</div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Messages this period</div>
          <div className="text-3xl font-bold mt-1">
            {bill.usage.sms + bill.usage.whatsapp + bill.usage.email + (bill.usage.facebook ?? 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            SMS {bill.usage.sms} · WA {bill.usage.whatsapp} · Email {bill.usage.email} · FB {bill.usage.facebook ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-border p-4 space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Top up</div>
          <div className="flex gap-2">
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <Button onClick={topUp}>Add</Button>
          </div>
          <div className="flex gap-1">
            {TOP_UP_PRESETS_INR.slice(0, 4).map((p) => (
              <Button key={p} variant="outline" size="sm" onClick={() => setAmount(p)}>{formatINRPreset(p)}</Button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Recent transactions</h3>
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Description</th><th className="text-right px-3 py-2">Amount</th></tr>
            </thead>
            <tbody>
              {bill.transactions.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No transactions yet</td></tr>
              )}
              {bill.transactions.map((t: any) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2">{t.date}</td>
                  <td className="px-3 py-2">{t.desc}</td>
                  <td className={`px-3 py-2 text-right font-medium ${t.type === "credit" ? "text-[var(--success)]" : "text-destructive"}`}>
                    {t.type === "credit" ? "+" : ""}{formatINR(Math.abs(t.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}

/* ---------- Reference values ---------- */
function ReferenceValuesSection({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [categoryTab, setCategoryTab] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    code: "",
    category: "lead_type",
    referenceValue: "",
    referenceCode: "",
    colorCode: "#6B7280",
    monthCount: 0,
  });

  const load = async () => {
    if (!orgId) return;
    setRows(await crm.listReferenceValues(orgId));
  };

  useEffect(() => { void load(); }, [orgId]);

  const resetForm = () => {
    setForm({
      code: "",
      category: "lead_type",
      referenceValue: "",
      referenceCode: "",
      colorCode: "#6B7280",
      monthCount: 0,
    });
    setEditing(null);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      code: r.code ?? "",
      category: r.category ?? "lead_type",
      referenceValue: r.referenceValue ?? "",
      referenceCode: r.referenceCode ?? "",
      colorCode: r.colorCode ?? "#6B7280",
      monthCount: Number(r.monthCount ?? 0),
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await crm.updateReferenceValue(orgId, editing.id, {
          code: form.code,
          category: form.category,
          referenceValue: form.referenceValue,
          referenceCode: form.referenceCode,
          colorCode: form.colorCode,
          monthCount: form.monthCount,
        });
        toast.success("Reference value updated");
      } else {
        await crm.createReferenceValue(orgId, {
          code: form.code,
          category: form.category,
          referenceValue: form.referenceValue,
          referenceCode: form.referenceCode,
          colorCode: form.colorCode,
          monthCount: form.monthCount,
        });
        toast.success("Reference value created");
      }
      setOpen(false);
      resetForm();
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    }
  };

  const remove = async (id: string) => {
    try {
      await crm.deleteReferenceValue(orgId, id);
      toast.success("Removed");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not delete");
    }
  };

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (k === "monthCount") setForm({ ...form, monthCount: Number(v) || 0 });
    else setForm({ ...form, [k]: v });
  };

  if (!orgId) {
    return <div className="text-sm text-muted-foreground">Select an organization to manage reference values.</div>;
  }

  const visibleRows =
    categoryTab === "all" ? rows : rows.filter((r) => r.category === categoryTab);

  const refCodeHint =
    form.category === "lead_stage"
      ? "Allowed next stages — comma-separated codes (e.g. prospect,call,loss)"
      : form.category === "lead_source"
        ? "Optional external ID or notes (not used in UI)"
        : "Optional secondary code or alias";

  return (
    <Section
      icon={<Tags className="h-5 w-5" />}
      title="Reference values"
      subtitle="Per-organization lookup tables. Configure business categories, lead types (stages), and lead sources for your business."
      footer={
        <>
          <Button
            type="button"
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add row
          </Button>
          <Sheet
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) resetForm();
            }}
          >
            <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
            <SheetHeader className="border-b px-6 py-4 text-left">
              <SheetTitle>{editing ? "Edit reference value" : "New reference value"}</SheetTitle>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
                <Field label="Code (unique)">
                  <Input value={form.code} onChange={setField("code")} placeholder="e.g. GOLD" />
                </Field>
                <Field label="Category">
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REFERENCE_VALUE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Reference value (display label)"><Input value={form.referenceValue} onChange={setField("referenceValue")} placeholder="e.g. Prospect" /></Field>
                <Field label="Reference code">
                  <Input value={form.referenceCode} onChange={setField("referenceCode")} placeholder={form.category === "lead_stage" ? "prospect,call,loss" : ""} />
                  <p className="text-xs text-muted-foreground mt-1">{refCodeHint}</p>
                </Field>
                <Field label="Color">
                  <div className="flex gap-2">
                    <Input type="color" className="h-10 w-14 cursor-pointer p-1" value={form.colorCode} onChange={setField("colorCode")} />
                    <Input className="flex-1 font-mono text-xs" value={form.colorCode} onChange={setField("colorCode")} />
                  </div>
                </Field>
                <Field label="Month count"><Input type="number" min={0} value={form.monthCount} onChange={setField("monthCount")} /></Field>
              </div>
              <SheetFooter className="mt-auto border-t px-6 py-4">
                <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>
        </>
      }
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          type="button"
          size="sm"
          variant={categoryTab === "all" ? "default" : "outline"}
          onClick={() => setCategoryTab("all")}
        >
          All ({rows.length})
        </Button>
        {REFERENCE_VALUE_CATEGORIES.map((c) => {
          const count = rows.filter((r) => r.category === c.value).length;
          return (
            <Button
              key={c.value}
              type="button"
              size="sm"
              variant={categoryTab === c.value ? "default" : "outline"}
              onClick={() => setCategoryTab(c.value)}
            >
              {c.label} ({count})
            </Button>
          );
        })}
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Code</th>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-left px-3 py-2">Reference value</th>
              <th className="text-left px-3 py-2">Ref. code</th>
              <th className="text-left px-3 py-2">Color</th>
              <th className="text-right px-3 py-2">Months</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No rows in this category — add a reference value.</td></tr>
            )}
            {visibleRows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground max-w-[120px] truncate" title={r.id}>{r.id}</td>
                <td className="px-3 py-2 font-medium">{r.code}</td>
                <td className="px-3 py-2">
                  {referenceCategoryLabel(r.category)}
                </td>
                <td className="px-3 py-2">{r.referenceValue}</td>
                <td className="px-3 py-2">{r.referenceCode}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded border border-border" style={{ backgroundColor: r.colorCode }} />
                    <span className="font-mono text-xs">{r.colorCode}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.monthCount}</td>
                <td className="px-3 py-2 text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(r.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ---------- API Keys & Webhooks ---------- */
function ApiSection({ orgId }: { orgId: string }) {
  const [keys, setKeys] = useState<any[]>([]);
  const [channels, setChannels] = useState<Awaited<ReturnType<typeof crm.getChannelConfig>> | null>(null);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<any>(null);

  useEffect(() => {
    if (!orgId) return;
    crm.getApiKeys(orgId).then(setKeys);
    crm.getChannelConfig(orgId).then(setChannels).catch(() => setChannels(null));
  }, [orgId]);

  const webhookBase = useMemo(
    () => `${getApiBaseUrl() || "https://your-public-api"}/webhooks`,
    [],
  );

  const create = async () => {
    const k = await crm.createApiKey(orgId, label.trim() || "Untitled");
    setCreated(k);
    setKeys(await crm.getApiKeys(orgId));
    setLabel("");
  };
  const revoke = async (id: string) => {
    await crm.revokeApiKey(orgId, id);
    setKeys(await crm.getApiKeys(orgId));
    toast.success("API key revoked");
  };
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  return (
    <div className="space-y-6">
      <Section
        icon={<KeyRound className="h-5 w-5" />}
        title="API keys"
        subtitle="Programmatic access to leads, templates and campaigns. Keys are scoped to this organization."
        footer={
          <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCreated(null); }}>
            <SheetTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New API key</Button></SheetTrigger>
            <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
              <SheetHeader className="border-b px-6 py-4 text-left">
                <SheetTitle>{created ? "API key created" : "Create API key"}</SheetTitle>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
                  {!created ? (
                    <Field label="Label"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Production server" /></Field>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Copy this key now — you won't see it again.</p>
                      <div className="flex gap-2">
                        <Input readOnly value={created.secret} className="font-mono text-xs" />
                        <Button variant="outline" onClick={() => copy(created.secret)}><Copy className="h-4 w-4" /></Button>
                      </div>
                    </>
                  )}
                </div>
                <SheetFooter className="mt-auto border-t px-6 py-4">
                  {!created
                    ? <Button onClick={create}>Create</Button>
                    : <Button onClick={() => { setOpen(false); setCreated(null); }}>Done</Button>}
                </SheetFooter>
              </div>
            </SheetContent>
          </Sheet>
        }
      >
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Label</th>
                <th className="text-left px-3 py-2">Key prefix</th>
                <th className="text-left px-3 py-2">Created</th>
                <th className="text-left px-3 py-2">Last used</th>
                <th className="text-right px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No API keys yet</td></tr>
              )}
              {keys.map((k) => (
                <tr key={k.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{k.label}</td>
                  <td className="px-3 py-2 font-mono text-xs">{k.prefix}…</td>
                  <td className="px-3 py-2">{k.createdAt}</td>
                  <td className="px-3 py-2">{k.lastUsed ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => revoke(k.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        icon={<Webhook className="h-5 w-5" />}
        title="Webhook endpoints"
        subtitle="Configure these URLs at your provider to receive delivery and inbound events."
      >
        {[
          {
            label: "WhatsApp inbound + status",
            url: `${webhookBase}/whatsapp`,
            verifyToken: channels?.whatsapp?.verifyToken ?? "",
          },
          {
            label: "Facebook Messenger inbound",
            url: `${webhookBase}/facebook`,
            verifyToken: channels?.facebook?.verifyToken ?? "",
          },
          { label: "SES bounces / complaints", url: `${webhookBase}/ses`, verifyToken: "" },
          { label: "SMS DLR (delivery reports)", url: `${webhookBase}/sms`, verifyToken: "" },
        ].map((w) => (
          <div key={w.url} className="space-y-2 border-b border-border pb-4 last:border-0 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{w.label}</div>
                <div className="font-mono text-xs text-muted-foreground break-all mt-0.5">{w.url}</div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => copy(w.url)}>
                <Copy className="h-4 w-4 mr-1" />Copy URL
              </Button>
            </div>
            {w.verifyToken ? (
              <div className="flex items-start gap-3 pl-0">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Webhook verify token
                  </div>
                  <div className="font-mono text-xs break-all mt-0.5">{w.verifyToken}</div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => copy(w.verifyToken)}>
                  <Copy className="h-4 w-4 mr-1" />Copy token
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </Section>
    </div>
  );
}

function CopyInput({
  value,
  onChange,
  readOnly,
  placeholder,
  className,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const copy = () => {
    if (!value?.trim()) return;
    navigator.clipboard.writeText(value);
    toast.success("Copied");
  };
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        className={className}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
      <Button type="button" variant="outline" size="icon" onClick={copy} disabled={!value?.trim()} aria-label="Copy">
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ---------- Field helper ---------- */
function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`space-y-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  );
}
