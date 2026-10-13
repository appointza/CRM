export type PlaceListItem = {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  /** Google Places (New) rarely returns email; kept for filters when present */
  email: string;
  googleMapsUrl: string;
  mapQuery: string;
  category: string;
  rating: number | null;
  reviewCount: number | null;
  openNow: boolean | null;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryTypeDisplayName?: { text?: string };
  currentOpeningHours?: { openNow?: boolean };
  location?: { latitude?: number; longitude?: number };
};

function getGoogleMapsKey() {
  return (
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY ||
    ""
  );
}

export function uniquePlaces(places: PlaceListItem[]) {
  const byId = new Map<string, PlaceListItem>();
  for (const place of places) {
    const existing = byId.get(place.id);
    byId.set(
      place.id,
      existing
        ? {
            ...existing,
            phone: existing.phone || place.phone,
            website: existing.website || place.website,
            email: existing.email || place.email,
            category: existing.category || place.category,
            rating: existing.rating ?? place.rating,
            reviewCount: existing.reviewCount ?? place.reviewCount,
            openNow: existing.openNow ?? place.openNow,
          }
        : place,
    );
  }
  return [...byId.values()];
}

function googleToItem(place: GooglePlace): PlaceListItem | null {
  const name = place.displayName?.text?.trim();
  if (!name) return null;
  const address = place.formattedAddress?.trim() || "";
  const lat = place.location?.latitude;
  const lon = place.location?.longitude;
  const mapQuery = lat != null && lon != null ? `${lat},${lon}` : address || name;
  return {
    id: place.id ?? `${name}-${address}`,
    name,
    address,
    phone: place.nationalPhoneNumber?.trim() || place.internationalPhoneNumber?.trim() || "",
    website: place.websiteUri?.trim() || "",
    email: "",
    googleMapsUrl:
      place.googleMapsUri?.trim() ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`,
    mapQuery,
    category: place.primaryTypeDisplayName?.text?.trim() || "",
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    openNow: place.currentOpeningHours?.openNow ?? null,
  };
}

const PLACE_DETAIL_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "location",
  "rating",
  "userRatingCount",
  "primaryTypeDisplayName",
  "currentOpeningHours.openNow",
].join(",");

async function googlePlacesRequest(url: string, init: RequestInit = {}) {
  const key = getGoogleMapsKey();
  if (!key) {
    throw new Error(
      "Set VITE_GOOGLE_MAPS_API_KEY in connect-crm/.env (HTTP referrer key with Places API New enabled).",
    );
  }
  const response = await fetch(url, {
    ...init,
    referrerPolicy: "no-referrer",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      ...(init.headers ?? {}),
    },
  });
  const payload = (await response.json()) as GooglePlace & {
    places?: GooglePlace[];
    error?: { message?: string; status?: string; details?: Array<{ reason?: string }> };
  };
  if (!response.ok) {
    const reason = payload.error?.details?.find((detail) => detail.reason)?.reason;
    if (
      reason === "API_KEY_ANDROID_APP_BLOCKED" ||
      payload.error?.message?.includes("Android client")
    ) {
      throw new Error(
        "This Google API key is restricted to Android apps. In Google Cloud Console, set Application restrictions to HTTP referrers (e.g. http://localhost:5173/*) and enable Places API (New).",
      );
    }
    if (
      reason === "API_KEY_HTTP_REFERRER_BLOCKED" ||
      payload.error?.message?.includes("referer")
    ) {
      throw new Error(
        "This key does not allow this website. Add your dev origin under HTTP referrers and enable Places API (New).",
      );
    }
    if (
      reason === "API_KEY_SERVICE_BLOCKED" ||
      payload.error?.message?.includes("places.googleapis.com")
    ) {
      throw new Error(
        "This key cannot call Places API (New). Enable Places API (New) on the key's API restrictions.",
      );
    }
    throw new Error(
      payload.error?.message ||
        `Google Places request failed (${response.status}). Enable Places API (New).`,
    );
  }
  return payload;
}

async function fetchPlaceDetails(placeId: string): Promise<PlaceListItem | null> {
  const resource = placeId.startsWith("places/") ? placeId : `places/${placeId}`;
  try {
    const details = await googlePlacesRequest(`https://places.googleapis.com/v1/${resource}`, {
      headers: { "X-Goog-FieldMask": PLACE_DETAIL_FIELDS },
    });
    return googleToItem(details);
  } catch {
    return null;
  }
}

function photonAddress(properties: NonNullable<PhotonFeature["properties"]>) {
  return [
    [properties.housenumber, properties.street].filter(Boolean).join(" "),
    properties.district,
    properties.city,
    properties.state,
    properties.postcode,
    properties.country,
  ]
    .filter(Boolean)
    .join(", ");
}

async function searchPhoton(query: string) {
  const params = new URLSearchParams({ q: query, limit: "15", lang: "en" });
  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`);
  if (!response.ok) return [];
  const payload = (await response.json()) as { features?: PhotonFeature[] };
  return payload.features ?? [];
}

async function locationBiasFor(query: string) {
  const features = await searchPhoton(query);
  const coords = features
    .map((f) => f.geometry?.coordinates)
    .find((pair): pair is [number, number] => {
      if (!pair || pair.length !== 2) return false;
      return pair.every((value) => Number.isFinite(value));
    });
  if (!coords) return {};
  const [longitude, latitude] = coords;
  return {
    locationBias: {
      circle: {
        center: { latitude, longitude },
        radius: 6000,
      },
    },
  };
}

async function searchGooglePlaces(query: string): Promise<PlaceListItem[]> {
  const payload = await googlePlacesRequest("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.googleMapsUri",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.primaryTypeDisplayName",
        "places.currentOpeningHours.openNow",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "en",
      regionCode: "IN",
      pageSize: 20,
      ...(await locationBiasFor(query)),
    }),
  });

  const summaries = (payload.places ?? [])
    .map(googleToItem)
    .filter((place): place is PlaceListItem => Boolean(place));
  const detailed = await Promise.all(
    summaries.map(async (place) => {
      const details = await fetchPlaceDetails(place.id);
      if (!details) return place;
      return {
        ...place,
        ...details,
        phone: details.phone || place.phone,
        website: details.website || place.website,
        googleMapsUrl: details.googleMapsUrl || place.googleMapsUrl,
      };
    }),
  );
  return detailed;
}

/** Browser-only Places (New) search — no backend or sheet storage. */
export async function searchPlaces(query: string): Promise<PlaceListItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return uniquePlaces(await searchGooglePlaces(trimmed));
}
