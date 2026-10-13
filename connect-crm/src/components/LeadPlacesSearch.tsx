import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Search } from "lucide-react";
import { getPlaceDetails, searchPlaces } from "@/services/crmService";
import { cn } from "@/lib/utils";

export type PlaceLeadFields = {
  placeId?: string;
  name?: string;
  businessName?: string;
  ownerName?: string;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  address?: string;
  pinCode?: string;
  area?: string;
  city?: string;
  state?: string;
  source?: string;
  lat?: number;
  lng?: number;
};

type Props = {
  orgId: string;
  disabled?: boolean;
  /** Pass browser coords for “near me” / biased search */
  nearLat?: number;
  nearLng?: number;
  onApply: (fields: PlaceLeadFields) => void;
};

type SearchHit = {
  placeId: string;
  name?: string;
  address?: string;
};

export function LeadPlacesSearch({ orgId, disabled, nearLat, nearLng, onApply }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!orgId || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const data = await searchPlaces(orgId, q.trim(), nearLat, nearLng);
      setResults((data?.results ?? []) as SearchHit[]);
    } catch (e: unknown) {
      setResults([]);
      setSearchError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, [orgId, nearLat, nearLng]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runSearch(query);
    }, 400);
    return () => window.clearTimeout(t);
  }, [query, runSearch]);

  const pickPlace = async (hit: SearchHit) => {
    if (!orgId || !hit.placeId) return;
    setLoadingId(hit.placeId);
    setSearchError(null);
    try {
      const detail = await getPlaceDetails(orgId, hit.placeId);
      setEmbedUrl(typeof detail.embedUrl === "string" ? detail.embedUrl : null);
      onApply({
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
        lat: typeof detail.lat === "number" ? detail.lat : undefined,
        lng: typeof detail.lng === "number" ? detail.lng : undefined,
      });
      setQuery(hit.name || hit.address || query);
      setResults([]);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : "Could not load place");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MapPin className="h-4 w-4 text-primary" />
        Find business on Google Maps
      </div>
      <div className="space-y-2">
        <Label htmlFor="places-search" className="sr-only">
          Search business name
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="places-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. salon near me, business name…"
            className="pl-9"
            disabled={disabled || !orgId}
            autoComplete="off"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {searchError && (
          <p className="text-xs text-destructive">{searchError}</p>
        )}
        {!orgId && (
          <p className="text-xs text-muted-foreground">Select an organization to search.</p>
        )}
      </div>

      {results.length > 0 && (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border bg-background p-1">
          {results.map((r) => (
            <li key={r.placeId}>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-auto w-full justify-start px-2 py-2 text-left font-normal",
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
      )}

      {embedUrl && (
        <div className="overflow-hidden rounded-md border">
          <iframe
            title="Selected place map"
            src={embedUrl}
            className="h-44 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
