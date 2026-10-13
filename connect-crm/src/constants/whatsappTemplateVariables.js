/** Appointza variable keys for WhatsApp {{1}}, {{2}}, … mapping (Meta does not store meanings). */

export const WA_TEMPLATE_VARIABLE_OPTIONS = [
  { value: "customer_name", label: "Customer Name" },
  { value: "customer_phone", label: "Customer Phone" },
  { value: "organization_name", label: "Organization Name" },
  { value: "service_name", label: "Service Name" },
  { value: "staff_name", label: "Staff Name" },
  { value: "booking_date", label: "Booking Date" },
  { value: "booking_time", label: "Booking Time" },
  { value: "booking_id", label: "Booking ID" },
  { value: "amount", label: "Amount" },
  { value: "payment_status", label: "Payment Status" },
  { value: "branch_name", label: "Branch Name" },
];

export function waVariableLabel(key) {
  return WA_TEMPLATE_VARIABLE_OPTIONS.find((o) => o.value === key)?.label ?? key;
}

export function listBodyVariableIndices(body) {
  if (!body?.trim()) return [];
  const nums = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => parseInt(m[1], 10));
  return [...new Set(nums)].sort((a, b) => a - b);
}

export function defaultMappingForBody(body) {
  const defaults = ["customer_name", "service_name", "booking_date", "booking_time", "amount"];
  const indices = listBodyVariableIndices(body);
  const map = {};
  indices.forEach((i, idx) => {
    map[String(i)] = defaults[idx] ?? "";
  });
  return map;
}

export function syncVariableMapping(body, current) {
  const indices = listBodyVariableIndices(body);
  const next = {};
  for (const i of indices) {
    next[String(i)] = current[String(i)] ?? "";
  }
  return next;
}
