function normalizePhone(phone: string | undefined | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizeMaps(url: string | undefined | null) {
  return (url ?? "").trim().toLowerCase();
}

export function buildCrmPlaceIndex(
  leads: Array<{ phone?: string; mapsUrl?: string }>,
) {
  const phones = new Set<string>();
  const mapsUrls = new Set<string>();
  for (const l of leads) {
    const p = normalizePhone(l.phone);
    if (p.length >= 8) phones.add(p);
    const m = normalizeMaps(l.mapsUrl);
    if (m) mapsUrls.add(m);
  }

  function placeAlreadyInCrm(place: { phone?: string; googleMapsUrl?: string }) {
    const p = normalizePhone(place.phone);
    if (p.length >= 8 && phones.has(p)) return true;
    const m = normalizeMaps(place.googleMapsUrl);
    return !!m && mapsUrls.has(m);
  }

  return { phones, mapsUrls, placeAlreadyInCrm };
}
