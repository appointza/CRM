import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { register } from "@/services/crmService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const [form, setForm] = useState({ orgName: "", adminName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await register(form);
      setSession(result.user, result.organization, result.accessToken ?? null);
      toast.success("Organization created");
      navigate({ to: "/app" });
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--gradient-subtle)]">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-lg)] space-y-5">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg">PulseCRM</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold">Create your workspace</h2>
          <p className="text-sm text-muted-foreground">Start a new organization in seconds.</p>
        </div>
        <div className="space-y-2"><Label>Organization Name</Label><Input value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Admin Name</Label><Input value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
        <p className="text-sm text-center text-muted-foreground">Have an account? <a href="/login" className="text-primary font-medium hover:underline">Sign in</a></p>
      </form>
    </div>
  );
}
