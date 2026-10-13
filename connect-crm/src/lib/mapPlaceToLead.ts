import type { PlaceListItem } from "@/lib/googlePlaces";

export function placeListItemToLeadPayload(place: PlaceListItem) {
  const name = place.name.trim() || "Unknown";
  return {
    placeId: place.id,
    name,
    businessName: name,
    phone: place.phone ?? "",
    email: place.email ?? "",
    website: place.website ?? "",
    mapsUrl: place.googleMapsUrl ?? "",
    address: place.address ?? "",
    type: "lead",
    source: "google_maps",
    tags: [] as string[],
  };
}
