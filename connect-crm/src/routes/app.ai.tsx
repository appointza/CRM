import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getLeads } from "@/services/crmService";
import { getApiErrorMessage } from "@/services/crmApi";
import { aiChat, getAiHealth } from "@/services/aiService";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ai")({
  component: AiAssistantPage,
});

const NO_LEAD = "__none__";

const QUICK_PROMPTS = [
  { label: "Summarize lead", prompt: "Summarize this lead in 3 bullet points and list what information is still missing." },
  { label: "Outreach message", prompt: "Write a short, polite WhatsApp intro message to this lead. Do not invent facts or prices." },
  { label: "Discovery questions", prompt: "Suggest 5 discovery questions to ask this lead to understand their needs." },
];

function AiAssistantPage() {
  const { user, organization } = useAuth();
  const [health, setHealth] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadId, setLeadId] = useState(NO_LEAD);
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [meta, setMeta] = useState<{ model: string; durationMs: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      setHealth(await getAiHealth());
    } catch (err) {
      setHealth({ available: false, error: getApiErrorMessage(err) });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  useEffect(() => {
    if (!user) return;
    getLeads(organization?.id ?? null, user.role)
      .then((rows: any) => setLeads(Array.isArray(rows) ? rows : []))
      .catch((err) => toast.error(getApiErrorMessage(err)));
  }, [user, organization]);

  if (!user) return null;

  const lead = leads.find((l) => l.id === leadId) ?? null;

  const run = async () => {
    if (!prompt.trim()) return toast.error("Enter a prompt first");
    setBusy(true);
    setReply("");
    setMeta(null);
    try {
      const res = await aiChat({ prompt, lead });
      setReply(res.reply);
      setMeta({ model: res.model, durationMs: res.durationMs });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const statusText = checking
    ? "Checking local AI…"
    : !health?.available
      ? health?.error || "Local AI is not reachable"
      : !health.defaultModelInstalled
        ? `Ollama is running, but model "${health.defaultModel}" is not installed`
        : `Ready — ${health.defaultModel}`;
  const ready = !!health?.available && !!health?.defaultModelInstalled;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Runs on your own machine through Ollama. Lead data is not sent to any cloud AI service.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={checkHealth} disabled={checking}>
          <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} /> Check status
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${ready ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-sm">{statusText}</span>
        {health?.models?.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">Installed: {health.models.join(", ")}</span>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="space-y-2">
          <Label>Lead (optional context)</Label>
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger><SelectValue placeholder="Select a lead" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LEAD}>No lead</SelectItem>
              {leads.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.businessName || l.name}{l.city ? ` — ${l.city}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((q) => (
            <Button key={q.label} variant="secondary" size="sm" onClick={() => setPrompt(q.prompt)}>
              {q.label}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Prompt</Label>
          <Textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask the assistant about this lead…"
          />
        </div>

        <Button onClick={run} disabled={busy || !ready}>
          <Sparkles className="h-4 w-4 mr-2" /> {busy ? "Thinking…" : "Generate"}
        </Button>
      </div>

      {(reply || busy) && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Label>Response (editable)</Label>
            {meta && (
              <span className="text-xs text-muted-foreground">
                {meta.model} · {(meta.durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <Textarea rows={10} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Generating…" />
          <Button
            variant="outline"
            size="sm"
            disabled={!reply}
            onClick={() => { navigator.clipboard.writeText(reply); toast.success("Copied"); }}
          >
            <Copy className="h-4 w-4 mr-2" /> Copy
          </Button>
          <p className="text-xs text-muted-foreground">
            AI-generated draft. Review and edit before sending to a customer.
          </p>
        </div>
      )}
    </div>
  );
}
