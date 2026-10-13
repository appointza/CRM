import type { PlaceLeadFields } from "@/components/LeadPlacesSearch";

export function placeFieldsToLeadPayload(fields: PlaceLeadFields) {
  const business = (fields.businessName || fields.name || "").trim();
  const contactName = (fields.name || business || "Unknown").trim();
  return {
    name: contactName,
    businessName: business || contactName,
    ownerName: fields.ownerName ?? "",
    phone: fields.phone ?? "",
    email: fields.email ?? "",
    website: fields.website ?? "",
    mapsUrl: fields.mapsUrl ?? "",
    address: fields.address ?? "",
    pinCode: fields.pinCode ?? "",
    area: fields.area ?? "",
    city: fields.city ?? "",
    state: fields.state ?? "",
    type: "lead",
    source: fields.source ?? "google_maps",
    tags: [] as string[],
  };
}
