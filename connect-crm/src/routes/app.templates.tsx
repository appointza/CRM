import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getTemplates,
  createTemplate,
  createWhatsAppTemplate,
  syncWhatsAppTemplates,
  sendWhatsAppMessage,
} from "@/services/crmService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChannelBadge } from "@/components/crm-ui";
import {
  WA_TEMPLATE_VARIABLE_OPTIONS,
  waVariableLabel,
  listBodyVariableIndices,
  defaultMappingForBody,
  syncVariableMapping,
} from "@/constants/whatsappTemplateVariables";
import { Plus, RefreshCw, Send, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/templates")({
  component: TemplatesPage,
});

const emptyLocalForm = () => ({ name: "", channel: "sms", body: "" });

type WaButton = { type: string; text: string; url: string; phone_number: string };

const emptyWhatsAppForm = () => ({
  name: "booking_confirmation",
  category: "UTILITY",
  language: "en_US",
  headerType: "TEXT",
  headerContent: "Booking Confirmed",
  headerMediaHandle: "",
  body: "Hi {{1}}, your {{2}} booking is confirmed for {{3}} at {{4}}.",
  footer: "Powered by Appointza",
  buttons: [] as WaButton[],
  variableMapping: {} as Record<string, string>,
});

const LANG_OPTIONS = ["en_US", "en_GB", "hi", "ta"];

function countNumberedVars(body: string) {
  const indices = listBodyVariableIndices(body);
  return indices.length ? Math.max(...indices) : 0;
}

function TemplatesPage() {
  const { user, organization } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [submittingWa, setSubmittingWa] = useState(false);
  const [sendTemplate, setSendTemplate] = useState<any | null>(null);
  const [form, setForm] = useState(emptyLocalForm);
  const [waForm, setWaForm] = useState(emptyWhatsAppForm);

  const waVarCount = useMemo(() => countNumberedVars(waForm.body), [waForm.body]);
  const waVarIndices = useMemo(() => listBodyVariableIndices(waForm.body), [waForm.body]);

  useEffect(() => {
    if (!waOpen) return;
    setWaForm((prev) => {
      const synced = syncVariableMapping(prev.body, prev.variableMapping);
      const hasAny = Object.values(synced).some(Boolean);
      if (!hasAny && waVarIndices.length > 0) {
        return { ...prev, variableMapping: defaultMappingForBody(prev.body) };
      }
      return { ...prev, variableMapping: synced };
    });
  }, [waForm.body, waOpen, waVarIndices.length]);

  const load = () => {
    if (user) getTemplates(organization?.id ?? null, user.role).then(setTemplates);
  };
  useEffect(load, [user, organization]);

  if (!user) return null;

  const submitLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) {
      toast.error("Select an organization");
      return;
    }
    await createTemplate(organization.id, form);
    toast.success("Template saved");
    setOpen(false);
    setForm(emptyLocalForm());
    load();
  };

  const submitWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) {
      toast.error("Select an organization");
      return;
    }
    setSubmittingWa(true);
    try {
      const payload = {
        name: waForm.name,
        category: waForm.category,
        language: waForm.language,
        headerType: waForm.headerType,
        headerContent: waForm.headerType === "TEXT" ? waForm.headerContent : undefined,
        headerMediaHandle:
          ["IMAGE", "VIDEO", "DOCUMENT"].includes(waForm.headerType)
            ? waForm.headerMediaHandle
            : undefined,
        body: waForm.body,
        footer: waForm.footer,
        buttons: waForm.buttons
          .filter((b) => b.text.trim())
          .map((b) => ({
            type: b.type,
            text: b.text.trim(),
            ...(b.type === "URL" && b.url ? { url: b.url.trim() } : {}),
            ...(b.type === "PHONE_NUMBER" && b.phone_number
              ? { phone_number: b.phone_number.trim() }
              : {}),
          })),
        variableMapping: waForm.variableMapping,
      };
      const res = await createWhatsAppTemplate(organization.id, payload);
      toast.success(
        `Submitted to Meta — status: ${res.meta?.status ?? res.status ?? "PENDING"}. Sync later for approval updates.`,
      );
      setWaOpen(false);
      setWaForm(emptyWhatsAppForm());
      load();
    } catch (err: any) {
      toast.error(err?.message || "Could not create WhatsApp template on Meta");
    } finally {
      setSubmittingWa(false);
    }
  };

  const syncFromMeta = async () => {
    if (!organization?.id) {
      toast.error("Select an organization");
      return;
    }
    setSyncing(true);
    try {
      const res = await syncWhatsAppTemplates(organization.id);
      toast.success(`Synced ${res.fetched} template(s) from Meta (${res.created} new, ${res.updated} updated)`);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Could not sync WhatsApp templates");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Create WhatsApp templates in Appointza and submit to Meta for approval — or sync existing ones.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={syncFromMeta} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            Sync from Meta
          </Button>
          <Sheet open={waOpen} onOpenChange={setWaOpen}>
            <SheetTrigger asChild>
              <Button variant="default">
                <MessageCircle className="h-4 w-4 mr-1" />
                WhatsApp template
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
              <SheetHeader className="border-b px-6 py-4 text-left">
                <SheetTitle>Create WhatsApp template</SheetTitle>
                <SheetDescription>
                  Submits to Meta for review. Requires WABA ID + access token in Settings → WhatsApp (
                  <code className="text-xs">whatsapp_business_management</code> permission).
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={submitWhatsApp} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  <div className="space-y-2">
                    <Label>Template name</Label>
                    <Input
                      required
                      value={waForm.name}
                      onChange={(e) => setWaForm({ ...waForm, name: e.target.value })}
                      placeholder="booking_confirmation"
                    />
                    <p className="text-xs text-muted-foreground">Lowercase, underscores only (auto-normalized).</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={waForm.category} onValueChange={(v) => setWaForm({ ...waForm, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTILITY">Utility</SelectItem>
                          <SelectItem value="MARKETING">Marketing</SelectItem>
                          <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select value={waForm.language} onValueChange={(v) => setWaForm({ ...waForm, language: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LANG_OPTIONS.map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border pt-4">
                    <Label>Header type</Label>
                    <Select
                      value={waForm.headerType}
                      onValueChange={(v) => setWaForm({ ...waForm, headerType: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="TEXT">Text</SelectItem>
                        <SelectItem value="IMAGE">Image</SelectItem>
                        <SelectItem value="VIDEO">Video</SelectItem>
                        <SelectItem value="DOCUMENT">Document</SelectItem>
                      </SelectContent>
                    </Select>
                    {waForm.headerType === "TEXT" && (
                      <Input
                        value={waForm.headerContent}
                        onChange={(e) => setWaForm({ ...waForm, headerContent: e.target.value })}
                        placeholder="Booking Confirmed"
                      />
                    )}
                    {["IMAGE", "VIDEO", "DOCUMENT"].includes(waForm.headerType) && (
                      <div className="space-y-1">
                        <Input
                          value={waForm.headerMediaHandle}
                          onChange={(e) => setWaForm({ ...waForm, headerMediaHandle: e.target.value })}
                          placeholder="Meta media handle (from Resumable Upload API)"
                        />
                        <p className="text-xs text-muted-foreground">
                          Media headers need a sample uploaded to Meta first.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Body</Label>
                    <Textarea
                      required
                      rows={5}
                      value={waForm.body}
                      onChange={(e) => setWaForm({ ...waForm, body: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use numbered variables: {"{{1}}"}, {"{{2}}"}, … ({waVarCount} slot(s))
                    </p>
                  </div>

                  {waVarIndices.length > 0 && (
                    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div>
                        <Label className="text-primary">Variable mapping</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Meta only sees {"{{1}}"}, {"{{2}}"}… Tell Appointza what each means for auto-fill when sending.
                        </p>
                      </div>
                      {waVarIndices.map((idx) => (
                        <div key={idx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <span className="text-sm font-mono font-medium w-12 shrink-0">{`{{${idx}}}`}</span>
                          <span className="text-muted-foreground hidden sm:inline">=</span>
                          <Select
                            value={waForm.variableMapping[String(idx)] || ""}
                            onValueChange={(v) =>
                              setWaForm({
                                ...waForm,
                                variableMapping: { ...waForm.variableMapping, [String(idx)]: v },
                              })
                            }
                          >
                            <SelectTrigger className="flex-1 h-9">
                              <SelectValue placeholder="Choose meaning…" />
                            </SelectTrigger>
                            <SelectContent>
                              {WA_TEMPLATE_VARIABLE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Footer (optional)</Label>
                    <Input
                      value={waForm.footer}
                      onChange={(e) => setWaForm({ ...waForm, footer: e.target.value })}
                      placeholder="Powered by Appointza"
                    />
                  </div>

                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <Label>Buttons (optional, max 3)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={waForm.buttons.length >= 3}
                        onClick={() =>
                          setWaForm({
                            ...waForm,
                            buttons: [
                              ...waForm.buttons,
                              { type: "QUICK_REPLY", text: "", url: "", phone_number: "" },
                            ],
                          })
                        }
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add button
                      </Button>
                    </div>
                    {waForm.buttons.map((btn, i) => (
                      <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Select
                            value={btn.type}
                            onValueChange={(v) => {
                              const buttons = [...waForm.buttons];
                              buttons[i] = { ...buttons[i], type: v };
                              setWaForm({ ...waForm, buttons });
                            }}
                          >
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="QUICK_REPLY">Quick reply</SelectItem>
                              <SelectItem value="URL">URL</SelectItem>
                              <SelectItem value="PHONE_NUMBER">Phone</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() =>
                              setWaForm({
                                ...waForm,
                                buttons: waForm.buttons.filter((_, j) => j !== i),
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Button label"
                          value={btn.text}
                          onChange={(e) => {
                            const buttons = [...waForm.buttons];
                            buttons[i] = { ...buttons[i], text: e.target.value };
                            setWaForm({ ...waForm, buttons });
                          }}
                        />
                        {btn.type === "URL" && (
                          <Input
                            placeholder="https://appointza.com/booking"
                            value={btn.url}
                            onChange={(e) => {
                              const buttons = [...waForm.buttons];
                              buttons[i] = { ...buttons[i], url: e.target.value };
                              setWaForm({ ...waForm, buttons });
                            }}
                          />
                        )}
                        {btn.type === "PHONE_NUMBER" && (
                          <Input
                            placeholder="+919999999999"
                            value={btn.phone_number}
                            onChange={(e) => {
                              const buttons = [...waForm.buttons];
                              buttons[i] = { ...buttons[i], phone_number: e.target.value };
                              setWaForm({ ...waForm, buttons });
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <SheetFooter className="mt-auto border-t px-6 py-4">
                  <Button type="submit" disabled={submittingWa}>
                    {submittingWa ? "Submitting…" : "Submit to Meta"}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                SMS / Email
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0">
              <SheetHeader className="border-b px-6 py-4 text-left">
                <SheetTitle>Local template (SMS / Email)</SheetTitle>
              </SheetHeader>
              <form onSubmit={submitLocal} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <select
                      value={form.channel}
                      onChange={(e) => setForm({ ...form, channel: e.target.value })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Body</Label>
                    <Textarea
                      rows={5}
                      required
                      value={form.body}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                    />
                  </div>
                </div>
                <SheetFooter className="mt-auto border-t px-6 py-4">
                  <Button type="submit">Save locally</Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-sm)] flex flex-col">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-semibold">{t.name}</div>
              <ChannelBadge channel={t.channel} />
            </div>
            {t.channel === "whatsapp" && (t.status || t.language || t.category) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.status && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      t.status === "APPROVED"
                        ? "bg-[var(--success)]/10 text-[var(--success)]"
                        : t.status === "REJECTED"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted"
                    }`}
                  >
                    {t.status}
                  </span>
                )}
                {t.language && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted">{t.language}</span>
                )}
                {t.category && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted">{t.category}</span>
                )}
                {(t.variables_count ?? 0) > 0 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted">
                    {t.variables_count} variable(s)
                  </span>
                )}
              </div>
            )}
            <p className="mt-3 text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap flex-1">{t.body}</p>
            {t.channel === "whatsapp" && t.header_content && (
              <p className="mt-2 text-xs text-muted-foreground">
                Header ({t.header_type || "TEXT"}): {t.header_content}
              </p>
            )}
            {t.channel === "whatsapp" && t.footer && (
              <p className="text-xs text-muted-foreground">Footer: {t.footer}</p>
            )}
            {t.channel === "whatsapp" && t.variable_mapping && Object.keys(t.variable_mapping).length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Variable mapping</p>
                {Object.entries(t.variable_mapping).map(([k, v]) => (
                  <p key={k} className="text-xs text-muted-foreground">
                    <span className="font-mono">{`{{${k}}}`}</span> → {waVariableLabel(String(v))}
                  </p>
                ))}
              </div>
            )}
            {t.channel === "whatsapp" && Array.isArray(t.buttons) && t.buttons.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {t.buttons.map((b: any, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted">
                    {b.text} ({b.type})
                  </span>
                ))}
              </div>
            )}
            {t.channel === "whatsapp" && t.status === "PENDING" && (
              <p className="mt-2 text-xs text-muted-foreground">Waiting for Meta approval — click Sync from Meta to refresh.</p>
            )}
            {t.channel === "whatsapp" && t.status === "APPROVED" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 w-full"
                onClick={() => setSendTemplate(t)}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                Send test message
              </Button>
            )}
          </div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
            No templates yet. Create a WhatsApp template or sync from Meta.
          </div>
        )}
      </div>

      <SendWhatsAppSheet template={sendTemplate} onClose={() => setSendTemplate(null)} />
    </div>
  );
}

function SendWhatsAppSheet({ template, onClose }: { template: any | null; onClose: () => void }) {
  const varCount = template?.variables_count ?? 0;
  const [to, setTo] = useState("");
  const [params, setParams] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!template) return;
    setTo("");
    setParams(Array(varCount).fill(""));
  }, [template, varCount]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;
    setSending(true);
    try {
      const res = await sendWhatsAppMessage({
        templateId: template.id,
        to: to.trim(),
        parameters: varCount > 0 ? params : undefined,
      });
      toast.success(`Message sent to ${res.to}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={!!template} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle>Send WhatsApp template</SheetTitle>
          <SheetDescription>
            {template?.name} ({template?.language || "en_US"}) — uses credentials from Settings → WhatsApp.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>Recipient phone</Label>
              <Input required value={to} onChange={(e) => setTo(e.target.value)} placeholder="9198270612215" />
              <p className="text-xs text-muted-foreground">Country code + number, no + or spaces.</p>
            </div>
            {varCount > 0 && (
              <div className="space-y-3">
                <Label>Template variables (1 … {varCount})</Label>
                {params.map((p, i) => {
                  const mapKey = template?.variable_mapping?.[String(i + 1)];
                  const hint = mapKey ? waVariableLabel(mapKey) : `Value for {{${i + 1}}}`;
                  return (
                    <div key={i} className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {`{{${i + 1}}}`}
                        {mapKey ? ` — ${hint}` : ""}
                      </p>
                      <Input
                        required
                        value={p}
                        placeholder={hint}
                        onChange={(e) => {
                          const next = [...params];
                          next[i] = e.target.value;
                          setParams(next);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {template?.body && (
              <div className="rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">{template.body}</div>
            )}
          </div>
          <SheetFooter className="mt-auto border-t px-6 py-4">
            <Button type="submit" disabled={sending}>
              <Send className="h-4 w-4 mr-1" />
              {sending ? "Sending…" : "Send"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
