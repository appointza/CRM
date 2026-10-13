/** Category enum value for rows that power the Leads "Category" field (business vertical). */
export const REFERENCE_VALUE_LEAD_TYPE = "lead_type";

/** Lifecycle stage — lead, prospect, customer… */
export const REFERENCE_VALUE_LEAD_STAGE = "lead_stage";

/** Where the lead was captured from. */
export const REFERENCE_VALUE_LEAD_SOURCE = "lead_source";

/** Keep in sync with connect-crm-server `ReferenceValueCategory`. */
export const REFERENCE_VALUE_CATEGORIES = [
  { value: REFERENCE_VALUE_LEAD_TYPE, label: "Business category" },
  { value: REFERENCE_VALUE_LEAD_STAGE, label: "Lead type (stage)" },
  { value: REFERENCE_VALUE_LEAD_SOURCE, label: "Lead source" },
];

export const REFERENCE_VALUE_CATEGORY_VALUES = REFERENCE_VALUE_CATEGORIES.map((c) => c.value);

export function normalizeReferenceValueCategory(raw) {
  const v = String(raw ?? "").trim();
  if (!v) return REFERENCE_VALUE_LEAD_TYPE;
  if (REFERENCE_VALUE_CATEGORY_VALUES.includes(v)) return v;
  throw new Error(`Invalid category: use one of ${REFERENCE_VALUE_CATEGORY_VALUES.join(", ")}`);
}

export function referenceCategoryLabel(category) {
  return REFERENCE_VALUE_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

/** Build { stageCode: [nextStageCodes] } from reference rows. */
export function buildStageTransitions(stageRows) {
  const map = {};
  for (const r of stageRows ?? []) {
    map[r.code] = String(r.referenceCode ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return map;
}

export function refOptionLabel(row) {
  return (row.referenceValue && String(row.referenceValue).trim()) || row.code;
}
