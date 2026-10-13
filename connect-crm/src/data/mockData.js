// Single source of mock data for the CRM SaaS UI.
// All data is keyed by organization_id for multi-tenancy.

export const organizations = [
  {
    id: "org_1", name: "Acme Marketing", plan: "Pro", createdAt: "2024-08-12",
    industry: "Retail", country: "IN", timezone: "Asia/Kolkata", website: "https://acme.example.com",
    supportEmail: "support@acme.example.com", billingEmail: "billing@acme.example.com",
    address: "4th Floor, Prestige Tower, Bengaluru, KA 560001",
    gstin: "29ABCDE1234F1Z5",
  },
  {
    id: "org_2", name: "Nimbus Realty", plan: "Growth", createdAt: "2024-11-03",
    industry: "Real Estate", country: "IN", timezone: "Asia/Kolkata", website: "https://nimbus.example.com",
    supportEmail: "hello@nimbus.example.com", billingEmail: "ap@nimbus.example.com",
    address: "Plot 22, Banjara Hills, Hyderabad, TG 500034",
    gstin: "36NIMBU9876K1Z2",
  },
  {
    id: "org_3", name: "Pulse Fitness", plan: "Starter", createdAt: "2025-02-19",
    industry: "Health & Fitness", country: "IN", timezone: "Asia/Kolkata", website: "https://pulse.example.com",
    supportEmail: "team@pulse.example.com", billingEmail: "team@pulse.example.com",
    address: "12 MG Road, Pune, MH 411001",
    gstin: "27PULSE5544Q1Z9",
  },
];

// Per-tenant channel configurations (Email/SES, WhatsApp Business API, SMS/DLT-India).
// Secrets shown here are placeholders only — in production they are encrypted at rest.
export const channelConfigs = {
  org_1: {
    email: {
      provider: "amazon_ses",
      region: "ap-south-1",
      accessKeyId: "AKIA****ACME",
      secretAccessKey: "••••••••••••••••",
      fromName: "Acme Marketing",
      fromEmail: "promo@acme.example.com",
      replyTo: "support@acme.example.com",
      configurationSet: "acme-prod",
      domain: "acme.example.com",
      domainVerified: true,
      dkimVerified: true,
      spfVerified: true,
      dmarcPolicy: "quarantine",
      sandboxMode: false,
      dailyQuota: 50000,
      sendRate: 14,
    },
    whatsapp: {
      provider: "meta_cloud_api",
      wabaId: "1029384756",
      phoneNumberId: "55667788990011",
      displayPhoneNumber: "+91 98000 12345",
      businessName: "Acme Marketing",
      accessToken: "EAAG••••••••••••",
      verifyToken: "acme-verify-2025",
      webhookUrl: "https://api.crm.app/webhooks/wa/org_1",
      qualityRating: "GREEN",
      messagingLimit: "TIER_100K",
      verified: true,
    },
    sms: {
      provider: "msg91",
      country: "IN",
      dltEnabled: true,
      principalEntityId: "1701234567890123456",
      senderId: "ACMEIN",
      senderIdType: "Promotional",
      apiKey: "••••••••acme-key",
      route: "Transactional",
      tps: 50,
    },
  },
  org_2: {
    email: {
      provider: "amazon_ses", region: "us-east-1",
      accessKeyId: "AKIA****NMBS", secretAccessKey: "••••••••••••••••",
      fromName: "Nimbus Realty", fromEmail: "listings@nimbus.example.com", replyTo: "hello@nimbus.example.com",
      configurationSet: "nimbus-prod", domain: "nimbus.example.com",
      domainVerified: true, dkimVerified: true, spfVerified: false, dmarcPolicy: "none",
      sandboxMode: false, dailyQuota: 10000, sendRate: 5,
    },
    whatsapp: {
      provider: "meta_cloud_api", wabaId: "2938475610",
      phoneNumberId: "11223344556677", displayPhoneNumber: "+91 90000 22222",
      businessName: "Nimbus Realty", accessToken: "EAAG••••••••••••",
      verifyToken: "nimbus-verify", webhookUrl: "https://api.crm.app/webhooks/wa/org_2",
      qualityRating: "YELLOW", messagingLimit: "TIER_10K", verified: true,
    },
    sms: {
      provider: "gupshup", country: "IN", dltEnabled: true,
      principalEntityId: "1709988776655443322", senderId: "NIMBUS",
      senderIdType: "Transactional", apiKey: "••••••••nimbus", route: "Transactional", tps: 30,
    },
  },
  org_3: {
    email: {
      provider: "amazon_ses", region: "ap-south-1",
      accessKeyId: "", secretAccessKey: "",
      fromName: "Pulse Fitness", fromEmail: "", replyTo: "",
      configurationSet: "", domain: "pulse.example.com",
      domainVerified: false, dkimVerified: false, spfVerified: false, dmarcPolicy: "none",
      sandboxMode: true, dailyQuota: 200, sendRate: 1,
    },
    whatsapp: {
      provider: "meta_cloud_api", wabaId: "",
      phoneNumberId: "", displayPhoneNumber: "",
      businessName: "Pulse Fitness", accessToken: "",
      verifyToken: "", webhookUrl: "https://api.crm.app/webhooks/wa/org_3",
      qualityRating: "UNKNOWN", messagingLimit: "TIER_1K", verified: false,
    },
    sms: {
      provider: "msg91", country: "IN", dltEnabled: false,
      principalEntityId: "", senderId: "", senderIdType: "Promotional",
      apiKey: "", route: "Promotional", tps: 10,
    },
  },
};

// API keys and webhook config per tenant
export const apiKeys = {
  org_1: [
    { id: "k_1", label: "Production", prefix: "lv_pk_acme_8f2", createdAt: "2025-01-12", lastUsed: "2025-04-28" },
    { id: "k_2", label: "Staging", prefix: "lv_pk_acme_test", createdAt: "2025-02-01", lastUsed: "2025-04-20" },
  ],
  org_2: [
    { id: "k_3", label: "Production", prefix: "lv_pk_nmbs_a91", createdAt: "2024-12-10", lastUsed: "2025-04-25" },
  ],
  org_3: [],
};

// Roles: "super_admin" | "org_admin" | "staff"
export const users = [
  { id: "u_0", name: "Platform Owner", email: "super@crm.app", password: "demo", role: "super_admin", organization_id: null },
  { id: "u_1", name: "Sara Khan", email: "admin@acme.com", password: "demo", role: "org_admin", organization_id: "org_1" },
  { id: "u_2", name: "Ravi Patel", email: "staff@acme.com", password: "demo", role: "staff", organization_id: "org_1" },
  { id: "u_3", name: "Mira Costa", email: "admin@nimbus.com", password: "demo", role: "org_admin", organization_id: "org_2" },
  { id: "u_4", name: "Leo Tanaka", email: "staff@nimbus.com", password: "demo", role: "staff", organization_id: "org_2" },
  { id: "u_5", name: "Aisha Noor", email: "admin@pulse.com", password: "demo", role: "org_admin", organization_id: "org_3" },
];

export const leads = [
  {
    id: "l_1", organization_id: "org_1", name: "Jordan Lee", phone: "+91 9876500110", email: "jordan@example.com",
    businessName: "Lakeside Wellness Spa", ownerName: "Anita Rao", category: "spa",
    website: "https://lakesidespa.example.com", mapsUrl: "https://maps.google.com/?q=Bengaluru",
    address: "12 Koramangala 5th Block, Bengaluru, KA 560095", pinCode: "560095", area: "Koramangala", city: "Bengaluru", state: "Karnataka",
    type: "customer", tags: ["vip", "newsletter"], createdAt: "2025-03-02",
    stageHistory: [{ from: null, to: "lead", at: "2025-03-02T09:00:00Z" }, { from: "lead", to: "prospect", at: "2025-03-08T11:20:00Z" }, { from: "prospect", to: "customer", at: "2025-03-20T15:40:00Z" }],
  },
  {
    id: "l_2", organization_id: "org_1", name: "Priya Shah", phone: "+91 9876500111", email: "priya@example.com",
    businessName: "Glow Parlour", ownerName: "Priya Shah", category: "parlour", website: "", mapsUrl: "",
    address: "88 FC Road, Pune, MH 411005", pinCode: "411005", area: "FC Road", city: "Pune", state: "Maharashtra",
    type: "prospect", tags: ["trial"], createdAt: "2025-03-14",
    stageHistory: [{ from: null, to: "lead", at: "2025-03-14T10:00:00Z" }, { from: "lead", to: "prospect", at: "2025-03-22T12:00:00Z" }],
  },
  {
    id: "l_3", organization_id: "org_1", name: "Rajesh Kumar", phone: "9876543210", email: "raj@gmail.com",
    businessName: "Green Turf Arena", ownerName: "Suresh", category: "turf", website: "www.example.com",
    mapsUrl: "https://maps.google.com/?q=Velachery+Chennai",
    address: "Velachery, Chennai", pinCode: "600042", area: "Velachery", city: "Chennai", state: "Tamil Nadu",
    type: "lead", tags: ["vip"], createdAt: "2025-04-01", stageHistory: [{ from: null, to: "lead", at: "2025-04-01T09:30:00Z" }],
  },
  {
    id: "l_4", organization_id: "org_1", name: "Elena Rossi", phone: "+91 9876500113", email: "elena@example.com",
    businessName: "Peak Power Gym", ownerName: "Vikram S", category: "gym", website: "", mapsUrl: "",
    address: "T Nagar, Chennai", pinCode: "600017", area: "T Nagar", city: "Chennai", state: "Tamil Nadu",
    type: "loss", tags: ["cold"], createdAt: "2025-04-08",
    stageHistory: [{ from: null, to: "lead", at: "2025-04-08T08:00:00Z" }, { from: "lead", to: "loss", at: "2025-04-15T17:00:00Z", reason: "No response" }],
  },
  {
    id: "l_5", organization_id: "org_2", name: "Tom Becker", phone: "+91 9876500220", email: "tom@example.com",
    businessName: "Urban Turf Club", ownerName: "Tom Becker", category: "turf", website: "https://urbanturf.example.com", mapsUrl: "",
    address: "Kondapur, Hyderabad", pinCode: "500084", area: "Kondapur", city: "Hyderabad", state: "Telangana",
    type: "customer", tags: ["buyer"], createdAt: "2025-02-18",
    stageHistory: [{ from: null, to: "lead", at: "2025-02-18T09:00:00Z" }, { from: "lead", to: "customer", at: "2025-03-01T14:00:00Z" }],
  },
  {
    id: "l_6", organization_id: "org_2", name: "Hana Park", phone: "+91 9876500221", email: "hana@example.com",
    businessName: "Serenity Spa", ownerName: "Hana Park", category: "spa", website: "", mapsUrl: "",
    address: "Jubilee Hills, Hyderabad", pinCode: "500033", area: "Jubilee Hills", city: "Hyderabad", state: "Telangana",
    type: "call", tags: ["seller"], createdAt: "2025-03-22",
    stageHistory: [{ from: null, to: "lead", at: "2025-03-22T09:00:00Z" }, { from: "lead", to: "call", at: "2025-03-25T10:30:00Z" }],
  },
  {
    id: "l_7", organization_id: "org_2", name: "Owen Reed", phone: "+91 9876500222", email: "owen@example.com",
    businessName: "Classic Cuts Parlour", ownerName: "Owen Reed", category: "parlour", website: "", mapsUrl: "",
    address: "Banjara Hills, Hyderabad", pinCode: "500034", area: "Banjara Hills", city: "Hyderabad", state: "Telangana",
    type: "prospect", tags: ["buyer", "vip"], createdAt: "2025-04-10",
    stageHistory: [{ from: null, to: "lead", at: "2025-04-10T09:00:00Z" }, { from: "lead", to: "prospect", at: "2025-04-14T11:00:00Z" }],
  },
  {
    id: "l_8", organization_id: "org_3", name: "Zoe Martin", phone: "+91 9876500330", email: "zoe@example.com",
    businessName: "Style Studio Salon", ownerName: "Zoe Martin", category: "salon", website: "", mapsUrl: "",
    address: "Koregaon Park, Pune", pinCode: "411001", area: "Koregaon Park", city: "Pune", state: "Maharashtra",
    type: "lead", tags: ["trial"], createdAt: "2025-03-30", stageHistory: [{ from: null, to: "lead", at: "2025-03-30T09:00:00Z" }],
  },
  {
    id: "l_9", organization_id: "org_3", name: "Ibrahim Ali", phone: "+91 9876500331", email: "ibrahim@example.com",
    businessName: "Motion Lab Studio", ownerName: "Ibrahim Ali", category: "studio", website: "", mapsUrl: "",
    address: "Camp, Pune", pinCode: "411001", area: "Camp", city: "Pune", state: "Maharashtra",
    type: "customer", tags: ["member"], createdAt: "2025-04-12",
    stageHistory: [{ from: null, to: "lead", at: "2025-04-12T09:00:00Z" }, { from: "lead", to: "customer", at: "2025-04-18T16:00:00Z" }],
  },
];

/** Reference values for lead business category (dropdowns, filters, reporting). */
export const LEAD_CATEGORIES = [
  { id: "turf", label: "Turf" },
  { id: "spa", label: "Spa" },
  { id: "parlour", label: "Parlour" },
  { id: "salon", label: "Salon" },
  { id: "gym", label: "Gym" },
  { id: "studio", label: "Studio" },
];

// Lead type options (shared across UI)
export const LEAD_TYPES = [
  { id: "lead", label: "Lead" },
  { id: "prospect", label: "Prospect" },
  { id: "call", label: "Call" },
  { id: "customer", label: "Customer" },
  { id: "discontinued", label: "Discontinued" },
  { id: "loss", label: "Loss" },
];

// Allowed forward transitions for lead lifecycle
export const LEAD_TRANSITIONS = {
  lead: ["prospect", "call", "loss"],
  prospect: ["call", "customer", "loss"],
  call: ["prospect", "customer", "loss"],
  customer: ["discontinued", "loss"],
  discontinued: ["customer", "loss"],
  loss: [],
};

/** Where a lead was captured from */
export const LEAD_SOURCES = [
  { id: "manual", label: "Manual entry" },
  { id: "website_form", label: "Website form" },
  { id: "appointza", label: "Appointza" },
  { id: "import_csv", label: "CSV import" },
  { id: "referral", label: "Referral" },
  { id: "campaign", label: "Campaign" },
  { id: "walk_in", label: "Walk-in" },
  { id: "google_maps", label: "Google Maps" },
  { id: "other", label: "Other" },
];

export const templates = [
  { id: "t_1", organization_id: "org_1", channel: "sms", name: "Welcome SMS", body: "Hi {{name}}, welcome to Acme! Use code ACME10." },
  { id: "t_2", organization_id: "org_1", channel: "whatsapp", name: "Promo WA", body: "Hey {{name}} 👋 Offer valid till {{date}}. {{link}}" },
  { id: "t_3", organization_id: "org_1", channel: "email", name: "Newsletter", body: "<h2>Hello {{name}}</h2><p>Check our April picks: {{link}}</p>" },
  { id: "t_4", organization_id: "org_2", channel: "sms", name: "Open House", body: "Hi {{name}}, open house on {{date}}. Details: {{link}}" },
  { id: "t_5", organization_id: "org_2", channel: "email", name: "Listing Update", body: "<p>Hi {{name}}, 3 new listings this week.</p>" },
  { id: "t_6", organization_id: "org_3", channel: "whatsapp", name: "Class Reminder", body: "Hi {{name}}, your class is at {{date}}." },
];

export const campaigns = [
  { id: "c_1", organization_id: "org_1", name: "Spring Promo", channel: "sms", templateId: "t_1", leadIds: ["l_1","l_2","l_3"], status: "sent", sent: 3, delivered: 3, failed: 0, createdAt: "2025-04-10" },
  { id: "c_2", organization_id: "org_1", name: "April Newsletter", channel: "email", templateId: "t_3", leadIds: ["l_1","l_2","l_3","l_4"], status: "sent", sent: 4, delivered: 4, failed: 0, createdAt: "2025-04-15" },
  { id: "c_3", organization_id: "org_1", name: "WA Flash Sale", channel: "whatsapp", templateId: "t_2", leadIds: ["l_1","l_3"], status: "scheduled", sent: 0, delivered: 0, failed: 0, createdAt: "2025-04-22" },
  { id: "c_4", organization_id: "org_2", name: "Open House Mar", channel: "sms", templateId: "t_4", leadIds: ["l_5","l_6","l_7"], status: "sent", sent: 3, delivered: 2, failed: 1, createdAt: "2025-03-25" },
  { id: "c_5", organization_id: "org_2", name: "April Listings", channel: "email", templateId: "t_5", leadIds: ["l_5","l_6","l_7"], status: "sent", sent: 3, delivered: 3, failed: 0, createdAt: "2025-04-18" },
  { id: "c_6", organization_id: "org_3", name: "Member Recall", channel: "whatsapp", templateId: "t_6", leadIds: ["l_8","l_9"], status: "sent", sent: 2, delivered: 2, failed: 0, createdAt: "2025-04-20" },
];

export const billing = {
  org_1: {
    wallet: 24875,
    usage: { sms: 412, whatsapp: 188, email: 1540 },
    transactions: [
      { id: "tx_1", date: "2025-04-01", desc: "Top-up", amount: 20000, type: "credit" },
      { id: "tx_2", date: "2025-04-12", desc: "SMS batch", amount: -144.2, type: "debit" },
      { id: "tx_3", date: "2025-04-18", desc: "Email campaign", amount: -231, type: "debit" },
    ],
  },
  org_2: {
    wallet: 9210,
    usage: { sms: 210, whatsapp: 54, email: 780 },
    transactions: [
      { id: "tx_4", date: "2025-03-20", desc: "Top-up", amount: 10000, type: "credit" },
      { id: "tx_5", date: "2025-04-02", desc: "SMS batch", amount: -73.5, type: "debit" },
    ],
  },
  org_3: {
    wallet: 4200,
    usage: { sms: 60, whatsapp: 140, email: 300 },
    transactions: [
      { id: "tx_6", date: "2025-04-05", desc: "Top-up", amount: 5000, type: "credit" },
      { id: "tx_7", date: "2025-04-20", desc: "WA campaign", amount: -112, type: "debit" },
    ],
  },
};

// Dummy chart series: messages sent per day (last 7 days)
export const messageTrend = {
  org_1: [24, 40, 32, 58, 46, 72, 61],
  org_2: [10, 18, 14, 22, 19, 28, 24],
  org_3: [6, 9, 7, 12, 10, 15, 14],
};
