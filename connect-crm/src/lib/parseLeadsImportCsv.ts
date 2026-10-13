/** First line of downloadable CSV template */
export const BULK_LEAD_CSV_TEMPLATE = `name,phone,email,businessName,ownerName,category,website,city,state,type,source,tags
Example User,9876543210,user@email.com,Acme Co,Owner Name,turf,https://acme.com,Chennai,TN,lead,website_form,"vip, trial"`;

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  phone: "phone",
  email: "email",
  businessname: "businessName",
  business_name: "businessName",
  ownername: "ownerName",
  owner_name: "ownerName",
  category: "category",
  website: "website",
  mapsurl: "mapsUrl",
  maps_url: "mapsUrl",
  address: "address",
  pincode: "pinCode",
  pin_code: "pinCode",
  area: "area",
  city: "city",
  state: "state",
  type: "type",
  source: "source",
  tags: "tags",
};

const ALLOWED_TYPES = new Set(["lead", "prospect", "call", "customer", "discontinued", "loss"]);
const ALLOWED_SOURCES = new Set([
  "manual",
  "website_form",
  "appointza",
  "import_csv",
  "referral",
  "campaign",
  "walk_in",
  "other",
]);

function normalizeHeader(h: string): string | null {
  const k = h.trim().replace(/^\ufeff/, "").toLowerCase().replace(/\s+/g, "_");
  return HEADER_ALIASES[k] ?? null;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

export type ParsedLeadImportRow = {
  name: string;
  phone: string;
  email: string;
  businessName: string;
  ownerName: string;
  category: string;
  website: string;
  mapsUrl: string;
  address: string;
  pinCode: string;
  area: string;
  city: string;
  state: string;
  type: string;
  source: string;
  tags: string[];
};

export function parseLeadsImportCsv(
  text: string,
  opts: { defaultCategory: string },
): { rows: ParsedLeadImportRow[]; warnings: string[] } {
  const warnings: string[] = [];
  const raw = text.replace(/^\ufeff/, "").trim();
  if (!raw) {
    warnings.push("Paste CSV content or choose a file.");
    return { rows: [], warnings };
  }
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    warnings.push("Need a header row and at least one data row.");
    return { rows: [], warnings };
  }

  const headerCells = parseCsvLine(lines[0]!);
  const keys = headerCells.map(normalizeHeader);
  if (keys.every((k) => k === null)) {
    warnings.push("No recognized columns. First row must include at least: name");
    return { rows: [], warnings };
  }
  if (!keys.includes("name")) {
    warnings.push('Header must include a "name" column.');
    return { rows: [], warnings };
  }

  const rows: ParsedLeadImportRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]!);
    const row: Record<string, string> = {};
    for (let ci = 0; ci < keys.length; ci++) {
      const key = keys[ci];
      if (!key) continue;
      row[key] = cells[ci] ?? "";
    }
    const name = (row.name ?? "").trim();
    if (!name) {
      warnings.push(`Row ${li + 1}: skipped (empty name)`);
      continue;
    }

    let type = (row.type ?? "").trim().toLowerCase();
    if (type && !ALLOWED_TYPES.has(type)) {
      warnings.push(`Row ${li + 1}: unknown type "${row.type}", using "lead"`);
      type = "lead";
    }
    if (!type) type = "lead";

    let source = (row.source ?? "").trim().toLowerCase();
    if (source && !ALLOWED_SOURCES.has(source)) {
      warnings.push(`Row ${li + 1}: unknown source "${row.source}", using "import_csv"`);
      source = "import_csv";
    }
    if (!source) source = "import_csv";

    const tagsRaw = row.tags ?? "";
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    let category = (row.category ?? "").trim();
    if (!category) category = opts.defaultCategory;

    rows.push({
      name,
      phone: (row.phone ?? "").trim(),
      email: (row.email ?? "").trim(),
      businessName: (row.businessName ?? "").trim(),
      ownerName: (row.ownerName ?? "").trim(),
      category,
      website: (row.website ?? "").trim(),
      mapsUrl: (row.mapsUrl ?? "").trim(),
      address: (row.address ?? "").trim(),
      pinCode: (row.pinCode ?? "").trim(),
      area: (row.area ?? "").trim(),
      city: (row.city ?? "").trim(),
      state: (row.state ?? "").trim(),
      type,
      source,
      tags,
    });
  }

  if (rows.length === 0 && lines.length > 1) {
    warnings.push("No valid data rows (every row needs a non-empty name).");
  }

  return { rows, warnings };
}
