import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Loader2,
  Search,
  Navigation,
  Phone,
  Globe,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import { createLead, getPlaceDetails, searchPlaces } from "@/services/crmService";
import { placeFieldsToLeadPayload } from "@/lib/placeLeadPayload";
import type { PlaceLeadFields } from "@/components/LeadPlacesSearch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type PlaceSearchPin = {
  placeId: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
};

type Props = {
  orgId: string;
  onResults?: (pins: PlaceSearchPin[]) => void;
  onSelectPlace?: (fields: PlaceLeadFields) => void;
  onLeadCreated?: () => void;
};

type SearchHit = {
  placeId: string;
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
};

export function MapPlacesLeadFinder({ orgId, onResults, onSelectPlace, onLeadCreated }: Props) {
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlaceLeadFields | null>(null);
  const [creating, setCreating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported in this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Location enabled — “near me” searches use your position");
      },
      () => {
        setLocating(false);
        toast.error("Could not get location. Allow location access or search with a city name.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, []);

  const runSearch = useCallback(
    async (q: string) => {
      if (!orgId || q.trim().length < 2) {
        setResults([]);
        onResults?.([]);
        return;
      }
      const needsLocation =
        /\bnear me\b/i.test(q) || /\bnearby\b/i.test(q);
      if (needsLocation && !coords) {
        setSearchError("Turn on location for “near me” searches (Use my location).");
        return;
      }
      setSearching(true);
      setSearchError(null);
      try {
        const data = await searchPlaces(orgId, q.trim(), coords?.lat, coords?.lng);
        const list = (data?.results ?? []) as SearchHit[];
        setResults(list);
        const pins: PlaceSearchPin[] = list
          .filter((r) => r.placeId && r.lat != null && r.lng != null)
          .map((r) => ({
            placeId: r.placeId,
            name: r.name ?? "Place",
            address: r.address,
            lat: r.lat!,
            lng: r.lng!,
          }));
        onResults?.(pins);
      } catch (e: unknown) {
        setResults([]);
        onResults?.([]);
        setSearchError(e instanceof Error ? e.message : "Search failed");
      } finally {
        setSearching(false);
      }
    },
    [orgId, coords, onResults],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runSearch(query);
    }, 450);
    return () => window.clearTimeout(t);
  }, [query, runSearch]);

  const pickPlace = async (hit: SearchHit) => {
    if (!orgId || !hit.placeId) return;
    setLoadingId(hit.placeId);
    setSearchError(null);
    try {
      const detail = await getPlaceDetails(orgId, hit.placeId);
      const fields: PlaceLeadFields = {
        placeId: hit.placeId,
        name: detail.businessName || detail.name || hit.name || "",
        businessName: detail.businessName || detail.name || hit.name || "",
        phone: detail.phone ?? "",
        website: detail.website ?? "",
        mapsUrl: detail.mapsUrl ?? "",
        address: detail.address ?? hit.address ?? "",
        pinCode: detail.pinCode ?? "",
        area: detail.area ?? "",
        city: detail.city ?? "",
        state: detail.state ?? "",
        source: "google_maps",
        lat: typeof detail.lat === "number" ? detail.lat : hit.lat,
        lng: typeof detail.lng === "number" ? detail.lng : hit.lng,
      };
      setSelected(fields);
      onSelectPlace?.(fields);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : "Could not load place details");
    } finally {
      setLoadingId(null);
    }
  };

  const saveLead = async () => {
    if (!orgId || !selected) return;
    setCreating(true);
    try {
      await createLead(orgId, placeFieldsToLeadPayload(selected));
      toast.success("Lead created from Google Places");
      setSelected(null);
      onLeadCreated?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not create lead");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-primary" />
          Search places &amp; add leads
        </div>
        <Button
          type="button"
          variant={coords ? "secondary" : "outline"}
          size="sm"
          onClick={requestLocation}
          disabled={locating}
          className="gap-1.5"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5" />
          )}
          {coords ? "Location on" : "Use my location"}
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="map-places-search" className="sr-only">
          Search places
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="map-places-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. salon near me, turf in Velachery…"
            className="pl-9"
            disabled={!orgId}
            autoComplete="off"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Uses Google Places Text Search. Pick a result to see phone, website, and address, then create a lead.
        </p>
        {searchError && <p className="text-xs text-destructive">{searchError}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border bg-muted/20 p-1 lg:max-h-80">
          {results.length === 0 && !searching && query.trim().length >= 2 && (
            <li className="p-3 text-sm text-muted-foreground">No places found. Try another search.</li>
          )}
          {results.map((r) => (
            <li key={r.placeId}>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-auto w-full justify-start px-2 py-2.5 text-left font-normal",
                  selected?.placeId === r.placeId && "bg-primary/10",
                  loadingId === r.placeId && "opacity-70",
                )}
                disabled={!!loadingId}
                onClick={() => void pickPlace(r)}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.name}</div>
                  {r.address && (
                    <div className="truncate text-xs text-muted-foreground">{r.address}</div>
                  )}
                </div>
              </Button>
            </li>
          ))}
        </ul>

        <div className="rounded-md border bg-muted/10 p-4 min-h-[12rem]">
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Select a place from the list to view contact details and save as a lead.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold leading-tight">
                  {selected.businessName || selected.name}
                </h3>
                {selected.address && (
                  <p className="text-sm text-muted-foreground mt-1">{selected.address}</p>
                )}
              </div>
              <dl className="space-y-2 text-sm">
                {selected.phone ? (
                  <div className="flex gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <dd>
                      <a href={`tel:${selected.phone}`} className="hover:underline">
                        {selected.phone}
                      </a>
                    </dd>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No phone listed on Google</p>
                )}
                {selected.website ? (
                  <div className="flex gap-2">
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <dd className="truncate">
                      <a
                        href={selected.website.startsWith("http") ? selected.website : `https://${selected.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {selected.website.replace(/^https?:\/\//, "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </dd>
                  </div>
                ) : null}
                {selected.mapsUrl && (
                  <div className="flex gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <dd className="truncate">
                      <a
                        href={selected.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs"
                      >
                        Open in Google Maps
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              <Button type="button" className="w-full gap-2" onClick={() => void saveLead()} disabled={creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Create lead
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
