import { apiFetch, apiFetchPublic } from "./crmApi";

/** Every call uses crmApi → apiUrl() → API_BASE_URL in src/config/apiConfig.js. */

export async function login({ email, password }) {
  const res = await apiFetchPublic("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return {
    user: res.user,
    organization: res.organization,
    accessToken: res.access_token,
  };
}

export async function register({ orgName, adminName, email, password }) {
  const res = await apiFetchPublic("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      orgName,
      adminName,
      email,
      password,
    }),
  });
  return {
    user: res.user,
    organization: res.organization,
    accessToken: res.access_token,
  };
}

export async function listOrganizations() {
  return apiFetchPublic("/auth/organizations");
}

export async function listTenants() {
  return apiFetch("/tenants");
}

export async function createTenant(payload) {
  return apiFetch("/tenants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteTenant(orgId) {
  await apiFetch(`/tenants/${encodeURIComponent(orgId)}`, { method: "DELETE" });
  return true;
}

export async function getDashboardStats(_orgId, _role) {
  return apiFetch("/dashboard/stats");
}

export async function getLeads(_orgId, _role) {
  return apiFetch("/leads");
}

export async function createLead(_orgId, data) {
  return apiFetch("/leads", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function bulkImportLeads(leads) {
  return apiFetch("/leads/bulk", {
    method: "POST",
    body: JSON.stringify({ leads }),
  });
}

export async function saveLeadsFromPlaces(places) {
  return apiFetch("/leads/from-places", {
    method: "POST",
    body: JSON.stringify({ places }),
  });
}

export async function deleteLead(leadId) {
  return apiFetch(`/leads/${encodeURIComponent(leadId)}`, {
    method: "DELETE",
  });
}

export async function updateLead(leadId, patch) {
  return apiFetch(`/leads/${encodeURIComponent(leadId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function transitionLead(leadId, toType, { reason, byUserId } = {}) {
  return apiFetch(`/leads/${encodeURIComponent(leadId)}/transition`, {
    method: "POST",
    body: JSON.stringify({ toType, reason, byUserId }),
  });
}

export async function addLeadNote(leadId, { text, byUserId } = {}) {
  return apiFetch(`/leads/${encodeURIComponent(leadId)}/notes`, {
    method: "POST",
    body: JSON.stringify({ text, byUserId }),
  });
}

export async function getTemplates(_orgId, _role) {
  return apiFetch("/templates");
}

export async function createTemplate(_orgId, data) {
  return apiFetch("/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(id, patch) {
  return apiFetch(`/templates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function syncWhatsAppTemplates() {
  return apiFetch("/templates/sync-whatsapp", { method: "POST", body: JSON.stringify({}) });
}

export async function createWhatsAppTemplate(data) {
  return apiFetch("/templates/whatsapp", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function sendWhatsAppMessage(data) {
  return apiFetch("/whatsapp/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getCampaigns(_orgId, _role) {
  return apiFetch("/campaigns");
}

export async function getCampaign(id) {
  return apiFetch(`/campaigns/${encodeURIComponent(id)}`);
}

export async function createCampaign(_orgId, data) {
  return apiFetch("/campaigns", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      channel: data.channel,
      templateId: data.templateId,
      leadIds: data.leadIds || [],
    }),
  });
}

export async function sendCampaign(id, { schedule = false } = {}) {
  return apiFetch(`/campaigns/${encodeURIComponent(id)}/send`, {
    method: "POST",
    body: JSON.stringify({ schedule }),
  });
}

export async function getReports(_orgId, _role) {
  const rows = await apiFetch("/campaigns");
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    channel: c.channel,
    sent: c.sent,
    delivered: c.delivered,
    failed: c.failed,
    status: c.status,
  }));
}

export async function getBilling(_orgId, _role) {
  return apiFetch("/billing");
}

export async function getUsers(_orgId, _role) {
  return apiFetch("/users");
}

export async function createUser(_orgId, data) {
  return apiFetch("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateUser(id, patch) {
  return apiFetch(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function getOrganization(orgId) {
  return apiFetch(`/organizations/${encodeURIComponent(orgId)}`);
}

export async function updateOrganization(orgId, patch) {
  return apiFetch(`/organizations/${encodeURIComponent(orgId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function getChannelConfig(orgId) {
  return apiFetch(`/organizations/${encodeURIComponent(orgId)}/channel-config`);
}

export async function updateChannelConfig(orgId, channel, patch) {
  return apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/channel-config/${encodeURIComponent(channel)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
  );
}

export async function verifyChannel(orgId, channel) {
  return apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/channel-config/${encodeURIComponent(channel)}/verify`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export async function searchPlaces(orgId, query, lat, lng) {
  const params = new URLSearchParams({ query });
  if (lat != null && lat !== "") params.set("lat", String(lat));
  if (lng != null && lng !== "") params.set("lng", String(lng));
  return apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/places/search?${params.toString()}`,
  );
}

export async function getPlaceDetails(orgId, placeId) {
  return apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/places/${encodeURIComponent(placeId)}`,
  );
}

export async function getGoogleMapsConfig(orgId) {
  return apiFetch(`/organizations/${encodeURIComponent(orgId)}/google-maps-config`);
}

export async function geocodeAddress(orgId, address) {
  const params = new URLSearchParams({ address });
  return apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/places/geocode?${params.toString()}`,
  );
}

export async function getApiKeys(orgId) {
  return apiFetch(`/organizations/${encodeURIComponent(orgId)}/api-keys`);
}

export async function createApiKey(orgId, label) {
  return apiFetch(`/organizations/${encodeURIComponent(orgId)}/api-keys`, {
    method: "POST",
    body: JSON.stringify({ label }),
  });
}

export async function revokeApiKey(orgId, id) {
  await apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/api-keys/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  return true;
}

export async function listReferenceValues(orgId) {
  return apiFetch(`/organizations/${encodeURIComponent(orgId)}/reference-values`);
}

export async function createReferenceValue(orgId, body) {
  return apiFetch(`/organizations/${encodeURIComponent(orgId)}/reference-values`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateReferenceValue(orgId, refId, body) {
  return apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/reference-values/${encodeURIComponent(refId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function deleteReferenceValue(orgId, refId) {
  await apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/reference-values/${encodeURIComponent(refId)}`,
    { method: "DELETE" },
  );
  return true;
}

export async function listLeadGroups(orgId) {
  return apiFetch(`/organizations/${encodeURIComponent(orgId)}/lead-groups`);
}

export async function createLeadGroup(orgId, body) {
  return apiFetch(`/organizations/${encodeURIComponent(orgId)}/lead-groups`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateLeadGroup(orgId, groupId, body) {
  return apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/lead-groups/${encodeURIComponent(groupId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}

export async function deleteLeadGroup(orgId, groupId) {
  await apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/lead-groups/${encodeURIComponent(groupId)}`,
    { method: "DELETE" },
  );
  return true;
}

export async function getLeadReplies(leadId) {
  return apiFetch(`/leads/${encodeURIComponent(leadId)}/replies`);
}

export async function getOrgInbox(orgId, params = {}) {
  const q = new URLSearchParams();
  if (params.channel) q.set("channel", params.channel);
  if (params.leadId) q.set("leadId", params.leadId);
  const qs = q.toString();
  return apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/inbox${qs ? `?${qs}` : ""}`,
  );
}

export async function getChatThreads(orgId, channel = "whatsapp") {
  return apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/chat/threads?channel=${encodeURIComponent(channel)}`,
  );
}

export async function getChatContacts(orgId, channel = "whatsapp") {
  return apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/chat/contacts?channel=${encodeURIComponent(channel)}`,
  );
}

export async function getChatThread(orgId, leadId, channel = "whatsapp") {
  return apiFetch(
    `/organizations/${encodeURIComponent(orgId)}/chat/threads/${encodeURIComponent(leadId)}?channel=${encodeURIComponent(channel)}`,
  );
}

export async function sendChatMessage(orgId, body) {
  return apiFetch(`/organizations/${encodeURIComponent(orgId)}/chat/send`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function topUpWallet(_orgId, amount) {
  return apiFetch("/billing/top-up", {
    method: "POST",
    body: JSON.stringify({ amount: Number(amount) }),
  });
}
