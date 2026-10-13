function normalizePhone(p: string | undefined | null) {
  return (p ?? "").replace(/\D/g, "");
}

export function isDuplicatePlaceLead(
  fields: { phone?: string; mapsUrl?: string; businessName?: string; name?: string },
  existing: Array<{ phone?: string; mapsUrl?: string; businessName?: string; name?: string }>,
) {
  const phone = normalizePhone(fields.phone);
  const maps = (fields.mapsUrl ?? "").trim();
  const biz = (fields.businessName || fields.name || "").trim().toLowerCase();
  return existing.some((l) => {
    if (phone && phone.length >= 8 && normalizePhone(l.phone) === phone) return true;
    if (maps && (l.mapsUrl ?? "").trim() === maps) return true;
    return false;
  });
}
