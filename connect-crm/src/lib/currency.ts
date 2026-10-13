export const CURRENCY_CODE = "INR" as const;

/** Format amount in Indian Rupees (₹) with en-IN grouping. */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: CURRENCY_CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Whole-rupee preset labels (e.g. top-up chips). */
export function formatINRPreset(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export const TOP_UP_PRESETS_INR = [500, 1000, 2500, 5000, 10000] as const;
export const DEFAULT_TOP_UP_INR = 1000;
