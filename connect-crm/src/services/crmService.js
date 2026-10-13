// Single service layer that mediates all access to mock data.
// All functions return Promises and simulate latency.
import {
  organizations,
  users,
  leads,
  templates,
  campaigns,
  billing,
  messageTrend,
  channelConfigs,
  apiKeys,
} from "@/data/mockData";

import { normalizeReferenceValueCategory } from "@/constants/referenceValueCategories";
import { isApiMode } from "./crmApi";
import * as api from "./crmServiceApi";

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

// Clone helpers so callers cannot mutate the source data.
const clone = (v) => JSON.parse(JSON.stringify(v));

// Mutable in-memory stores (session-only).
const state = {
  organizations: clone(organizations),
  users: clone(users),
  leads: clone(leads),
  templates: clone(templates),
  campaigns: clone(campaigns),
  billing: clone(billing),
  channelConfigs: clone(channelConfigs),
  apiKeys: clone(apiKeys),
  /** @type {Record<string, any[]>} orgId → reference value rows */
  referenceValues: {},
  /** @type {Record<string, any[]>} orgId → lead group rows */
  leadGroups: {},
  /** @type {Record<string, any[]>} orgId → inbound replies */
  inboundMessages: {},
  /** @type {Record<string, string>} orgId → Google Maps API key (mock mode) */
  googleApiKeys: {},
};

// Demo inbound replies for offline/mock mode
state.inboundMessages.org_1 = [
  {
    id: "in_1",
    organization_id: "org_1",
    channel: "whatsapp",
    leadId: "l_1",
    fromAddress: "919876543210",
    textBody: "Yes, send me more details about the offer.",
    subject: "",
    eventType: "message",
    direction: "inbound",
    createdAt: "2025-04-23T10:30:00.000Z",
    leadName: "Rajesh Kumar",
  },
  {
    id: "in_2",
    organization_id: "org_1",
    channel: "sms",
    leadId: "l_2",
    fromAddress: "919988776655",
    textBody: "STOP",
    subject: "",
    eventType: "message",
    direction: "inbound",
    createdAt: "2025-04-20T14:00:00.000Z",
    leadName: "Priya Sharma",
  },
  {
    id: "in_3",
    organization_id: "org_1",
    channel: "email",
    leadId: "l_3",
    fromAddress: "suresh@green turf.in",
    textBody: "Please share pricing for the premium plan.",
    subject: "Re: Spring Promo",
    eventType: "message",
    direction: "inbound",
    createdAt: "2025-04-19T09:15:00.000Z",
    leadName: "Suresh Menon",
  },
];

const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

function scopeByOrg(collection, orgId, role) {
  if (role === "super_admin") return collection;
  return collection.filter((x) => x.organization_id === orgId);
}

export async function login({ email, password }) {
  if (isApiMode()) return api.login({ email, password });
  await delay();
  const user = state.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) throw new Error("Invalid credentials");
  let organization = null;
  if (user.role === "super_admin") {
    organization = state.organizations[0] ? clone(state.organizations[0]) : null;
  } else {
    const o = state.organizations.find((x) => x.id === user.organization_id);
    organization = o ? clone(o) : null;
  }
  return { user: clone(user), organization };
}

export async function register({ orgName, adminName, email, password }) {
  if (isApiMode()) return api.register({ orgName, adminName, email, password });
  await delay();
  if (state.users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
    throw new Error("Email already registered");
  const org = { id: uid("org"), name: orgName, plan: "Starter", createdAt: new Date().toISOString().slice(0, 10) };
  const user = { id: uid("u"), name: adminName, email, password, role: "org_admin", organization_id: org.id };
  state.organizations.push(org);
  state.users.push(user);
  state.billing[org.id] = { wallet: 2500, usage: { sms: 0, whatsapp: 0, email: 0 }, transactions: [] };
  state.referenceValues[org.id] = [];
  state.templates.push({ id: uid("t"), organization_id: org.id, channel: "sms", name: "Welcome", body: "Hi {{name}}, welcome!" });
  return { user: clone(user), organization: clone(org) };
}

export async function listOrganizations() {
  if (isApiMode()) return api.listOrganizations();
  await delay(200);
  return clone(state.organizations);
}

// Super-admin: aggregated tenant list with usage + user counts
export async function listTenants() {
  if (isApiMode()) return api.listTenants();
  await delay(250);
  return state.organizations.map((o) => {
    const userCount = state.users.filter((u) => u.organization_id === o.id).length;
    const leadCount = state.leads.filter((l) => l.organization_id === o.id).length;
    const campaignCount = state.campaigns.filter((c) => c.organization_id === o.id).length;
    const wallet = state.billing[o.id]?.wallet ?? 0;
    const cfg = state.channelConfigs[o.id] || {};
    return {
      ...clone(o),
      userCount, leadCount, campaignCount, wallet,
      channels: {
        email: !!cfg.email?.domainVerified,
        whatsapp: !!cfg.whatsapp?.verified,
        sms: !!cfg.sms?.dltEnabled,
      },
    };
  });
}

// Super-admin: create a new tenant org with optional admin user
export async function createTenant({ name, plan = "Starter", industry = "", country = "IN", adminName, adminEmail }) {
  if (isApiMode()) return api.createTenant({ name, plan, industry, country, adminName, adminEmail });
  await delay();
  if (!name) throw new Error("Organization name is required");
  const org = {
    id: uid("org"), name, plan, industry, country,
    timezone: "Asia/Kolkata", website: "", supportEmail: "", billingEmail: "",
    address: "", gstin: "",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  state.organizations.push(org);
  state.billing[org.id] = { wallet: 0, usage: { sms: 0, whatsapp: 0, email: 0 }, transactions: [] };
  state.apiKeys[org.id] = [];
  state.referenceValues[org.id] = [];
  if (adminEmail) {
    state.users.push({
      id: uid("u"), name: adminName || "Admin",
      email: adminEmail, password: "demo",
      role: "org_admin", organization_id: org.id,
    });
  }
  return clone(org);
}

export async function deleteTenant(orgId) {
  if (isApiMode()) return api.deleteTenant(orgId);
  await delay();
  state.organizations = state.organizations.filter((o) => o.id !== orgId);
  state.users = state.users.filter((u) => u.organization_id !== orgId);
  state.leads = state.leads.filter((l) => l.organization_id !== orgId);
  state.templates = state.templates.filter((t) => t.organization_id !== orgId);
  state.campaigns = state.campaigns.filter((c) => c.organization_id !== orgId);
  delete state.billing[orgId];
  delete state.channelConfigs[orgId];
  delete state.apiKeys[orgId];
  delete state.referenceValues[orgId];
  return true;
}

export async function getDashboardStats(orgId, role) {
  if (isApiMode()) return api.getDashboardStats(orgId, role);
  await delay();
  const l = scopeByOrg(state.leads, orgId, role);
  const c = scopeByOrg(state.campaigns, orgId, role);
  const totals = { sms: 0, whatsapp: 0, email: 0 };
  c.forEach((x) => { totals[x.channel] = (totals[x.channel] || 0) + (x.sent || 0); });
  const totalMessages = totals.sms + totals.whatsapp + totals.email;
  return {
    totalLeads: l.length,
    totalCampaigns: c.length,
    totalMessages,
    channels: totals,
    recent: clone(c.slice(-5).reverse()),
    trend: role === "super_admin"
      ? [0,1,2,3,4,5,6].map((i) => Object.values(messageTrend).reduce((s, arr) => s + arr[i], 0))
      : clone(messageTrend[orgId] || [0,0,0,0,0,0,0]),
  };
}

export async function getLeads(orgId, role) {
  if (isApiMode()) return api.getLeads(orgId, role);
  await delay();
  return clone(scopeByOrg(state.leads, orgId, role));
}

function createLeadInMockState(orgId, data) {
  const now = new Date().toISOString();
  const rawType = typeof data.type === "string" ? data.type.trim() : "";
  const type = rawType || "lead";
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const lead = {
    id: uid("l"),
    organization_id: orgId,
    tags,
    createdAt: now.slice(0, 10),
    name: data.name ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    businessName: data.businessName ?? "",
    ownerName: data.ownerName ?? "",
    category: data.category ?? "",
    website: data.website ?? "",
    mapsUrl: data.mapsUrl ?? "",
    address: data.address ?? "",
    pinCode: data.pinCode ?? "",
    area: data.area ?? "",
    city: data.city ?? "",
    state: data.state ?? "",
    type,
    source: data.source ?? "manual",
    notes: [],
    stageHistory: [{ from: null, to: type, at: now }],
  };
  state.leads.push(lead);
  return clone(lead);
}

export async function createLead(orgId, data) {
  if (isApiMode()) return api.createLead(orgId, data);
  await delay();
  return createLeadInMockState(orgId, data);
}

/** Import many leads; API: single request. Mock: one short delay + in-memory inserts. */
export async function bulkImportLeads(orgId, rows) {
  if (isApiMode()) return api.bulkImportLeads(rows);
  await delay(120);
  const created = [];
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      const name = String(rows[i]?.name ?? "").trim();
      if (!name) throw new Error("Name is required");
      created.push(createLeadInMockState(orgId, rows[i]));
    } catch (e) {
      errors.push({ index: i + 1, message: e?.message || String(e) });
    }
  }
  return {
    ok: true,
    created: created.length,
    failed: errors.length,
    errors,
    leads: created,
  };
}

export async function saveLeadsFromPlaces(orgId, places) {
  if (isApiMode()) return api.saveLeadsFromPlaces(places);
  await delay(200);
  const items = [];
  let created = 0;
  let skipped = 0;
  for (const p of places) {
    const payload = { ...p, tags: p.tags ?? [] };
    const phone = String(payload.phone ?? "").replace(/\D/g, "");
    const maps = String(payload.mapsUrl ?? "").trim().toLowerCase();
    const dup = state.leads.find((l) => {
      if (l.organization_id && l.organization_id !== orgId) return false;
      const lp = String(l.phone ?? "").replace(/\D/g, "");
      if (phone.length >= 8 && lp === phone) return true;
      const lm = String(l.mapsUrl ?? "").trim().toLowerCase();
      return maps && lm === maps;
    });
    if (dup) {
      skipped++;
      items.push({ placeId: p.placeId, status: "skipped", reason: "duplicate", leadId: dup.id });
      continue;
    }
    const row = createLeadInMockState(orgId, payload);
    created++;
    items.push({ placeId: p.placeId, status: "created", leadId: row.id });
  }
  return { ok: true, created, skipped, items };
}

export async function deleteLead(leadId) {
  if (isApiMode()) return api.deleteLead(leadId);
  await delay(150);
  const idx = state.leads.findIndex((l) => l.id === leadId);
  if (idx >= 0) state.leads.splice(idx, 1);
  return { ok: true, id: leadId };
}

/** Updates editable lead fields; preserves id, org, createdAt, notes, and stage history. */
export async function updateLead(leadId, patch) {
  if (isApiMode()) return api.updateLead(leadId, patch);
  await delay(200);
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error("Lead not found");
  const { tags, ...rest } = patch;
  Object.assign(lead, rest);
  if (tags !== undefined) lead.tags = tags;
  return clone(lead);
}

const ALLOWED_TRANSITIONS = {
  lead: ["prospect", "call", "loss"],
  prospect: ["call", "customer", "loss"],
  call: ["prospect", "customer", "loss"],
  customer: ["discontinued", "loss"],
  discontinued: ["customer", "loss"],
  loss: [],
};

export async function transitionLead(leadId, toType, opts = {}) {
  if (isApiMode()) return api.transitionLead(leadId, toType, opts);
  await delay(200);
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error("Lead not found");
  const from = lead.type || "lead";
  if (from === toType) return clone(lead);
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(toType)) {
    throw new Error(`Cannot move from "${from}" to "${toType}"`);
  }
  lead.type = toType;
  lead.stageHistory = lead.stageHistory || [];
  lead.stageHistory.push({
    from,
    to: toType,
    at: new Date().toISOString(),
    reason: opts.reason || undefined,
    byUserId: opts.byUserId || undefined,
  });
  return clone(lead);
}

export async function addLeadNote(leadId, { text, byUserId } = {}) {
  if (isApiMode()) return api.addLeadNote(leadId, { text, byUserId });
  await delay(150);
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error("Lead not found");
  const body = (text || "").trim();
  if (!body) throw new Error("Note cannot be empty");
  lead.notes = lead.notes || [];
  lead.notes.push({
    id: uid("ln"),
    at: new Date().toISOString(),
    text: body,
    byUserId: byUserId || undefined,
  });
  return clone(lead);
}

export async function getTemplates(orgId, role) {
  if (isApiMode()) return api.getTemplates(orgId, role);
  await delay();
  return clone(scopeByOrg(state.templates, orgId, role));
}

export async function createTemplate(orgId, data) {
  if (isApiMode()) return api.createTemplate(orgId, data);
  await delay();
  const tpl = { id: uid("t"), organization_id: orgId, ...data };
  state.templates.push(tpl);
  return clone(tpl);
}

export async function updateTemplate(id, patch) {
  if (isApiMode()) return api.updateTemplate(id, patch);
  await delay();
  const i = state.templates.findIndex((t) => t.id === id);
  if (i >= 0) state.templates[i] = { ...state.templates[i], ...patch };
  return clone(state.templates[i]);
}

export async function syncWhatsAppTemplates(orgId) {
  if (isApiMode()) return api.syncWhatsAppTemplates();
  await delay(500);
  if (!orgId) throw new Error("Organization required");
  return { fetched: 0, created: 0, updated: 0, templates: [] };
}

export async function createWhatsAppTemplate(orgId, data) {
  if (isApiMode()) return api.createWhatsAppTemplate(data);
  await delay(600);
  if (!orgId) throw new Error("Organization required");
  const name = data.name.replace(/\s+/g, "_").toLowerCase();
  const tpl = {
    id: uid("t"),
    organization_id: orgId,
    channel: "whatsapp",
    name,
    body: data.body,
    language: data.language || "en",
    category: data.category || "UTILITY",
    status: "PENDING",
    variables_count: (data.body.match(/\{\{\d+\}\}/g) || []).length,
    meta_id: "mock-meta-id",
  };
  state.templates.push(tpl);
  return clone(tpl);
}

export async function sendWhatsAppMessage(data) {
  if (isApiMode()) return api.sendWhatsAppMessage(data);
  await delay(400);
  return { ok: true, to: data.to, template: data.templateId, messageId: "mock-wa-msg" };
}

export async function getCampaigns(orgId, role) {
  if (isApiMode()) return api.getCampaigns(orgId, role);
  await delay();
  return clone(scopeByOrg(state.campaigns, orgId, role));
}

export async function getCampaign(id) {
  if (isApiMode()) return api.getCampaign(id);
  await delay();
  const c = state.campaigns.find((x) => x.id === id);
  if (!c) throw new Error("Campaign not found");
  return clone({
    ...c,
    template_name: state.templates.find((t) => t.id === c.templateId)?.name ?? "",
    recipients: (c.recipient_results ?? []).length
      ? c.recipient_results
      : (c.leadIds ?? []).map((leadId) => {
          const lead = state.leads.find((l) => l.id === leadId);
          return {
            leadId,
            leadName: lead?.name ?? "Unknown",
            phone: lead?.phone ?? "",
            email: lead?.email ?? "",
            status: c.status === "draft" || c.status === "scheduled" ? "pending" : "delivered",
          };
        }),
    replies: campaignRepliesFromMock(c),
  });
}

export async function createCampaign(orgId, data) {
  if (isApiMode()) return api.createCampaign(orgId, data);
  await delay();
  const c = {
    id: uid("c"),
    organization_id: orgId,
    status: "draft",
    sent: 0, delivered: 0, failed: 0,
    createdAt: new Date().toISOString().slice(0, 10),
    ...data,
  };
  state.campaigns.push(c);
  return clone(c);
}

export async function sendCampaign(id, opts = {}) {
  if (isApiMode()) return api.sendCampaign(id, opts);
  await delay(600);
  const c = state.campaigns.find((x) => x.id === id);
  if (!c) throw new Error("Campaign not found");
  const schedule = opts.schedule ?? false;
  if (schedule) {
    c.status = "scheduled";
  } else {
    c.status = "sent";
    c.sent = c.leadIds.length;
    c.delivered = Math.max(0, c.sent - Math.floor(Math.random() * 2));
    c.failed = c.sent - c.delivered;
  }
  return clone(c);
}

export async function getReports(orgId, role) {
  if (isApiMode()) return api.getReports(orgId, role);
  await delay();
  return clone(scopeByOrg(state.campaigns, orgId, role)).map((c) => ({
    id: c.id, name: c.name, channel: c.channel, sent: c.sent, delivered: c.delivered, failed: c.failed, status: c.status,
  }));
}

export async function getBilling(orgId, role) {
  if (isApiMode()) return api.getBilling(orgId, role);
  await delay();
  if (role === "super_admin") {
    // aggregate
    const agg = { wallet: 0, usage: { sms: 0, whatsapp: 0, email: 0 }, transactions: [] };
    Object.values(state.billing).forEach((b) => {
      agg.wallet += b.wallet;
      agg.usage.sms += b.usage.sms;
      agg.usage.whatsapp += b.usage.whatsapp;
      agg.usage.email += b.usage.email;
      agg.transactions.push(...b.transactions);
    });
    return agg;
  }
  return clone(state.billing[orgId] || { wallet: 0, usage: { sms: 0, whatsapp: 0, email: 0 }, transactions: [] });
}

export async function getUsers(orgId, role) {
  if (isApiMode()) return api.getUsers(orgId, role);
  await delay();
  return clone(scopeByOrg(state.users, orgId, role)).map(({ password, ...u }) => u);
}

export async function createUser(orgId, data) {
  if (isApiMode()) return api.createUser(orgId, data);
  await delay();
  const u = { id: uid("u"), organization_id: orgId, password: "demo", ...data };
  state.users.push(u);
  const { password, ...safe } = u;
  return safe;
}

export async function updateUser(id, patch) {
  if (isApiMode()) return api.updateUser(id, patch);
  await delay();
  const i = state.users.findIndex((u) => u.id === id);
  if (i < 0) throw new Error("User not found");
  const next = { ...state.users[i], ...patch };
  if (patch.password) next.password = patch.password;
  state.users[i] = next;
  const { password, ...safe } = next;
  return safe;
}

// ---------- Organization profile ----------
export async function getOrganization(orgId) {
  if (isApiMode()) return api.getOrganization(orgId);
  await delay(150);
  return clone(state.organizations.find((o) => o.id === orgId) || null);
}

export async function updateOrganization(orgId, patch) {
  if (isApiMode()) return api.updateOrganization(orgId, patch);
  await delay();
  const i = state.organizations.findIndex((o) => o.id === orgId);
  if (i < 0) throw new Error("Organization not found");
  state.organizations[i] = { ...state.organizations[i], ...patch };
  return clone(state.organizations[i]);
}

// ---------- Channel configurations (Email/SES, WhatsApp, SMS-DLT) ----------
const emptyConfig = () => ({
  email: {
    provider: "amazon_ses", region: "ap-south-1",
    accessKeyId: "", secretAccessKey: "",
    fromName: "", fromEmail: "", replyTo: "", configurationSet: "",
    domain: "", domainVerified: false, dkimVerified: false, spfVerified: false,
    dmarcPolicy: "none", sandboxMode: true, dailyQuota: 200, sendRate: 1,
  },
  whatsapp: {
    provider: "meta_cloud_api", wabaId: "", phoneNumberId: "",
    displayPhoneNumber: "", businessName: "", accessToken: "",
    appSecret: "", verifyToken: "", webhookUrl: "", qualityRating: "UNKNOWN",
    messagingLimit: "TIER_1K", verified: false,
  },
  sms: {
    provider: "msg91", country: "IN", dltEnabled: false,
    principalEntityId: "", senderId: "", senderIdType: "Promotional",
    apiKey: "", route: "Promotional", tps: 10,
  },
  facebook: {
    provider: "meta_messenger", pageId: "", pageName: "",
    pageAccessToken: "", appSecret: "", verifyToken: "",
    webhookUrl: "", verified: false,
  },
});

export async function getChannelConfig(orgId) {
  if (isApiMode()) {
    const raw = await api.getChannelConfig(orgId);
    const defaults = emptyConfig();
    return {
      email: { ...defaults.email, ...(raw.email ?? {}) },
      whatsapp: { ...defaults.whatsapp, ...(raw.whatsapp ?? {}) },
      sms: { ...defaults.sms, ...(raw.sms ?? {}) },
      facebook: { ...defaults.facebook, ...(raw.facebook ?? {}) },
      googleApiKey: raw.googleApiKey ?? "",
    };
  }
  await delay(150);
  if (!state.channelConfigs[orgId]) state.channelConfigs[orgId] = emptyConfig();
  return {
    ...clone(state.channelConfigs[orgId]),
    googleApiKey: state.googleApiKeys[orgId] ?? "",
  };
}

function channelSliceFromApi(data, channel) {
  if (!data || typeof data !== "object") return data ?? {};
  if (
    data[channel] != null &&
    (data.email != null || data.whatsapp != null || data.sms != null || data.facebook != null)
  ) {
    return data[channel];
  }
  return data;
}

export async function updateChannelConfig(orgId, channel, patch) {
  if (isApiMode()) {
    const saved = await api.updateChannelConfig(orgId, channel, patch);
    if (channel === "google" || channel === "google-maps") {
      return { googleApiKey: saved?.googleApiKey ?? patch.googleApiKey ?? "" };
    }
    const defaults = emptyConfig()[channel];
    return { ...defaults, ...channelSliceFromApi(saved, channel) };
  }
  await delay();
  if (channel === "google" || channel === "google-maps") {
    state.googleApiKeys[orgId] = patch.googleApiKey ?? "";
    return { googleApiKey: state.googleApiKeys[orgId] };
  }
  if (!state.channelConfigs[orgId]) state.channelConfigs[orgId] = emptyConfig();
  state.channelConfigs[orgId][channel] = {
    ...state.channelConfigs[orgId][channel],
    ...patch,
  };
  return clone(state.channelConfigs[orgId][channel]);
}

export async function verifyChannel(orgId, channel) {
  if (isApiMode()) {
    const verified = await api.verifyChannel(orgId, channel);
    const defaults = emptyConfig()[channel];
    return { ...defaults, ...channelSliceFromApi(verified, channel) };
  }
  await delay(700);
  if (!state.channelConfigs[orgId]) state.channelConfigs[orgId] = emptyConfig();
  const cfg = state.channelConfigs[orgId][channel];
  if (channel === "email") {
    cfg.domainVerified = true; cfg.dkimVerified = true; cfg.spfVerified = true; cfg.sandboxMode = false;
  } else if (channel === "whatsapp") {
    cfg.verified = true; cfg.qualityRating = "GREEN";
  } else if (channel === "sms") {
    cfg.dltEnabled = true;
  }
  return clone(cfg);
}

export async function searchPlaces(orgId, query, lat, lng) {
  if (isApiMode()) return api.searchPlaces(orgId, query, lat, lng);
  await delay(200);
  const q = (query ?? "").trim().toLowerCase();
  if (q.length < 2) return { results: [] };
  return {
    results: [
      {
        placeId: "mock_place_1",
        name: "Demo Turf Arena",
        address: "Velachery, Chennai, Tamil Nadu",
      },
    ].filter((r) => r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q)),
  };
}

export async function getGoogleMapsConfig(orgId) {
  if (isApiMode()) return api.getGoogleMapsConfig(orgId);
  await delay(100);
  const key = state.googleApiKeys[orgId] ?? "";
  return { configured: !!key, apiKey: key };
}

export async function geocodeAddress(orgId, address) {
  if (isApiMode()) return api.geocodeAddress(orgId, address);
  await delay(150);
  return {
    formattedAddress: address,
    lat: 13.0827,
    lng: 80.2707,
  };
}

export async function getPlaceDetails(orgId, placeId) {
  if (isApiMode()) return api.getPlaceDetails(orgId, placeId);
  await delay(200);
  return {
    placeId,
    name: "Demo Turf Arena",
    businessName: "Demo Turf Arena",
    phone: "+919876543210",
    website: "https://example.com",
    mapsUrl: "https://maps.google.com/",
    address: "Velachery, Chennai, Tamil Nadu 600042",
    pinCode: "600042",
    area: "Velachery",
    city: "Chennai",
    state: "Tamil Nadu",
    embedUrl: null,
  };
}

// ---------- API keys ----------
export async function getApiKeys(orgId) {
  if (isApiMode()) return api.getApiKeys(orgId);
  await delay(150);
  return clone(state.apiKeys[orgId] || []);
}

export async function createApiKey(orgId, label) {
  if (isApiMode()) return api.createApiKey(orgId, label);
  await delay();
  if (!state.apiKeys[orgId]) state.apiKeys[orgId] = [];
  const rand = Math.random().toString(36).slice(2, 10);
  const key = {
    id: uid("k"),
    label: label || "Untitled",
    prefix: `lv_pk_${rand.slice(0, 6)}`,
    secret: `lv_sk_${rand}${Math.random().toString(36).slice(2, 18)}`, // shown once
    createdAt: new Date().toISOString().slice(0, 10),
    lastUsed: null,
  };
  // Store without the secret
  const { secret, ...stored } = key;
  state.apiKeys[orgId].push(stored);
  return key;
}

export async function revokeApiKey(orgId, id) {
  if (isApiMode()) return api.revokeApiKey(orgId, id);
  await delay();
  state.apiKeys[orgId] = (state.apiKeys[orgId] || []).filter((k) => k.id !== id);
  return true;
}

// ---------- Reference values (org-scoped lookup table) ----------
export async function listReferenceValues(orgId) {
  if (isApiMode()) return api.listReferenceValues(orgId);
  await delay(150);
  if (!state.referenceValues[orgId]) state.referenceValues[orgId] = [];
  return clone(state.referenceValues[orgId]).sort((a, b) => {
    const byCat = (a.category || "").localeCompare(b.category || "");
    if (byCat !== 0) return byCat;
    return a.code.localeCompare(b.code);
  });
}

export async function createReferenceValue(orgId, body) {
  if (isApiMode()) return api.createReferenceValue(orgId, body);
  await delay();
  const code = String(body.code || "").trim();
  if (!code) throw new Error("Code is required");
  if (!state.referenceValues[orgId]) state.referenceValues[orgId] = [];
  const clash = state.referenceValues[orgId].some((r) => r.code === code);
  if (clash) throw new Error("Code already exists");
  const row = {
    id: uid("ref"),
    organization_id: orgId,
    code,
    category: normalizeReferenceValueCategory(body.category),
    referenceValue: String(body.referenceValue ?? ""),
    referenceCode: String(body.referenceCode ?? ""),
    colorCode: String(body.colorCode ?? "#6B7280"),
    monthCount: Math.max(0, Math.floor(Number(body.monthCount ?? 0))),
    createdAt: new Date().toISOString().slice(0, 10),
  };
  state.referenceValues[orgId].push(row);
  return clone(row);
}

export async function updateReferenceValue(orgId, refId, patch) {
  if (isApiMode()) return api.updateReferenceValue(orgId, refId, patch);
  await delay();
  const list = state.referenceValues[orgId] || [];
  const i = list.findIndex((r) => r.id === refId);
  if (i < 0) throw new Error("Reference value not found");
  const row = list[i];
  if (patch.code !== undefined) {
    const next = String(patch.code).trim();
    if (!next) throw new Error("Code cannot be empty");
    if (next !== row.code && list.some((r) => r.code === next)) {
      throw new Error("Code already exists");
    }
    row.code = next;
  }
  if (patch.category !== undefined) {
    row.category = normalizeReferenceValueCategory(patch.category);
  }
  if (patch.referenceValue !== undefined) row.referenceValue = String(patch.referenceValue);
  if (patch.referenceCode !== undefined) row.referenceCode = String(patch.referenceCode);
  if (patch.colorCode !== undefined) row.colorCode = String(patch.colorCode);
  if (patch.monthCount !== undefined) {
    row.monthCount = Math.max(0, Math.floor(Number(patch.monthCount)));
  }
  return clone(row);
}

export async function deleteReferenceValue(orgId, refId) {
  if (isApiMode()) return api.deleteReferenceValue(orgId, refId);
  await delay();
  const list = state.referenceValues[orgId] || [];
  const next = list.filter((r) => r.id !== refId);
  if (next.length === list.length) throw new Error("Reference value not found");
  state.referenceValues[orgId] = next;
  return true;
}

// ---------- Lead groups ----------
export async function listLeadGroups(orgId) {
  if (isApiMode()) return api.listLeadGroups(orgId);
  await delay(150);
  if (!state.leadGroups[orgId]) state.leadGroups[orgId] = [];
  return clone(state.leadGroups[orgId]).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createLeadGroup(orgId, body) {
  if (isApiMode()) return api.createLeadGroup(orgId, body);
  await delay();
  const name = String(body.name || "").trim();
  if (!name) throw new Error("Group name is required");
  const leadIds = [...new Set((body.leadIds || []).filter(Boolean))];
  if (leadIds.length === 0) throw new Error("At least one lead is required");
  const orgLeads = scopeByOrg(state.leads, orgId, "org_admin");
  const valid = leadIds.every((id) => orgLeads.some((l) => l.id === id));
  if (!valid) throw new Error("One or more leads do not belong to this organization");
  if (!state.leadGroups[orgId]) state.leadGroups[orgId] = [];
  const row = {
    id: uid("grp"),
    organization_id: orgId,
    name,
    leadIds,
    memberCount: leadIds.length,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  state.leadGroups[orgId].push(row);
  return clone(row);
}

export async function updateLeadGroup(orgId, groupId, patch) {
  if (isApiMode()) return api.updateLeadGroup(orgId, groupId, patch);
  await delay();
  const list = state.leadGroups[orgId] || [];
  const row = list.find((g) => g.id === groupId);
  if (!row) throw new Error("Lead group not found");
  if (patch.name !== undefined) {
    const name = String(patch.name).trim();
    if (!name) throw new Error("Group name is required");
    row.name = name;
  }
  if (patch.leadIds !== undefined) {
    const leadIds = [...new Set((patch.leadIds || []).filter(Boolean))];
    if (leadIds.length === 0) throw new Error("At least one lead is required");
    const orgLeads = scopeByOrg(state.leads, orgId, "org_admin");
    const valid = leadIds.every((id) => orgLeads.some((l) => l.id === id));
    if (!valid) throw new Error("One or more leads do not belong to this organization");
    row.leadIds = leadIds;
    row.memberCount = leadIds.length;
  }
  return clone(row);
}

export async function deleteLeadGroup(orgId, groupId) {
  if (isApiMode()) return api.deleteLeadGroup(orgId, groupId);
  await delay();
  const list = state.leadGroups[orgId] || [];
  const next = list.filter((g) => g.id !== groupId);
  if (next.length === list.length) throw new Error("Lead group not found");
  state.leadGroups[orgId] = next;
  return true;
}

// ---------- Inbound replies ----------
export async function getLeadReplies(leadId) {
  if (isApiMode()) return api.getLeadReplies(leadId);
  await delay(120);
  const lead = state.leads.find((l) => l.id === leadId);
  if (!lead) return [];
  const orgId = lead.organization_id;
  const list = state.inboundMessages[orgId] || [];
  return clone(
    list.filter((m) => m.leadId === leadId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  );
}

export async function getOrgInbox(orgId, params = {}) {
  if (isApiMode()) return api.getOrgInbox(orgId, params);
  await delay(120);
  let list = clone(state.inboundMessages[orgId] || []);
  if (params.channel) list = list.filter((m) => m.channel === params.channel);
  if (params.leadId) list = list.filter((m) => m.leadId === params.leadId);
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function mockChatThreads(orgId, channel) {
  const list = (state.inboundMessages[orgId] || []).filter(
    (m) => m.channel === channel && m.eventType === "message",
  );
  const threadMap = new Map();
  for (const m of list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))) {
    const key = m.leadId ?? `orphan:${m.fromAddress}`;
    if (threadMap.has(key)) continue;
    const preview = m.direction === "outbound" ? `You: ${m.textBody}` : m.textBody;
    threadMap.set(key, {
      leadId: m.leadId,
      leadName: m.leadName ?? m.fromAddress,
      contact: m.fromAddress,
      lastMessage: m.textBody,
      lastAt: m.createdAt,
      preview: preview.slice(0, 80),
    });
  }
  return [...threadMap.values()];
}

export async function getChatThreads(orgId, channel = "whatsapp") {
  if (isApiMode()) return api.getChatThreads(orgId, channel);
  await delay(120);
  return mockChatThreads(orgId, channel);
}

export async function getChatContacts(orgId, channel = "whatsapp") {
  if (isApiMode()) return api.getChatContacts(orgId, channel);
  await delay(100);
  return scopeByOrg(state.leads, orgId, "org_admin")
    .filter((l) => (channel === "email" ? l.email : l.phone))
    .map((l) => ({ id: l.id, name: l.name, phone: l.phone ?? "", email: l.email ?? "" }));
}

export async function getChatThread(orgId, leadId, channel = "whatsapp") {
  if (isApiMode()) return api.getChatThread(orgId, leadId, channel);
  await delay(120);
  const lead = state.leads.find((l) => l.id === leadId && l.organization_id === orgId);
  if (!lead) return { lead: null, messages: [] };
  const messages = (state.inboundMessages[orgId] || [])
    .filter((m) => m.leadId === leadId && m.channel === channel)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  return {
    lead: { id: lead.id, name: lead.name, phone: lead.phone ?? "", email: lead.email ?? "" },
    messages: clone(messages),
  };
}

export async function sendChatMessage(orgId, body) {
  if (isApiMode()) return api.sendChatMessage(orgId, body);
  await delay(400);
  const lead = state.leads.find((l) => l.id === body.leadId && l.organization_id === orgId);
  if (!lead) throw new Error("Lead not found");
  const text = String(body.text || "").trim();
  if (!text) throw new Error("Message text is required");
  const channel = body.channel || "whatsapp";
  const toAddress = channel === "email" ? lead.email : lead.phone;
  if (!toAddress) throw new Error("Lead has no contact for this channel");
  const row = {
    id: uid("in"),
    organization_id: orgId,
    channel,
    leadId: lead.id,
    fromAddress: toAddress,
    textBody: text,
    subject: body.subject ?? "",
    eventType: "message",
    direction: "outbound",
    leadName: lead.name,
    createdAt: new Date().toISOString(),
  };
  if (!state.inboundMessages[orgId]) state.inboundMessages[orgId] = [];
  state.inboundMessages[orgId].push(row);
  return { ok: true, message: clone(row) };
}

function campaignRepliesFromMock(campaign) {
  if (!campaign) return [];
  const orgId = campaign.organization_id;
  const list = state.inboundMessages[orgId] || [];
  const leadIds = new Set(campaign.leadIds || []);
  const since = campaign.createdAt || "1970-01-01";
  return clone(
    list
      .filter(
        (m) =>
          m.channel === campaign.channel &&
          m.eventType === "message" &&
          m.createdAt >= since &&
          (leadIds.has(m.leadId) || m.leadId),
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  );
}

// ---------- Wallet top-up ----------
export async function topUpWallet(orgId, amount) {
  if (isApiMode()) return api.topUpWallet(orgId, amount);
  await delay();
  if (!state.billing[orgId]) state.billing[orgId] = { wallet: 0, usage: { sms: 0, whatsapp: 0, email: 0 }, transactions: [] };
  const b = state.billing[orgId];
  b.wallet = +(b.wallet + amount).toFixed(2);
  b.transactions.unshift({
    id: uid("tx"), date: new Date().toISOString().slice(0, 10),
    desc: "Wallet top-up", amount, type: "credit",
  });
  return clone(b);
}
