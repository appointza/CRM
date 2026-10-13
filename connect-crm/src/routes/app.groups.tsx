import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getLeads,
  listLeadGroups,
  createLeadGroup,
  updateLeadGroup,
  deleteLeadGroup,
} from "@/services/crmService";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Trash2,
  UserPlus,
  UserMinus,
  UsersRound,
  Pencil,
  Megaphone,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SalesQuickNav } from "@/components/SalesQuickNav";

export const Route = createFileRoute("/app/groups")({
  component: GroupsPage,
});

type LeadRow = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
};

function leadBlob(l: LeadRow) {
  return [l.name, l.email, l.phone].filter(Boolean).join(" ").toLowerCase();
}

function GroupsPage() {
  const { user, organization } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [pickerIds, setPickerIds] = useState<string[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [memberBusy, setMemberBusy] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");

  const load = useCallback(async () => {
    if (!organization?.id || !user) return;
    setLoading(true);
    try {
      const [g, l] = await Promise.all([
        listLeadGroups(organization.id),
        getLeads(organization.id, user.role),
      ]);
      setGroups(g);
      setLeads(l);
    } catch (e: any) {
      toast.error(e?.message || "Could not load groups");
    } finally {
      setLoading(false);
    }
  }, [organization?.id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const leadMap = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter((g) => g.name?.toLowerCase().includes(q));
  }, [groups, search]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const resolveMembers = useCallback(
    (group: { leadIds?: string[] }) =>
      (group.leadIds ?? []).map((id: string) => {
        const lead = leadMap.get(id);
        return lead ?? { id, name: "Unknown lead", email: "", phone: "" };
      }),
    [leadMap],
  );

  const pickerLeads = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return leads.filter((l) => !q || leadBlob(l).includes(q));
  }, [leads, pickerSearch]);

  const openCreate = () => {
    setEditingGroupId(null);
    setGroupName("");
    setPickerIds([]);
    setPickerSearch("");
    setCreateOpen(true);
  };

  const openEditName = (group: any) => {
    setEditingGroupId(group.id);
    setGroupName(group.name ?? "");
    setEditNameOpen(true);
  };

  const submitCreate = async () => {
    if (!organization?.id) {
      toast.error("Select an organization");
      return;
    }
    const name = groupName.trim();
    if (!name) {
      toast.error("Enter a group name");
      return;
    }
    if (pickerIds.length === 0) {
      toast.error("Select at least one lead");
      return;
    }
    setBusy(true);
    try {
      const created = await createLeadGroup(organization.id, {
        name,
        leadIds: pickerIds,
      });
      toast.success("Group created");
      setCreateOpen(false);
      await load();
      setSelectedGroupId(created.id);
    } catch (e: any) {
      toast.error(e?.message || "Could not create group");
    } finally {
      setBusy(false);
    }
  };

  const submitRename = async () => {
    if (!organization?.id || !editingGroupId) return;
    const name = groupName.trim();
    if (!name) {
      toast.error("Enter a group name");
      return;
    }
    setBusy(true);
    try {
      await updateLeadGroup(organization.id, editingGroupId, { name });
      toast.success("Group renamed");
      setEditNameOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not rename group");
    } finally {
      setBusy(false);
    }
  };

  const removeGroup = async (groupId: string) => {
    if (!organization?.id) return;
    if (!confirm("Delete this group? Campaigns already sent are not affected.")) return;
    try {
      await deleteLeadGroup(organization.id, groupId);
      toast.success("Group deleted");
      if (selectedGroupId === groupId) setSelectedGroupId(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not delete group");
    }
  };

  const updateMembers = async (groupId: string, leadIds: string[]) => {
    if (!organization?.id) return;
    setMemberBusy(true);
    try {
      await updateLeadGroup(organization.id, groupId, { leadIds });
      toast.success("Members updated");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Could not update members");
    } finally {
      setMemberBusy(false);
    }
  };

  const removeMember = async (group: any, leadId: string) => {
    const next = (group.leadIds ?? []).filter((id: string) => id !== leadId);
    if (next.length === 0) {
      toast.error("A group must have at least one member");
      return;
    }
    await updateMembers(group.id, next);
  };

  const addMember = async (group: any, leadId: string) => {
    const ids = group.leadIds ?? [];
    if (ids.includes(leadId)) return;
    await updateMembers(group.id, [...ids, leadId]);
    setAddMemberSearch("");
    setAddingMember(false);
  };

  const togglePicker = (id: string, checked: boolean) => {
    setPickerIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
  };

  if (!user) return null;

  const members = selectedGroup ? resolveMembers(selectedGroup) : [];
  const memberIds = new Set(selectedGroup?.leadIds ?? []);
  const addQuery = addMemberSearch.trim().toLowerCase();
  const addCandidates = leads
    .filter((l) => !memberIds.has(l.id))
    .filter((l) => !addQuery || leadBlob(l).includes(addQuery))
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <SalesQuickNav active="groups" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersRound className="h-7 w-7 text-primary" />
            Lead groups
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize leads into audiences for campaigns
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> New group
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 min-h-0 lg:min-h-[calc(100dvh-12rem)]">
        {/* Group list */}
        <div
          className={cn(
            "flex flex-col rounded-2xl border border-border bg-card/80 shadow-[var(--shadow-sm)] overflow-hidden",
            "w-full lg:w-80 shrink-0",
            selectedGroupId && "max-lg:hidden",
          )}
        >
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <Input
                placeholder="Search groups…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-lg:max-h-none lg:max-h-[calc(100dvh-16rem)]">
            {loading && (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            )}
            {!loading && filteredGroups.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No groups yet. Create one to get started.
              </div>
            )}
            {filteredGroups.map((g) => {
              const count = g.memberCount ?? g.leadIds?.length ?? 0;
              const active = selectedGroupId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroupId(g.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border transition",
                    active ? "bg-primary/10" : "hover:bg-muted/50",
                  )}
                >
                  <div className="font-medium truncate">{g.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {count} member{count === 1 ? "" : "s"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Group detail */}
        <div
          className={cn(
            "flex-1 rounded-2xl border border-border bg-card/80 shadow-[var(--shadow-sm)] overflow-hidden flex flex-col min-h-[320px]",
            !selectedGroupId && "max-lg:hidden",
          )}
        >
          {!selectedGroup ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground p-8 text-center">
              Select a group to view members, or create a new group.
            </div>
          ) : (
            <>
              <div className="border-b border-border px-4 py-3 flex items-start gap-2">
                <button
                  type="button"
                  className="lg:hidden shrink-0 mt-0.5 p-1 rounded-md hover:bg-muted"
                  onClick={() => setSelectedGroupId(null)}
                  aria-label="Back to groups"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold truncate">{selectedGroup.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {members.length} members · created {selectedGroup.createdAt}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => openEditName(selectedGroup)}
                    aria-label="Rename group"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeGroup(selectedGroup.id)}
                    aria-label="Delete group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      setAddingMember(true);
                      setAddMemberSearch("");
                    }}
                    disabled={addingMember}
                  >
                    <UserPlus className="h-4 w-4" /> Add member
                  </Button>
                  <Button type="button" variant="secondary" size="sm" asChild className="gap-1">
                    <Link to="/app/campaigns">
                      <Megaphone className="h-4 w-4" /> Use in campaign
                    </Link>
                  </Button>
                </div>

                {addingMember && (
                  <div className="rounded-xl border border-dashed border-border p-3 bg-muted/30 space-y-2">
                    <Label className="text-xs">Add lead to group</Label>
                    <Input
                      placeholder="Search by name, email, phone…"
                      value={addMemberSearch}
                      onChange={(e) => setAddMemberSearch(e.target.value)}
                      className="h-9"
                      autoFocus
                    />
                    <ul className="max-h-40 overflow-y-auto space-y-1">
                      {addCandidates.length === 0 && (
                        <li className="text-xs text-muted-foreground py-2 text-center">
                          No matching leads
                        </li>
                      )}
                      {addCandidates.map((l) => (
                        <li key={l.id}>
                          <button
                            type="button"
                            className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                            disabled={memberBusy}
                            onClick={() => addMember(selectedGroup, l.id)}
                          >
                            <span className="font-medium">{l.name}</span>
                            <span className="text-xs text-muted-foreground block truncate">
                              {[l.email, l.phone].filter(Boolean).join(" · ") || "—"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setAddingMember(false);
                        setAddMemberSearch("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Members
                  </div>
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members in this group.</p>
                  ) : (
                    <ul className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                      {members.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-2 px-4 py-3 text-sm bg-background"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{m.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {[m.email, m.phone].filter(Boolean).join(" · ") || "—"}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-destructive h-8 w-8"
                            disabled={memberBusy}
                            onClick={() => removeMember(selectedGroup, m.id)}
                            aria-label={`Remove ${m.name}`}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create group */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle>New group</SheetTitle>
            <SheetDescription>
              Name your group and select leads to include.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label>Group name</Label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Chennai prospects"
              />
            </div>
            <div className="space-y-2">
              <Label>Members ({pickerIds.length} selected)</Label>
              <Input
                placeholder="Search leads…"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="h-9"
              />
              <ul className="max-h-[50vh] overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {pickerLeads.length === 0 && (
                  <li className="p-4 text-sm text-muted-foreground text-center">No leads found</li>
                )}
                {pickerLeads.map((l) => (
                  <li key={l.id}>
                    <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50">
                      <Checkbox
                        checked={pickerIds.includes(l.id)}
                        onCheckedChange={(c) => togglePicker(l.id, c === true)}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{l.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[l.email, l.phone].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <SheetFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={busy}>
              {busy ? "Creating…" : "Create group"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Rename */}
      <Sheet open={editNameOpen} onOpenChange={setEditNameOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Rename group</SheetTitle>
          </SheetHeader>
          <div className="py-6 space-y-2">
            <Label>Group name</Label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
            />
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditNameOpen(false)}>Cancel</Button>
            <Button onClick={submitRename} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
