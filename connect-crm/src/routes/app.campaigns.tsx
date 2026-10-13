import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getCampaigns,
  getCampaign,
  getTemplates,
  getLeads,
  createCampaign,
  sendCampaign,
  listLeadGroups,
} from "@/services/crmService";
import { LEAD_TYPES } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChannelBadge, StatusPill } from "@/components/crm-ui";
import { Plus, Send, Check, MessageSquare, Mail, MessageCircle, Eye, UsersRound, Reply } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/campaigns")({
  component: CampaignsPage,
});

const STEPS = ["Channel", "Audience", "Template", "Review"];

type RecipientFilter = "all" | "delivered" | "failed" | "pending";
type AudienceMode = "group" | "manual";
type DetailTab = "recipients" | "replies";

function CampaignsPage() {
  const { user, organization } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadGroups, setLeadGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("group");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [audienceType, setAudienceType] = useState<string>("all");
  const [draft, setDraft] = useState<any>({ name: "", channel: "sms", leadIds: [] as string[], templateId: "" });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>("all");
  const [detailTab, setDetailTab] = useState<DetailTab>("recipients");

  const refreshGroups = () => {
    if (!organization?.id) {
      setLeadGroups([]);
      return;
    }
    listLeadGroups(organization.id).then(setLeadGroups).catch(() => setLeadGroups([]));
  };

  const load = () => {
    if (!user) return;
    getCampaigns(organization?.id ?? null, user.role).then(setCampaigns);
    getTemplates(organization?.id ?? null, user.role).then(setTemplates);
    getLeads(organization?.id ?? null, user.role).then(setLeads);
    refreshGroups();
  };
  useEffect(load, [user, organization]);

  const openDetail = async (campaignId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setRecipientFilter("all");
    setDetailTab("recipients");
    try {
      const data = await getCampaign(campaignId);
      setDetail(data);
    } catch (e: any) {
      toast.error(e?.message || "Could not load campaign details");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredRecipients = useMemo(() => {
    const list = detail?.recipients ?? [];
    if (recipientFilter === "all") return list;
    if (recipientFilter === "delivered") return list.filter((r: any) => r.status === "delivered" || r.status === "sent");
    if (recipientFilter === "failed") return list.filter((r: any) => r.status === "failed");
    return list.filter((r: any) => r.status === "pending");
  }, [detail, recipientFilter]);

  const selectedGroup = useMemo(
    () => leadGroups.find((g) => g.id === selectedGroupId) ?? null,
    [leadGroups, selectedGroupId],
  );

  if (!user) return null;

  const resetWizard = () => {
    setStep(0);
    setDraft({ name: "", channel: "sms", leadIds: [], templateId: "" });
    setSelectedGroupId("");
    setAudienceMode("group");
    setAudienceType("all");
  };

  const applyGroup = (groupId: string) => {
    const g = leadGroups.find((x) => x.id === groupId);
    if (!g) return;
    setSelectedGroupId(groupId);
    setDraft((prev: typeof draft) => ({ ...prev, leadIds: [...(g.leadIds ?? [])] }));
  };

  const goNext = () => {
    if (step === 1) {
      if (audienceMode === "group" && !selectedGroupId) {
        toast.error("Select a lead group");
        return;
      }
      if (draft.leadIds.length === 0) {
        toast.error(audienceMode === "group" ? "Selected group has no members" : "Select at least one lead");
        return;
      }
    }
    setStep(step + 1);
  };
  const channelTemplates = templates.filter((t) => {
    if (t.channel !== draft.channel) return false;
    if (draft.channel === "whatsapp") return !t.status || t.status === "APPROVED";
    return true;
  });

  const saveAndSend = async (schedule: boolean) => {
    if (!organization?.id) { toast.error("Select an organization"); return; }
    if (!draft.name || !draft.templateId || draft.leadIds.length === 0) { toast.error("Complete all steps"); return; }
    try {
      const c = await createCampaign(organization.id, draft);
      await sendCampaign(c.id, { schedule });
      if (schedule) {
        toast.success("Campaign scheduled");
      } else {
        toast.success(draft.channel === "whatsapp" ? "WhatsApp campaign sent" : "Campaign sent");
      }
      setOpen(false); resetWizard(); load();
    } catch (e: any) {
      toast.error(e?.message || "Could not send campaign");
    }
  };

  const templateName = (templateId: string) =>
    templates.find((t) => t.id === templateId)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"} · click a row for recipient details
          </p>
        </div>
        <Sheet open={open} onOpenChange={(v) => {
          setOpen(v);
          if (v) refreshGroups();
          if (!v) resetWizard();
        }}>
          <SheetTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New Campaign</Button></SheetTrigger>
          <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0 lg:max-w-3xl">
            <SheetHeader className="border-b px-6 py-4 text-left">
              <SheetTitle>Create Campaign</SheetTitle>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="flex items-center gap-2 mb-4">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                      <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold",
                        i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/20 text-primary border border-primary" : "bg-muted text-muted-foreground")}>
                        {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </div>
                      <div className={cn("text-xs font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</div>
                      {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
                    </div>
                  ))}
                </div>

                <div className="min-h-[240px]">
                  {step === 0 && (
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Campaign Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Spring Promo" /></div>
                      <div className="space-y-2">
                        <Label>Channel</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { id: "sms", label: "SMS", icon: MessageSquare, color: "var(--sms)" },
                            { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "var(--whatsapp)" },
                            { id: "email", label: "Email", icon: Mail, color: "var(--email)" },
                          ].map((c) => {
                            const Icon = c.icon;
                            const active = draft.channel === c.id;
                            return (
                              <button key={c.id} type="button" onClick={() => setDraft({ ...draft, channel: c.id, templateId: "" })}
                                className={cn("rounded-xl border p-4 text-left transition-all", active ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border hover:bg-muted/50")}>
                                <Icon className="h-5 w-5 mb-2" style={{ color: c.color }} />
                                <div className="font-medium text-sm">{c.label}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div className="flex gap-2 p-1 rounded-lg bg-muted/50">
                        <button
                          type="button"
                          onClick={() => {
                            setAudienceMode("group");
                            if (selectedGroupId) applyGroup(selectedGroupId);
                          }}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                            audienceMode === "group"
                              ? "bg-background shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <UsersRound className="h-4 w-4" />
                          Lead group
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAudienceMode("manual");
                            setSelectedGroupId("");
                          }}
                          className={cn(
                            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition",
                            audienceMode === "manual"
                              ? "bg-background shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          Pick leads manually
                        </button>
                      </div>

                      {audienceMode === "group" && (
                        <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/20">
                          <div className="space-y-2">
                            <Label>Select lead group</Label>
                            {leadGroups.length > 0 ? (
                              <Select
                                value={selectedGroupId || undefined}
                                onValueChange={applyGroup}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a group" />
                                </SelectTrigger>
                                <SelectContent>
                                  {leadGroups.map((g) => (
                                    <SelectItem key={g.id} value={g.id}>
                                      {g.name} — {g.memberCount ?? g.leadIds?.length ?? 0} members
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No groups yet. Go to <strong>Leads</strong>, select contacts, and click <strong>Save group</strong>.
                              </p>
                            )}
                          </div>

                          {selectedGroup && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{selectedGroup.name}</span>
                                <span className="text-muted-foreground">
                                  {draft.leadIds.length} recipient{draft.leadIds.length === 1 ? "" : "s"}
                                </span>
                              </div>
                              <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y bg-background">
                                {draft.leadIds.map((id: string) => {
                                  const l = leads.find((x) => x.id === id);
                                  if (!l) {
                                    return (
                                      <div key={id} className="px-3 py-2 text-xs text-muted-foreground">
                                        {id} (removed or unavailable)
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={id} className="px-3 py-2">
                                      <div className="text-sm font-medium">{l.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {draft.channel === "email" ? l.email || "—" : l.phone || "—"}
                                      </div>
                                    </div>
                                  );
                                })}
                                {draft.leadIds.length === 0 && (
                                  <div className="p-4 text-sm text-muted-foreground text-center">This group has no members</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {audienceMode === "manual" && (
                      <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Label>Select audience ({draft.leadIds.length} selected)</Label>
                        <div className="flex items-center gap-2">
                          <Select value={audienceType} onValueChange={setAudienceType}>
                            <SelectTrigger className="w-full sm:w-40 h-8"><SelectValue placeholder="Filter by type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All types</SelectItem>
                              {LEAD_TYPES.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {(() => {
                            const visible = leads.filter((l) => audienceType === "all" || (l.type ?? "lead") === audienceType);
                            const allSelected = visible.length > 0 && visible.every((l) => draft.leadIds.includes(l.id));
                            return (
                              <Button type="button" variant="outline" size="sm" onClick={() => {
                                if (allSelected) {
                                  setDraft({ ...draft, leadIds: draft.leadIds.filter((id: string) => !visible.some((l) => l.id === id)) });
                                } else {
                                  const merged = Array.from(new Set([...draft.leadIds, ...visible.map((l) => l.id)]));
                                  setDraft({ ...draft, leadIds: merged });
                                }
                              }}>{allSelected ? "Clear" : "Select all"}</Button>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="border border-border rounded-lg max-h-72 overflow-y-auto divide-y">
                        {leads
                          .filter((l) => audienceType === "all" || (l.type ?? "lead") === audienceType)
                          .map((l) => {
                            const checked = draft.leadIds.includes(l.id);
                            return (
                              <label key={l.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                                <input type="checkbox" checked={checked} onChange={(e) => {
                                  setDraft({ ...draft, leadIds: e.target.checked ? [...draft.leadIds, l.id] : draft.leadIds.filter((x: string) => x !== l.id) });
                                }} />
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{l.name}</div>
                                  <div className="text-xs text-muted-foreground">{draft.channel === "email" ? l.email : l.phone}</div>
                                </div>
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{l.type ?? "lead"}</span>
                              </label>
                            );
                          })}
                        {leads.filter((l) => audienceType === "all" || (l.type ?? "lead") === audienceType).length === 0 && <div className="p-4 text-sm text-muted-foreground">No leads match this filter</div>}
                      </div>
                      </div>
                      )}
                    </div>
                  )}
                  {step === 2 && (
                    <div className="space-y-2">
                      <Label>Choose template</Label>
                      <div className="space-y-2">
                        {channelTemplates.map((t) => (
                          <button key={t.id} type="button" onClick={() => setDraft({ ...draft, templateId: t.id })}
                            className={cn("w-full text-left rounded-lg border p-3 transition", draft.templateId === t.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:bg-muted/50")}>
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-sm">{t.name}</div>
                              <ChannelBadge channel={t.channel} />
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.body}</div>
                            {draft.channel === "whatsapp" && (t.variables_count ?? 0) > 0 && (
                              <div className="text-[10px] text-muted-foreground mt-1">
                                Auto-fills {t.variables_count} var(s) from lead data
                              </div>
                            )}
                          </button>
                        ))}
                        {channelTemplates.length === 0 && <p className="text-sm text-muted-foreground">No templates for this channel. Create one first.</p>}
                      </div>
                    </div>
                  )}
                  {step === 3 && (
                    <div className="space-y-3 text-sm">
                      <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-2">
                        <Row k="Name" v={draft.name} />
                        <Row k="Channel" v={<ChannelBadge channel={draft.channel} />} />
                        {selectedGroup && audienceMode === "group" && (
                          <Row k="Group" v={`${selectedGroup.name} (${draft.leadIds.length} members)`} />
                        )}
                        <Row k="Recipients" v={`${draft.leadIds.length} leads`} />
                        <Row k="Template" v={templates.find((t) => t.id === draft.templateId)?.name ?? "—"} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <SheetFooter className="mt-auto flex-shrink-0 gap-2 border-t px-6 py-4">
                {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
                {step < 3 && <Button onClick={goNext}>Next</Button>}
                {step === 3 && (
                  <>
                    <Button variant="outline" onClick={() => saveAndSend(true)}>Schedule</Button>
                    <Button onClick={() => saveAndSend(false)}><Send className="h-4 w-4 mr-1" />Send Now</Button>
                  </>
                )}
              </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3 text-right">Recipients</th>
                <th className="px-4 py-3 text-right">Sent</th>
                <th className="px-4 py-3 text-right">Delivered</th>
                <th className="px-4 py-3 text-right">Failed</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-border hover:bg-muted/30 cursor-pointer"
                  onClick={() => openDetail(c.id)}
                >
                  <td className="px-4 py-3 font-medium max-w-[12rem] truncate" title={c.name}>
                    {c.name}
                  </td>
                  <td className="px-4 py-3">
                    <ChannelBadge channel={c.channel} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[10rem] truncate" title={templateName(c.templateId)}>
                    {templateName(c.templateId)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {c.leadIds?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{c.sent ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-[var(--success)]">
                    {c.delivered ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-destructive">
                    {c.failed ?? 0}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{c.createdAt ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(c.id);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Details</span>
                    </Button>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    No campaigns yet. Create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0 sm:max-w-xl lg:max-w-2xl">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle>{detail?.name ?? "Campaign details"}</SheetTitle>
            <SheetDescription>
              {detailLoading
                ? "Loading…"
                : detail
                  ? `${detail.leadIds?.length ?? 0} recipients · ${detail.template_name || "—"}`
                  : ""}
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading campaign…</div>
          ) : detail ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="px-6 py-4 border-b border-border space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <ChannelBadge channel={detail.channel} />
                  <StatusPill status={detail.status} />
                  <span className="text-xs text-muted-foreground">Created {detail.createdAt}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <StatBox label="Sent" value={detail.sent} />
                  <StatBox label="Delivered" value={detail.delivered} className="text-[var(--success)]" />
                  <StatBox label="Failed" value={detail.failed} className="text-destructive" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant={detailTab === "recipients" ? "default" : "outline"}
                    onClick={() => setDetailTab("recipients")}
                  >
                    Recipients
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={detailTab === "replies" ? "default" : "outline"}
                    onClick={() => setDetailTab("replies")}
                    className="gap-1"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    Replies
                    <span className="text-xs opacity-80">({detail.replies?.length ?? 0})</span>
                  </Button>
                </div>
                {detailTab === "recipients" && (
                <div className="flex gap-2 flex-wrap">
                  {([
                    ["all", "All"],
                    ["delivered", "Delivered"],
                    ["failed", "Failed"],
                    ["pending", "Pending"],
                  ] as const).map(([key, label]) => (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={recipientFilter === key ? "default" : "outline"}
                      onClick={() => setRecipientFilter(key)}
                    >
                      {label}
                      <span className="ml-1.5 text-xs opacity-80">
                        ({key === "all"
                          ? detail.recipients?.length ?? 0
                          : detail.recipients?.filter((r: any) =>
                              key === "delivered"
                                ? r.status === "delivered" || r.status === "sent"
                                : r.status === key,
                            ).length ?? 0})
                      </span>
                    </Button>
                  ))}
                </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {detailTab === "replies" ? (
                  (detail.replies ?? []).length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground space-y-2">
                      <Reply className="h-8 w-8 mx-auto opacity-40" />
                      <p>No replies yet for this campaign.</p>
                      <p className="text-xs">
                        WhatsApp, SMS, and email replies appear here when your provider webhook is configured in Settings.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {(detail.replies ?? []).map((r: any) => (
                        <ReplyRow key={r.id} reply={r} />
                      ))}
                    </div>
                  )
                ) : filteredRecipients.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No recipients in this filter.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">Recipient</th>
                          <th className="px-4 py-2.5">Contact</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Sent at</th>
                          <th className="px-4 py-2.5">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecipients.map((r: any) => (
                          <RecipientTableRow key={r.leadId} recipient={r} channel={detail.channel} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatBox({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 py-3">
      <div className={cn("text-xl font-bold", className)}>{value}</div>
      <div className="text-[10px] uppercase text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function ReplyRow({ reply }: { reply: any }) {
  const when = reply.createdAt
    ? new Date(reply.createdAt).toLocaleString()
    : "—";

  return (
    <div className="px-5 py-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{reply.leadName || reply.fromAddress || "Unknown"}</span>
            <ChannelBadge channel={reply.channel} />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{reply.fromAddress}</div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{when}</span>
      </div>
      {reply.subject && (
        <div className="text-xs font-medium text-muted-foreground">Subject: {reply.subject}</div>
      )}
      <p className="text-sm whitespace-pre-wrap rounded-lg bg-muted/40 border border-border px-3 py-2">
        {reply.textBody || "—"}
      </p>
    </div>
  );
}

function RecipientTableRow({ recipient, channel }: { recipient: any; channel: string }) {
  const contact = channel === "email" ? recipient.email : recipient.phone;
  const status = recipient.status ?? "pending";

  return (
    <tr className="border-t border-border hover:bg-muted/20">
      <td className="px-4 py-2.5 font-medium">{recipient.leadName || "Unknown"}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{contact || "—"}</td>
      <td className="px-4 py-2.5">
        <RecipientStatusBadge status={status} />
      </td>
      <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
        {recipient.sentAt && status !== "pending"
          ? new Date(recipient.sentAt).toLocaleString()
          : "—"}
      </td>
      <td className="px-4 py-2.5 text-xs text-destructive max-w-[14rem] truncate" title={recipient.error}>
        {recipient.error || "—"}
      </td>
    </tr>
  );
}

function RecipientStatusBadge({ status }: { status: string }) {
  const label =
    status === "delivered" || status === "sent"
      ? "Delivered"
      : status === "failed"
        ? "Failed"
        : "Pending";
  const className =
    status === "delivered" || status === "sent"
      ? "bg-[var(--success)]/10 text-[var(--success)]"
      : status === "failed"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";

  return (
    <span className={cn("text-[10px] font-medium uppercase tracking-wide px-2 py-1 rounded-full shrink-0", className)}>
      {label}
    </span>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}
