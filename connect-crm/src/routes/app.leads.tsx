import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getLeads, createLead, updateLead, transitionLead, addLeadNote, listReferenceValues, bulkImportLeads, createLeadGroup, getLeadReplies } from "@/services/crmService";
import { getApiErrorMessage } from "@/services/crmApi";
import { LEAD_TYPES, LEAD_TRANSITIONS, LEAD_CATEGORIES, LEAD_SOURCES } from "@/data/mockData";
import {
  REFERENCE_VALUE_LEAD_TYPE,
  REFERENCE_VALUE_LEAD_STAGE,
  REFERENCE_VALUE_LEAD_SOURCE,
  buildStageTransitions,
  refOptionLabel,
  referenceCategoryLabel,
} from "@/constants/referenceValueCategories";
import { parseLeadsImportCsv, BULK_LEAD_CSV_TEMPLATE } from "@/lib/parseLeadsImportCsv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, MoreHorizontal, Clock, ArrowRight, StickyNote, Pencil, Upload, FileDown, UsersRound, Reply } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LeadPlacesSearch, type PlaceLeadFields } from "@/components/LeadPlacesSearch";
import { SalesQuickNav } from "@/components/SalesQuickNav";

export const Route = createFileRoute("/app/leads")({
  component: () => <LeadsPage audience="leads" />,
});

export type LeadsAudience = "leads" | "customers";

const TYPE_STYLES: Record<string, string> = {
  lead: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  prospect: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  call: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  customer: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  discontinued: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  loss: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function labelOf(id: string, options?: Array<{ id: string; label: string }>) {
  return (options ?? []).find((t) => t.id === id)?.label ?? id;
}

function leadSearchBlob(
  l: Record<string, unknown>,
  categoryRefs: Array<{ code: string; referenceValue: string; referenceCode: string }>,
  sourceOptions: Array<{ id: string; label: string }>,
) {
  const cat = l.category as string | undefined;
  let catText = "";
  if (cat) {
    const r = categoryRefs.find((x) => x.code === cat);
    if (r) catText = [r.referenceValue, r.code, r.referenceCode].filter(Boolean).join(" ");
    else catText = LEAD_CATEGORIES.find((c) => c.id === cat)?.label ?? cat;
  }
  const src = l.source as string | undefined;
  const srcText = src ? labelOf(src, sourceOptions) : "";
  return [
    l.name,
    l.email,
    l.phone,
    l.businessName,
    l.ownerName,
    catText,
    srcText,
    l.source,
    l.website,
    l.mapsUrl,
    l.address,
    l.pinCode,
    l.area,
    l.city,
    l.state,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildEmptyLeadForm(defaultCategory: string) {
  return {
    name: "",
    phone: "",
    email: "",
    businessName: "",
    ownerName: "",
    category: defaultCategory,
    website: "",
    mapsUrl: "",
    address: "",
    pinCode: "",
    area: "",
    city: "",
    state: "",
    type: "lead",
    source: "manual",
    tags: "",
  };
}

function leadToForm(lead: any) {
  return {
    name: lead.name ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    businessName: lead.businessName ?? "",
    ownerName: lead.ownerName ?? "",
    category: lead.category || "",
    website: lead.website ?? "",
    mapsUrl: lead.mapsUrl ?? "",
    address: lead.address ?? "",
    pinCode: lead.pinCode ?? "",
    area: lead.area ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
    type: lead.type ?? "lead",
    source: lead.source ?? "manual",
    tags: (lead.tags ?? []).join(", "),
  };
}

function SourcePill({ source, options }: { source?: string; options: Array<{ id: string; label: string; colorCode?: string }> }) {
  const id = source ?? "manual";
  const opt = options.find((o) => o.id === id);
  const color = opt?.colorCode;
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={
        color
          ? { backgroundColor: `${color}22`, color }
          : undefined
      }
    >
      {labelOf(id, options)}
    </span>
  );
}

function TypePill({ type, options }: { type?: string; options: Array<{ id: string; label: string; colorCode?: string }> }) {
  const t = type ?? "lead";
  const opt = options.find((o) => o.id === t);
  const color = opt?.colorCode;
  return (
    <span
      className={cn(
        "text-[11px] font-medium px-2 py-0.5 rounded-full capitalize",
        !color && (TYPE_STYLES[t] ?? "bg-muted text-muted-foreground"),
      )}
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
    >
      {labelOf(t, options)}
    </span>
  );
}

function fmt(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

type TimelineEntry =
  | { kind: "stage"; at: string; from: string | null; to: string; reason?: string; key: string }
  | { kind: "note"; at: string; text: string; key: string }
  | { kind: "reply"; at: string; text: string; channel: string; subject?: string; key: string };

function mergedTimeline(lead: any, replies: any[] = []): TimelineEntry[] {
  const stages: TimelineEntry[] = (lead?.stageHistory ?? []).map((ev: any, i: number) => ({
    kind: "stage",
    at: ev.at,
    from: ev.from ?? null,
    to: ev.to,
    reason: ev.reason,
    key: `stage-${i}-${ev.at}`,
  }));
  const notes: TimelineEntry[] = (lead?.notes ?? []).map((n: any) => ({
    kind: "note",
    at: n.at,
    text: n.text,
    key: `note-${n.id}`,
  }));
  const inbound: TimelineEntry[] = replies.map((r: any) => ({
    kind: "reply",
    at: r.createdAt,
    text: r.textBody,
    channel: r.channel,
    subject: r.subject,
    key: `reply-${r.id}`,
  }));
  return [...stages, ...notes, ...inbound].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function LeadsPage({ audience = "leads" }: { audience?: LeadsAudience }) {
  const isCustomersView = audience === "customers";
  const { user, organization } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [form, setForm] = useState(() => buildEmptyLeadForm(LEAD_CATEGORIES[0]?.id ?? "turf"));
  const [refValues, setRefValues] = useState<any[]>([]);

  const businessCategoryRefs = useMemo(
    () => refValues.filter((r) => r.category === REFERENCE_VALUE_LEAD_TYPE),
    [refValues],
  );
  const stageRefs = useMemo(
    () => refValues.filter((r) => r.category === REFERENCE_VALUE_LEAD_STAGE),
    [refValues],
  );
  const sourceRefs = useMemo(
    () => refValues.filter((r) => r.category === REFERENCE_VALUE_LEAD_SOURCE),
    [refValues],
  );

  const stageOptions = useMemo(() => {
    if (stageRefs.length > 0) {
      return stageRefs.map((r) => ({
        id: r.code,
        label: refOptionLabel(r),
        colorCode: r.colorCode,
      }));
    }
    return LEAD_TYPES.map((t: any) => ({ id: t.id, label: t.label }));
  }, [stageRefs]);

  const sourceOptions = useMemo(() => {
    if (sourceRefs.length > 0) {
      return sourceRefs.map((r) => ({
        id: r.code,
        label: refOptionLabel(r),
        colorCode: r.colorCode,
      }));
    }
    return LEAD_SOURCES.map((s) => ({ id: s.id, label: s.label }));
  }, [sourceRefs]);

  const stageTransitions = useMemo(() => {
    const map = buildStageTransitions(stageRefs);
    return Object.keys(map).length > 0 ? map : LEAD_TRANSITIONS;
  }, [stageRefs]);

  const stageLabel = useCallback(
    (id?: string) => labelOf(id ?? "lead", stageOptions),
    [stageOptions],
  );

  const customerStageCode = useMemo(
    () => stageOptions.find((o) => o.id === "customer")?.id ?? "customer",
    [stageOptions],
  );

  // Transition dialog state
  const [moveLead, setMoveLead] = useState<any | null>(null);
  const [moveTo, setMoveTo] = useState<string>("");
  const [moveReason, setMoveReason] = useState("");

  // Timeline dialog
  const [timelineLead, setTimelineLead] = useState<any | null>(null);
  const [timelineReplies, setTimelineReplies] = useState<any[]>([]);

  // Notes dialog
  const [notesLead, setNotesLead] = useState<any | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkPreview, setBulkPreview] = useState<ReturnType<typeof parseLeadsImportCsv>["rows"]>([]);
  const [bulkWarnings, setBulkWarnings] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saveGroupOpen, setSaveGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupBusy, setGroupBusy] = useState(false);

  const categoryOptions = useMemo(() => {
    if (businessCategoryRefs.length > 0) {
      return businessCategoryRefs.map((r) => ({
        value: r.code,
        label: refOptionLabel(r),
      }));
    }
    return LEAD_CATEGORIES.map((c) => ({ value: c.id, label: c.label }));
  }, [businessCategoryRefs]);

  const defaultCategory = categoryOptions[0]?.value ?? "";

  const resolveCategoryLabel = useCallback(
    (id?: string) => {
      if (!id) return "—";
      const r = businessCategoryRefs.find((x) => x.code === id);
      if (r) return refOptionLabel(r);
      return LEAD_CATEGORIES.find((c) => c.id === id)?.label ?? id;
    },
    [businessCategoryRefs],
  );

  const formCategoryChoices = useMemo(() => {
    const base = categoryOptions;
    if (form.category && !base.some((o) => o.value === form.category)) {
      return [{ value: form.category, label: `${form.category} (saved)` }, ...base];
    }
    return base;
  }, [categoryOptions, form.category]);

  const applyBulkPreview = useCallback(() => {
    const { rows, warnings } = parseLeadsImportCsv(bulkText, {
      defaultCategory: defaultCategory || "",
    });
    setBulkPreview(rows);
    setBulkWarnings(warnings);
  }, [bulkText, defaultCategory]);

  const load = () => {
    if (!user) return;
    getLeads(organization?.id ?? null, user.role)
      .then(setLeads)
      .catch((e: unknown) => toast.error(getApiErrorMessage(e)));
  };
  useEffect(() => { load(); }, [user, organization]);

  useEffect(() => {
    if (!organization?.id) {
      setRefValues([]);
      return;
    }
    listReferenceValues(organization.id)
      .then(setRefValues)
      .catch((e: unknown) => toast.error(getApiErrorMessage(e)));
  }, [organization?.id]);

  if (!user) return null;

  const runBulkImport = async () => {
    if (!organization?.id) {
      toast.error("Select an organization");
      return;
    }
    if (bulkPreview.length === 0) {
      toast.error("Parse the CSV first — no rows ready to import.");
      return;
    }
    setBulkBusy(true);
    try {
      const res = await bulkImportLeads(organization.id, bulkPreview);
      if (res.failed > 0) {
        toast.warning(`Imported ${res.created}, ${res.failed} row(s) failed`);
      } else {
        toast.success(`Imported ${res.created} lead(s)`);
      }
      setBulkOpen(false);
      setBulkText("");
      setBulkPreview([]);
      setBulkWarnings([]);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Import failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const downloadBulkTemplate = () => {
    const blob = new Blob([BULK_LEAD_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = leads.filter((l) => {
    const matchesQ = leadSearchBlob(l, businessCategoryRefs, sourceOptions).includes(q.toLowerCase());
    const matchesType = isCustomersView
      ? (l.type ?? "lead") === customerStageCode
      : typeFilter === "all" || (l.type ?? "lead") === typeFilter;
    const matchesSource =
      sourceFilter === "all" || (l.source ?? "manual") === sourceFilter;
    const matchesCategory =
      categoryFilter === "all" ||
      (categoryFilter === "__uncategorized" ? !l.category : l.category === categoryFilter);
    return matchesQ && matchesType && matchesSource && matchesCategory;
  });

  const filteredIds = useMemo(() => filtered.map((l) => l.id), [filtered]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
  const someFilteredSelected = filteredIds.some((id) => selectedIds.includes(id));

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }
  };

  const openSaveGroup = () => {
    setGroupName("");
    setSaveGroupOpen(true);
  };

  const submitGroup = async () => {
    if (!organization?.id) {
      toast.error("Select an organization");
      return;
    }
    const name = groupName.trim();
    if (!name) {
      toast.error("Enter a group name");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Select at least one lead");
      return;
    }
    setGroupBusy(true);
    try {
      await createLeadGroup(organization.id, { name, leadIds: selectedIds });
      toast.success("Group created");
      setSaveGroupOpen(false);
      setGroupName("");
    } catch (e: any) {
      toast.error(e?.message || "Could not save group");
    } finally {
      setGroupBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) { toast.error("Select an organization"); return; }
    const { tags: tagsInput, ...fields } = form;
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      ...fields,
      tags,
      ...(isCustomersView ? { type: customerStageCode } : {}),
    };
    try {
      if (editingLeadId) {
        await updateLead(editingLeadId, payload);
        toast.success(isCustomersView ? "Customer updated" : "Lead updated");
      } else {
        await createLead(organization.id, payload);
        toast.success(isCustomersView ? "Customer added" : "Lead added");
      }
      setOpen(false);
      setEditingLeadId(null);
      setForm(buildEmptyLeadForm(defaultCategory));
      load();
    } catch (err: any) {
      toast.error(err.message || "Could not save lead");
    }
  };

  const openNewLead = () => {
    setEditingLeadId(null);
    setForm({
      ...buildEmptyLeadForm(defaultCategory),
      type: isCustomersView ? customerStageCode : (stageOptions[0]?.id ?? "lead"),
      source: sourceOptions[0]?.id ?? "manual",
    });
    setOpen(true);
  };

  const openEditLead = (lead: any) => {
    setEditingLeadId(lead.id);
    setForm(leadToForm(lead));
    setOpen(true);
  };

  const onSheetOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setEditingLeadId(null);
      setForm(buildEmptyLeadForm(defaultCategory));
    }
  };

  const openMove = (lead: any, to: string) => {
    setMoveLead(lead);
    setMoveTo(to);
    setMoveReason("");
  };

  const confirmMove = async () => {
    if (!moveLead || !moveTo) return;
    try {
      await transitionLead(moveLead.id, moveTo, { reason: moveReason, byUserId: user.id });
      toast.success(`Moved ${moveLead.name} → ${stageLabel(moveTo)}`);
      setMoveLead(null); setMoveTo(""); setMoveReason("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Transition failed");
    }
  };

  const quickSwitchType = async (lead: any, to: string) => {
    if (to === "loss" || to === "discontinued") {
      openMove(lead, to);
      return;
    }
    try {
      await transitionLead(lead.id, to, { byUserId: user.id });
      toast.success(`${lead.name} → ${stageLabel(to)}`);
      load();
    } catch (err: any) {
      toast.error(err.message || "Could not change type");
    }
  };

  const openNotes = (lead: any) => {
    setNotesLead(lead);
    setNoteDraft("");
  };

  const saveNote = async () => {
    if (!notesLead) return;
    const text = noteDraft.trim();
    if (!text) {
      toast.error("Enter a note");
      return;
    }
    try {
      const updated = await addLeadNote(notesLead.id, { text, byUserId: user.id });
      setNotesLead(updated);
      setLeads((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setNoteDraft("");
      toast.success("Note added");
    } catch (err: any) {
      toast.error(err.message || "Could not save note");
    }
  };

  return (
    <div className="space-y-6">
      {!isCustomersView && (
        <SalesQuickNav active="leads" />
      )}
      {isCustomersView && (
        <SalesQuickNav active="customers" />
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{isCustomersView ? "Customers" : "Leads"}</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {isCustomersView ? "customer" : "contact"}{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={isCustomersView ? "Search customers..." : "Search leads..."}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          {!isCustomersView && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {stageOptions.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sourceOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="__uncategorized">Uncategorized</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" asChild>
            <Link to="/app/groups">
              <UsersRound className="h-4 w-4 mr-1" />
              Groups
            </Link>
          </Button>
          {selectedIds.length > 0 && (
            <Button type="button" variant="secondary" onClick={() => openSaveGroup()}>
              Save group ({selectedIds.length})
            </Button>
          )}
          <Button type="button" variant="outline" onClick={openNewLead}>
            <Plus className="h-4 w-4 mr-1" />{isCustomersView ? "Add Customer" : "Add Lead"}
          </Button>
          {!isCustomersView && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setBulkOpen(true);
            }}
          >
            <Upload className="h-4 w-4 mr-1" />
            Import CSV
          </Button>
          )}
          <Sheet open={open} onOpenChange={onSheetOpenChange}>
            <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0">
              <SheetHeader className="space-y-1 border-b px-6 py-4 text-left">
                <SheetTitle>{editingLeadId ? (isCustomersView ? "Edit customer" : "Edit lead") : (isCustomersView ? "New customer" : "New lead")}</SheetTitle>
              </SheetHeader>
              <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
                  {!editingLeadId && !isCustomersView && organization?.id && (
                    <LeadPlacesSearch
                      orgId={organization.id}
                      onApply={(fields: PlaceLeadFields) => {
                        setForm((prev) => ({
                          ...prev,
                          ...fields,
                          name: fields.name || prev.name,
                          businessName: fields.businessName || prev.businessName,
                        }));
                      }}
                    />
                  )}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Name</Label>
                        <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rajesh Kumar" />
                      </div>
                      <div className="space-y-2">
                        <Label>Mobile number</Label>
                        <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="raj@gmail.com" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-border pt-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Business name</Label>
                        <Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Green Turf Arena" />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Owner name</Label>
                        <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="Suresh" />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                          <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                          <SelectContent>
                            {formCategoryChoices.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="www.example.com" />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Google Maps link</Label>
                        <Input value={form.mapsUrl} onChange={(e) => setForm({ ...form, mapsUrl: e.target.value })} placeholder="https://maps.google.com/..." />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-border pt-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Velachery, Chennai" rows={2} className="resize-y min-h-[60px]" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>PIN code</Label>
                        <Input value={form.pinCode} onChange={(e) => setForm({ ...form, pinCode: e.target.value })} placeholder="600042" />
                      </div>
                      <div className="space-y-2">
                        <Label>Area</Label>
                        <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Velachery" />
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Chennai" />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Tamil Nadu" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-border pt-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CRM</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {!isCustomersView && (
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {stageOptions.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      )}
                      <div className="space-y-2">
                        <Label>Lead source</Label>
                        <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {sourceOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Tags (comma separated)</Label>
                        <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="vip, trial" />
                      </div>
                    </div>
                  </div>
                </div>
                <SheetFooter className="mt-auto border-t px-6 py-4">
                  <Button type="submit">{editingLeadId ? "Save changes" : "Save"}</Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
          <Sheet
            open={bulkOpen}
            onOpenChange={(v) => {
              setBulkOpen(v);
              if (!v) {
                setBulkText("");
                setBulkPreview([]);
                setBulkWarnings([]);
              }
            }}
          >
            <SheetContent side="right" className="flex h-full max-h-screen w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
              <SheetHeader className="space-y-2 border-b px-6 py-4 text-left">
                <SheetTitle>Bulk import leads</SheetTitle>
                <SheetDescription className="text-left text-sm">
                  CSV with a header row. Required column: <span className="font-medium text-foreground">name</span>.
                  Optional: phone, email, businessName, ownerName, category, website, mapsUrl, address, pinCode, area, city, state, type, source, tags.
                  If category is empty, rows use your first available category
                  {defaultCategory ? ` (${defaultCategory})` : ""}.
                </SheetDescription>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={downloadBulkTemplate}>
                    <FileDown className="h-4 w-4 mr-1" />
                    Download template
                  </Button>
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    className="h-9 max-w-[240px] cursor-pointer text-sm"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void f.text().then(setBulkText);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div className="flex min-h-0 flex-1 flex-col space-y-2">
                  <Label htmlFor="bulk-csv">CSV contents</Label>
                  <Textarea
                    id="bulk-csv"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Paste CSV here or choose a file…"
                    className="min-h-[140px] max-h-[36vh] flex-1 resize-y font-mono text-xs"
                  />
                  <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={applyBulkPreview}>
                    Parse &amp; preview
                  </Button>
                </div>
                {bulkWarnings.length > 0 && (
                  <ul className="max-h-24 list-disc space-y-0.5 overflow-y-auto pl-4 text-xs text-muted-foreground">
                    {bulkWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
                {bulkPreview.length > 0 && (
                  <div className="min-h-0 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Preview: {bulkPreview.length} row(s)
                    </p>
                    <div className="max-h-[26vh] overflow-auto rounded-lg border border-border text-xs">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-muted/80">
                          <tr>
                            <th className="px-2 py-1.5 text-left">Name</th>
                            <th className="px-2 py-1.5 text-left">Phone</th>
                            <th className="px-2 py-1.5 text-left">Category</th>
                            <th className="px-2 py-1.5 text-left">City</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkPreview.slice(0, 25).map((r, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-2 py-1">{r.name}</td>
                              <td className="px-2 py-1">{r.phone || "—"}</td>
                              <td className="px-2 py-1">{r.category || "—"}</td>
                              <td className="px-2 py-1">{r.city || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {bulkPreview.length > 25 && (
                      <p className="text-xs text-muted-foreground">Showing first 25 of {bulkPreview.length} rows.</p>
                    )}
                  </div>
                )}
              </div>
              <SheetFooter className="mt-auto gap-2 border-t px-6 py-4 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={runBulkImport}
                  disabled={bulkBusy || bulkPreview.length === 0}
                >
                  {bulkBusy ? "Importing…" : `Import ${bulkPreview.length} lead(s)`}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                    onCheckedChange={toggleSelectAllFiltered}
                    aria-label="Select all filtered leads"
                  />
                </th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Source</th>
                {!isCustomersView && <th className="px-4 py-3">Type</th>}
                <th className="px-4 py-3">{isCustomersView ? "Status" : "Switch type"}</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">City / State</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const allowed = stageTransitions[l.type ?? "lead"] || [];
                const last = l.stageHistory?.[l.stageHistory.length - 1];
                return (
                  <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.includes(l.id)}
                        onCheckedChange={(v) => toggleSelect(l.id, v === true)}
                        aria-label={`Select ${l.name}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{l.name}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[10rem] truncate" title={l.businessName}>{l.businessName || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {l.category ? (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          {resolveCategoryLabel(l.category)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3"><SourcePill source={l.source} options={sourceOptions} /></td>
                    {!isCustomersView && (
                      <td className="px-4 py-3"><TypePill type={l.type} options={stageOptions} /></td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[12rem]">
                        {allowed.length === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {allowed.map((to) => (
                          <Button
                            key={to}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => quickSwitchType(l, to)}
                          >
                            {stageLabel(to)}
                          </Button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{l.phone || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[9rem] truncate" title={l.email}>{l.email || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {[l.city, l.state].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{l.createdAt}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmt(last?.at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 px-2 sm:px-3"
                          onClick={() => openEditLead(l)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => openEditLead(l)}>
                            <Pencil className="h-4 w-4 mr-2" />Edit lead
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setTimelineLead(l);
                            getLeadReplies(l.id).then(setTimelineReplies).catch(() => setTimelineReplies([]));
                          }}>
                            <Clock className="h-4 w-4 mr-2" />View timeline
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openNotes(l)}>
                            <StickyNote className="h-4 w-4 mr-2" />Notes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs">Convert to</DropdownMenuLabel>
                          {allowed.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">No transitions available</div>
                          )}
                          {allowed.map((to) => (
                            <DropdownMenuItem key={to} onClick={() => openMove(l, to)}>
                              <ArrowRight className="h-4 w-4 mr-2" />{stageLabel(to)}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={isCustomersView ? 12 : 13} className="px-4 py-12 text-center text-muted-foreground">
                  {isCustomersView ? "No customers yet. Convert a lead or add one directly." : "No leads found"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm transition */}
      <Sheet open={!!moveLead} onOpenChange={(v) => !v && setMoveLead(null)}>
        <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="space-y-2 border-b px-6 py-4 text-left">
            <SheetTitle>Convert lead</SheetTitle>
            <SheetDescription>
              {moveLead && (
                <span className="flex items-center gap-2 mt-1">
                  <span className="font-medium text-foreground">{moveLead.name}</span>
                  <TypePill type={moveLead.type} options={stageOptions} />
                  <ArrowRight className="h-3 w-3" />
                  <TypePill type={moveTo} options={stageOptions} />
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
              <Label>Reason / note (optional)</Label>
              <Textarea
                rows={3}
                placeholder={moveTo === "loss" || moveTo === "discontinued" ? "Why is this happening?" : "Add a note for the timeline"}
                value={moveReason}
                onChange={(e) => setMoveReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">A timestamped event will be added to this lead's history.</p>
            </div>
            <SheetFooter className="mt-auto border-t px-6 py-4">
              <Button variant="outline" onClick={() => setMoveLead(null)}>Cancel</Button>
              <Button onClick={confirmMove}>Confirm</Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      {/* Notes */}
      <Sheet
        open={!!notesLead}
        onOpenChange={(v) => {
          if (!v) {
            setNotesLead(null);
            setNoteDraft("");
          }
        }}
      >
        <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0">
          <SheetHeader className="space-y-2 border-b px-6 py-4 text-left">
            <SheetTitle>Notes</SheetTitle>
            <SheetDescription>
              {notesLead && (
                <span className="flex items-center gap-2 mt-1">
                  <span className="font-medium text-foreground">{notesLead.name}</span>
                  <TypePill type={notesLead.type} options={stageOptions} />
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="lead-note">New note</Label>
                <Textarea
                  id="lead-note"
                  rows={3}
                  placeholder="Add a note…"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      saveNote();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">Press Ctrl+Enter to save.</p>
              </div>
              <Button type="button" className="w-full sm:w-auto" onClick={saveNote}>
                Add note
              </Button>
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">History</p>
                <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-1">
                  {(notesLead?.notes ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No notes yet.</p>
                  )}
                  {(notesLead?.notes ?? [])
                    .slice()
                    .reverse()
                    .map((n: { id: string; at: string; text: string }) => (
                      <div key={n.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                        <div className="text-xs text-muted-foreground">{fmt(n.at)}</div>
                        <div className="mt-1 whitespace-pre-wrap">{n.text}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Timeline */}
      <Sheet open={!!timelineLead} onOpenChange={(v) => { if (!v) { setTimelineLead(null); setTimelineReplies([]); } }}>
        <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0">
          <SheetHeader className="space-y-2 border-b px-6 py-4 text-left">
            <SheetTitle>Lifecycle timeline</SheetTitle>
            <SheetDescription>
              {timelineLead && (
                <span className="flex flex-col gap-1 mt-1">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{timelineLead.name}</span>
                    <TypePill type={timelineLead.type} options={stageOptions} />
                  </span>
                  <span className="text-xs">Stage changes and notes — most recent first.</span>
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-3">
              {(() => {
                const entries = timelineLead ? mergedTimeline(timelineLead, timelineReplies) : [];
                if (entries.length === 0) {
                  return <div className="text-sm text-muted-foreground text-center py-6">No history yet.</div>;
                }
                return entries.map((entry, i) => (
                  <div key={entry.key} className="flex gap-3">
                    <div className="mt-1 flex flex-col items-center">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          entry.kind === "note"
                            ? "bg-amber-500"
                            : entry.kind === "reply"
                              ? "bg-[var(--whatsapp)]"
                              : "bg-primary"
                        )}
                      />
                      {i < entries.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[12px]" />}
                    </div>
                    <div className="flex-1 pb-3">
                      {entry.kind === "stage" ? (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            {entry.from ? (
                              <>
                                <TypePill type={entry.from} options={stageOptions} />
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">Created as</span>
                            )}
                            <TypePill type={entry.to} options={stageOptions} />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{fmt(entry.at)}</div>
                          {entry.reason && <div className="text-sm mt-1">{entry.reason}</div>}
                        </>
                      ) : entry.kind === "reply" ? (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <Reply className="h-3.5 w-3.5 text-[var(--whatsapp)]" />
                            <span className="font-medium capitalize">{entry.channel} reply</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{fmt(entry.at)}</div>
                          {entry.subject && (
                            <div className="text-xs text-muted-foreground mt-1">Subject: {entry.subject}</div>
                          )}
                          <div className="text-sm mt-1 whitespace-pre-wrap rounded-lg bg-muted/40 border border-border px-3 py-2">
                            {entry.text}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <StickyNote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            <span className="font-medium">Note</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{fmt(entry.at)}</div>
                          <div className="text-sm mt-1 whitespace-pre-wrap">{entry.text}</div>
                        </>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={saveGroupOpen} onOpenChange={(v) => { setSaveGroupOpen(v); if (!v) setGroupName(""); }}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Save as group</SheetTitle>
            <SheetDescription>
              {selectedIds.length} lead{selectedIds.length === 1 ? "" : "s"} selected. Manage groups on the Groups screen.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label>Group name</Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Chennai prospects"
              />
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" asChild>
              <Link to="/app/groups">Open Groups</Link>
            </Button>
            <Button onClick={submitGroup} disabled={groupBusy}>
              {groupBusy ? "Saving…" : "Create group"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
