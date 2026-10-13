import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { login } from "@/services/crmService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("admin@acme.com");
  const [password, setPassword] = useState("demo");
  const [loading, setLoading] = useState(false);
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login({ email, password });
      setSession(result.user, result.organization, result.accessToken ?? null);
      toast.success(`Welcome back, ${result.user.name}`);
      navigate({ to: "/app" });
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg">PulseCRM</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Reach every lead, on every channel.</h1>
          <p className="mt-4 text-white/80 max-w-md">SMS, WhatsApp & Email campaigns in one multi-tenant workspace built for modern sales teams.</p>
        </div>
        <div className="text-xs text-white/70">© 2026 PulseCRM — Demo</div>
      </div>
      <div className="flex items-center justify-center p-6 bg-background">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="text-sm text-muted-foreground">Your workspace is resolved from your account.</p>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <div className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/40 p-3 space-y-1">
            <div><b>admin@acme.com</b> / demo — Org Admin</div>
            <div><b>staff@acme.com</b> / demo — Staff</div>
            <div><b>super@crm.app</b> / demo — Super Admin (default org)</div>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            No account? <a href="/register" className="text-primary font-medium hover:underline">Register</a>
          </p>
        </form>
      </div>
    </div>
  );
}
