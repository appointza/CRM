import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { geocodeAddress, getGoogleMapsConfig } from "@/services/crmService";
import { loadGoogleMapsScript, leadMapQuery, parseLatLngFromMapsUrl } from "@/lib/googleMapsLoader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, MapPin, ExternalLink } from "lucide-react";

type LeadPin = {
  id: string;
  label: string;
  sub?: string;
  type?: string;
  lat: number;
  lng: number;
};

export type SearchMapPin = {
  placeId: string;
  lat: number;
  lng: number;
  label: string;
};

type Props = {
  orgId: string;
  leads: Array<Record<string, unknown>>;
  customerStageCode?: string;
  highlight?: { lat: number; lng: number; label?: string } | null;
  searchPins?: SearchMapPin[];
  className?: string;
};

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

export function SalesLeadsMap({
  orgId,
  leads,
  customerStageCode = "customer",
  highlight,
  searchPins = [],
  className,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const searchMarkersRef = useRef<google.maps.Marker[]>([]);
  const highlightMarkerRef = useRef<google.maps.Marker | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pins, setPins] = useState<LeadPin[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mappableLeads = useMemo(
    () =>
      leads.filter((l) => {
        const q = leadMapQuery({
          businessName: l.businessName as string,
          name: l.name as string,
          address: l.address as string,
          area: l.area as string,
          city: l.city as string,
          state: l.state as string,
          pinCode: l.pinCode as string,
          mapsUrl: l.mapsUrl as string,
        });
        return q.length >= 3;
      }),
    [leads],
  );

  const resolvePins = useCallback(async () => {
    if (!orgId) return;
    setGeocoding(true);
    const next: LeadPin[] = [];
    const cache = new Map<string, { lat: number; lng: number }>();
    const max = Math.min(mappableLeads.length, 60);

    for (let i = 0; i < max; i++) {
      const l = mappableLeads[i];
      const id = String(l.id);
      const urlCoords = parseLatLngFromMapsUrl(l.mapsUrl as string);
      if (urlCoords) {
        next.push({
          id,
          label: (l.businessName || l.name || "Lead") as string,
          sub: (l.address || l.city) as string | undefined,
          type: l.type as string | undefined,
          lat: urlCoords.lat,
          lng: urlCoords.lng,
        });
        continue;
      }
      const query = leadMapQuery({
        businessName: l.businessName as string,
        name: l.name as string,
        address: l.address as string,
        area: l.area as string,
        city: l.city as string,
        state: l.state as string,
        pinCode: l.pinCode as string,
      });
      if (cache.has(query)) {
        const c = cache.get(query)!;
        next.push({
          id,
          label: (l.businessName || l.name || "Lead") as string,
          sub: query,
          type: l.type as string | undefined,
          lat: c.lat,
          lng: c.lng,
        });
        continue;
      }
      try {
        const geo = await geocodeAddress(orgId, query);
        if (geo.lat != null && geo.lng != null) {
          cache.set(query, { lat: geo.lat, lng: geo.lng });
          next.push({
            id,
            label: (l.businessName || l.name || "Lead") as string,
            sub: geo.formattedAddress || query,
            type: l.type as string | undefined,
            lat: geo.lat,
            lng: geo.lng,
          });
        }
      } catch {
        /* skip unmappable row */
      }
      if (i > 0 && i % 5 === 0) await new Promise((r) => setTimeout(r, 120));
    }

    setPins(next);
    setGeocoding(false);
  }, [orgId, mappableLeads]);

  useEffect(() => {
    void resolvePins();
  }, [resolvePins]);

  useEffect(() => {
    if (!orgId || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cfg = await getGoogleMapsConfig(orgId);
        if (!cfg.configured || !cfg.apiKey) {
          setError("Add your Google API key under Settings → Google Maps (enable Geocoding API).");
          return;
        }
        await loadGoogleMapsScript(cfg.apiKey);
        if (cancelled || !mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: DEFAULT_CENTER,
          zoom: 5,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });
        mapInstance.current = map;
        infoRef.current = new google.maps.InfoWindow();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Could not load map");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || loading) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    searchMarkersRef.current.forEach((m) => m.setMap(null));
    searchMarkersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;

    for (const sp of searchPins) {
      const marker = new google.maps.Marker({
        map,
        position: { lat: sp.lat, lng: sp.lng },
        title: sp.label,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: "#f97316",
          fillOpacity: 0.95,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: 50,
      });
      marker.addListener("click", () => {
        const iw = infoRef.current;
        if (!iw) return;
        iw.setContent(
          `<div style="font-family:system-ui,sans-serif;max-width:220px"><strong>${escapeHtml(sp.label)}</strong><div style="font-size:11px;color:#666;margin-top:4px">Places search result</div></div>`,
        );
        iw.open({ map, anchor: marker });
        map.panTo({ lat: sp.lat, lng: sp.lng });
      });
      searchMarkersRef.current.push(marker);
      bounds.extend({ lat: sp.lat, lng: sp.lng });
      hasBounds = true;
    }

    for (const pin of pins) {
      const isCustomer = pin.type === customerStageCode;
      const marker = new google.maps.Marker({
        map,
        position: { lat: pin.lat, lng: pin.lng },
        title: pin.label,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: isCustomer ? "#10b981" : "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        setSelectedId(pin.id);
        const iw = infoRef.current;
        if (!iw) return;
        iw.setContent(
          `<div style="font-family:system-ui,sans-serif;max-width:220px">
            <strong>${escapeHtml(pin.label)}</strong>
            ${pin.sub ? `<div style="font-size:12px;color:#666;margin-top:4px">${escapeHtml(pin.sub)}</div>` : ""}
          </div>`,
        );
        iw.open({ map, anchor: marker });
        map.panTo({ lat: pin.lat, lng: pin.lng });
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: pin.lat, lng: pin.lng });
      hasBounds = true;
    }

    if (highlight) {
      highlightMarkerRef.current?.setMap(null);
      highlightMarkerRef.current = new google.maps.Marker({
        map,
        position: { lat: highlight.lat, lng: highlight.lng },
        title: highlight.label ?? "Search result",
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      bounds.extend({ lat: highlight.lat, lng: highlight.lng });
      hasBounds = true;
    }

    if (hasBounds) {
      map.fitBounds(bounds, 48);
      const listener = google.maps.event.addListenerOnce(map, "idle", () => {
        if (map.getZoom()! > 15) map.setZoom(15);
      });
      void listener;
    }
  }, [pins, highlight, searchPins, loading, customerStageCode]);

  const focusPin = (pin: LeadPin) => {
    setSelectedId(pin.id);
    const map = mapInstance.current;
    if (!map) return;
    map.panTo({ lat: pin.lat, lng: pin.lng });
    map.setZoom(Math.max(map.getZoom() ?? 12, 14));
  };

  if (error) {
    return (
      <div className={cn("rounded-xl border border-dashed p-8 text-center text-sm", className)}>
        <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link to="/app/settings">Open Settings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-[420px] flex-col gap-0 overflow-hidden rounded-xl border lg:flex-row lg:min-h-[560px]", className)}>
      <div className="flex w-full flex-col border-b lg:w-80 lg:border-b-0 lg:border-r">
        <div className="border-b px-3 py-2 text-xs text-muted-foreground">
          {pins.length} on map
          {mappableLeads.length > pins.length ? ` · ${mappableLeads.length - pins.length} could not be placed` : ""}
          {geocoding && (
            <span className="ml-2 inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Geocoding…
            </span>
          )}
        </div>
        <ul className="max-h-48 flex-1 overflow-y-auto lg:max-h-none">
          {pins.length === 0 && !geocoding && (
            <li className="p-4 text-sm text-muted-foreground">
              Add address or Google Maps links on leads to see them here.
            </li>
          )}
          {pins.map((pin) => (
            <li key={pin.id}>
              <button
                type="button"
                onClick={() => focusPin(pin)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left text-sm hover:bg-muted/50",
                  selectedId === pin.id && "bg-muted/70",
                )}
              >
                <span className="font-medium truncate">{pin.label}</span>
                {pin.sub && <span className="truncate text-xs text-muted-foreground">{pin.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative min-h-[320px] flex-1 bg-muted/20">
        {(loading || geocoding) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <div ref={mapRef} className="h-full min-h-[320px] w-full lg:min-h-[560px]" />
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function SalesMapLink({ className }: { className?: string }) {
  return (
    <Button type="button" variant="outline" size="sm" className={className} asChild>
      <Link to="/app/map">
        <MapPin className="h-4 w-4 mr-1" />
        Map view
      </Link>
    </Button>
  );
}

export function SalesMapExternalHint() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <ExternalLink className="h-3 w-3" />
      Requires Geocoding API on your Google key
    </span>
  );
}
