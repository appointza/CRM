let loadPromise: Promise<void> | null = null;

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  const w = window as Window & { google?: { maps?: unknown } };
  if (w.google?.maps) return Promise.resolve();

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load")));
      if (w.google?.maps) resolve();
      return;
    }
    const script = document.createElement("script");
    script.dataset.googleMaps = "1";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Parse coordinates from common Google Maps URL shapes. */
export function parseLatLngFromMapsUrl(mapsUrl: string | undefined | null): { lat: number; lng: number } | null {
  if (!mapsUrl?.trim()) return null;
  const u = mapsUrl.trim();
  const at = u.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return { lat: Number(at[1]), lng: Number(at[2]) };
  const d3 = u.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (d3) return { lat: Number(d3[1]), lng: Number(d3[2]) };
  const q = u.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (q) return { lat: Number(q[1]), lng: Number(q[2]) };
  return null;
}

export function leadMapQuery(lead: {
  businessName?: string;
  name?: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  mapsUrl?: string;
}): string {
  const fromUrl = parseLatLngFromMapsUrl(lead.mapsUrl);
  if (fromUrl) return `${fromUrl.lat},${fromUrl.lng}`;
  const parts = [
    lead.businessName || lead.name,
    lead.address,
    lead.area,
    lead.city,
    lead.state,
    lead.pinCode,
  ]
    .map((x) => (x ?? "").trim())
    .filter(Boolean);
  return parts.join(", ");
}
