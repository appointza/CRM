import type { PlaceListItem } from "@/lib/googlePlaces";

export type PlaceContactFilters = {
  requirePhone: boolean;
  requireWebsite: boolean;
  requireAddress: boolean;
  requireEmail: boolean;
};

export const emptyPlaceContactFilters = (): PlaceContactFilters => ({
  requirePhone: false,
  requireWebsite: false,
  requireAddress: false,
  requireEmail: false,
});

export function placeHasPhone(p: PlaceListItem) {
  return p.phone.replace(/\D/g, "").length >= 8;
}

export function placeHasWebsite(p: PlaceListItem) {
  return p.website.trim().length > 0;
}

export function placeHasAddress(p: PlaceListItem) {
  const a = p.address.trim();
  return a.length > 5;
}

export function placeHasEmail(p: PlaceListItem) {
  return (p.email ?? "").trim().length > 3 && p.email!.includes("@");
}

export function filterPlacesByContact(
  places: PlaceListItem[],
  filters: PlaceContactFilters,
): PlaceListItem[] {
  const any =
    filters.requirePhone ||
    filters.requireWebsite ||
    filters.requireAddress ||
    filters.requireEmail;
  if (!any) return places;
  return places.filter((p) => {
    if (filters.requirePhone && !placeHasPhone(p)) return false;
    if (filters.requireWebsite && !placeHasWebsite(p)) return false;
    if (filters.requireAddress && !placeHasAddress(p)) return false;
    if (filters.requireEmail && !placeHasEmail(p)) return false;
    return true;
  });
}
