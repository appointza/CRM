import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUsers, createUser, updateUser } from "@/services/crmService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/users")({
  component: UsersPage,
});

const emptyForm = () => ({ name: "", email: "", role: "staff", password: "" });

function UsersPage() {
  const { user, organization } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => { if (user) getUsers(organization?.id ?? null, user.role).then(setUsers); };
  useEffect(load, [user, organization]);
  if (!user) return null;

  const isEdit = !!editingId;
  const editingUser = users.find((u) => u.id === editingId);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (u: any) => {
    setEditingId(u.id);
    setForm({ name: u.name ?? "", email: u.email ?? "", role: u.role ?? "staff", password: "" });
    setOpen(true);
  };

  const onSheetOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setEditingId(null);
      setForm(emptyForm());
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id && !isEdit) { toast.error("Select an organization"); return; }
    try {
      if (isEdit && editingId) {
        const patch: Record<string, string> = {
          name: form.name,
          email: form.email,
          role: form.role,
        };
        if (form.password.trim()) patch.password = form.password.trim();
        await updateUser(editingId, patch);
        toast.success("User updated");
      } else {
        await createUser(organization!.id, {
          name: form.name,
          email: form.email,
          role: form.role,
        });
        toast.success("User invited");
      }
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      load();
    } catch (err: any) {
      toast.error(err?.message || "Could not save user");
    }
  };

  const roleColor: Record<string, string> = {
    super_admin: "bg-primary/10 text-primary",
    org_admin: "bg-[var(--info)]/10 text-[var(--info)]",
    staff: "bg-muted text-muted-foreground",
  };

  const canEdit = (u: any) => u.role !== "super_admin" || user.role === "super_admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">Team members & roles</p>
        </div>
        <Sheet open={open} onOpenChange={onSheetOpenChange}>
          <SheetTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Invite User</Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex h-full max-h-screen flex-col gap-0 overflow-hidden p-0">
            <SheetHeader className="border-b px-6 py-4 text-left">
              <SheetTitle>{isEdit ? "Edit user" : "Invite user"}</SheetTitle>
            </SheetHeader>
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select
                    value={form.role}
                    disabled={editingUser?.role === "super_admin"}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                  >
                    <option value="staff">Staff</option>
                    <option value="org_admin">Org Admin</option>
                    {user.role === "super_admin" && <option value="super_admin">Super Admin</option>}
                  </select>
                </div>
                {isEdit && (
                  <div className="space-y-2">
                    <Label>New password</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Leave blank to keep current password"
                      autoComplete="new-password"
                    />
                  </div>
                )}
              </div>
              <SheetFooter className="mt-auto border-t px-6 py-4">
                <Button type="submit">{isEdit ? "Save changes" : "Send invite"}</Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Org</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>{u.name.charAt(0)}</div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${roleColor[u.role] ?? roleColor.staff}`}>
                      {u.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[8rem] truncate" title={u.organization_id}>{u.organization_id ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {canEdit(u) ? (
                      <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No users yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
