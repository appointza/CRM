import { apiFetch } from "@/services/crmApi";

/** Local AI (Ollama via the .NET server). Nothing leaves the machine. */
export async function getAiHealth() {
  const res = await apiFetch("/api/Ai/Health");
  return res?.item ?? res;
}

function toLeadPayload(lead) {
  if (!lead) return null;
  return {
    name: lead.name ?? "",
    businessName: lead.businessName ?? "",
    ownerName: lead.ownerName ?? "",
    category: lead.category ?? "",
    website: lead.website ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    address: lead.address ?? "",
    city: lead.city ?? "",
    state: lead.state ?? "",
    type: lead.type ?? "",
    tags: Array.isArray(lead.tags) ? lead.tags.join(", ") : (lead.tags ?? ""),
    notes: typeof lead.notes === "string" ? lead.notes : "",
    source: lead.source ?? "",
  };
}

/** @param {{prompt: string, systemPrompt?: string, model?: string, lead?: any}} args */
export async function aiChat({ prompt, systemPrompt, model, lead }) {
  const res = await apiFetch("/api/Ai/Chat", {
    method: "POST",
    body: JSON.stringify({
      item: { prompt, systemPrompt: systemPrompt || null, model: model || null, lead: toLeadPayload(lead) },
    }),
  });
  return res?.item ?? res;
}

export async function getBusinessProfile() {
  const res = await apiFetch("/api/Ai/BusinessProfile");
  return res?.item ?? res;
}

export async function saveBusinessProfile(profile) {
  const res = await apiFetch("/api/Ai/BusinessProfile", {
    method: "POST",
    body: JSON.stringify({ item: profile }),
  });
  return res?.item ?? res;
}
