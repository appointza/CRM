import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/crmApi";
import { getBusinessProfile, saveBusinessProfile } from "@/services/aiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/business-profile")({
  component: BusinessProfilePage,
});

type Pkg = {
  id?: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  benefits: string[];
  uniqueSellingPoints: string;
  idealFor: string;
};
type Svc = { name: string; description: string };
type Profile = {
  companyName: string; description: string; category: string; subcategory: string;
  website: string; phone: string; email: string; address: string;
  services: Svc[]; packages: Pkg[];
  targetAudience: string; idealCustomerProfile: string; targetIndustries: string[];
  problemsSolved: string; competitors: string; competitiveAdvantages: string;
  salesStrategy: string; marketingApproach: string; customerAcquisition: string; additionalInfo: string;
};

const emptyPkg = (): Pkg => ({ name: "", price: "", description: "", features: [], benefits: [], uniqueSellingPoints: "", idealFor: "" });
const emptyProfile = (): Profile => ({
  companyName: "", description: "", category: "", subcategory: "", website: "", phone: "", email: "", address: "",
  services: [], packages: [],
  targetAudience: "", idealCustomerProfile: "", targetIndustries: [], problemsSolved: "", competitors: "",
  competitiveAdvantages: "", salesStrategy: "", marketingApproach: "", customerAcquisition: "", additionalInfo: "",
});

/** Normalise API data (nulls, missing arrays) into form state. */
function fromApi(p: any): Profile {
  const e = emptyProfile();
  const out: any = { ...e };
  for (const k of Object.keys(e) as (keyof Profile)[]) {
    if (p?.[k] != null) out[k] = p[k];
  }
  out.services = (p?.services ?? []).map((s: any) => ({ name: s.name ?? "", description: s.description ?? "" }));
  out.packages = (p?.packages ?? []).map((x: any) => ({ ...emptyPkg(), ...x, features: x.features ?? [], benefits: x.benefits ?? [] }));
  out.targetIndustries = p?.targetIndustries ?? [];
  return out;
}

const toLines = (v: string[]) => (v ?? []).join("\n");
const fromLines = (v: string) => v.split("\n");
const cleanLines = (v: string[]) => (v ?? []).map((x) => x.trim()).filter(Boolean);

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function BusinessProfilePage() {
  const { user } = useAuth();
  const [p, setP] = useState<Profile>(emptyProfile());
  // Line-based fields are edited as raw text so Enter works; they are split on save.
  const [industriesText, setIndustriesText] = useState("");
  const [pkgText, setPkgText] = useState<{ features: string; benefits: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!user) return;
    getBusinessProfile()
      .then((res) => {
        const prof = fromApi(res);
        setP(prof);
        setIndustriesText(toLines(prof.targetIndustries));
        setPkgText(prof.packages.map((x) => ({ features: toLines(x.features), benefits: toLines(x.benefits) })));
      })
      .catch((err) => toast.error(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => { setP((s) => ({ ...s, [k]: v })); setDirty(true); };
  const text = (k: keyof Profile) => ({
    value: (p[k] as string) ?? "",
    onChange: (e: any) => set(k, e.target.value as any),
  });

  const setPkg = (i: number, patch: Partial<Pkg>) => {
    set("packages", p.packages.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };
  const setPkgLines = (i: number, field: "features" | "benefits", v: string) => {
    setPkgText((t) => t.map((x, idx) => (idx === i ? { ...x, [field]: v } : x)));
    setDirty(true);
  };
  const setSvc = (i: number, patch: Partial<Svc>) => {
    set("services", p.services.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: Profile = {
        ...p,
        targetIndustries: cleanLines(fromLines(industriesText)),
        services: p.services.filter((s) => s.name.trim()),
        packages: p.packages
          .map((x, i) => ({
            ...x,
            features: cleanLines(fromLines(pkgText[i]?.features ?? "")),
            benefits: cleanLines(fromLines(pkgText[i]?.benefits ?? "")),
          }))
          .filter((x) => x.name.trim()),
      };
      const saved = fromApi(await saveBusinessProfile(payload));
      setP(saved);
      setIndustriesText(toLines(saved.targetIndustries));
      setPkgText(saved.packages.map((x) => ({ features: toLines(x.features), benefits: toLines(x.benefits) })));
      setDirty(false);
      toast.success("Business profile saved");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 max-w-4xl pb-24">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" /> Business Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          The AI uses this as its knowledge base. It will only quote the prices and packages entered here.
          Stored on this machine only.
        </p>
      </div>

      <Section title="Company">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name"><Input {...text("companyName")} /></Field>
          <Field label="Website"><Input {...text("website")} placeholder="https://" /></Field>
          <Field label="Category"><Input {...text("category")} placeholder="e.g. Software / SaaS" /></Field>
          <Field label="Subcategory"><Input {...text("subcategory")} placeholder="e.g. Appointment booking" /></Field>
          <Field label="Phone"><Input {...text("phone")} /></Field>
          <Field label="Email"><Input {...text("email")} /></Field>
        </div>
        <Field label="Address"><Input {...text("address")} /></Field>
        <Field label="Business description"><Textarea rows={4} {...text("description")} /></Field>
      </Section>

      <Section title="Services" hint="What you offer, besides packages.">
        {p.services.map((s, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] items-start">
            <Input value={s.name} placeholder="Service name" onChange={(e) => setSvc(i, { name: e.target.value })} />
            <Input value={s.description} placeholder="Short description" onChange={(e) => setSvc(i, { description: e.target.value })} />
            <Button variant="ghost" size="icon" onClick={() => set("services", p.services.filter((_, idx) => idx !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => set("services", [...p.services, { name: "", description: "" }])}>
          <Plus className="h-4 w-4 mr-2" /> Add service
        </Button>
      </Section>

      <Section title="Packages & pricing" hint="Enter price exactly as you want it quoted (e.g. “₹4,999 / month”). Leave blank if it should not be quoted.">
        {p.packages.map((x, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Input className="font-medium" value={x.name} placeholder="Package name" onChange={(e) => setPkg(i, { name: e.target.value })} />
              <Input className="max-w-[220px]" value={x.price} placeholder="Price" onChange={(e) => setPkg(i, { price: e.target.value })} />
              <Button
                variant="ghost" size="icon"
                onClick={() => {
                  set("packages", p.packages.filter((_, idx) => idx !== i));
                  setPkgText((t) => t.filter((_, idx) => idx !== i));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea rows={2} value={x.description} placeholder="Description" onChange={(e) => setPkg(i, { description: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Features (one per line)">
                <Textarea rows={4} value={pkgText[i]?.features ?? ""} onChange={(e) => setPkgLines(i, "features", e.target.value)} />
              </Field>
              <Field label="Benefits (one per line)">
                <Textarea rows={4} value={pkgText[i]?.benefits ?? ""} onChange={(e) => setPkgLines(i, "benefits", e.target.value)} />
              </Field>
              <Field label="Unique selling points">
                <Textarea rows={2} value={x.uniqueSellingPoints} onChange={(e) => setPkg(i, { uniqueSellingPoints: e.target.value })} />
              </Field>
              <Field label="Ideal for">
                <Textarea rows={2} value={x.idealFor} onChange={(e) => setPkg(i, { idealFor: e.target.value })} />
              </Field>
            </div>
          </div>
        ))}
        <Button
          variant="outline" size="sm"
          onClick={() => { set("packages", [...p.packages, emptyPkg()]); setPkgText((t) => [...t, { features: "", benefits: "" }]); }}
        >
          <Plus className="h-4 w-4 mr-2" /> Add package
        </Button>
      </Section>

      <Section title="Customers & market">
        <Field label="Target audience"><Textarea rows={2} {...text("targetAudience")} /></Field>
        <Field label="Ideal customer profile"><Textarea rows={3} {...text("idealCustomerProfile")} /></Field>
        <Field label="Target industries / business types (one per line)">
          <Textarea rows={4} value={industriesText} onChange={(e) => { setIndustriesText(e.target.value); setDirty(true); }} />
        </Field>
        <Field label="Problems your business solves"><Textarea rows={3} {...text("problemsSolved")} /></Field>
      </Section>

      <Section title="Competition & sales">
        <Field label="Competitors"><Textarea rows={2} {...text("competitors")} /></Field>
        <Field label="Competitive advantages"><Textarea rows={2} {...text("competitiveAdvantages")} /></Field>
        <Field label="Sales strategy"><Textarea rows={3} {...text("salesStrategy")} /></Field>
        <Field label="Marketing approach"><Textarea rows={2} {...text("marketingApproach")} /></Field>
        <Field label="Customer acquisition methods"><Textarea rows={2} {...text("customerAcquisition")} /></Field>
        <Field label="Additional information"><Textarea rows={3} {...text("additionalInfo")} /></Field>
      </Section>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-end gap-3">
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
        <Button onClick={save} disabled={saving || !dirty}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
