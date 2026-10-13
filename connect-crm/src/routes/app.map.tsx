import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { searchPlaces, type PlaceListItem } from "@/lib/googlePlaces";
import { PlaceContactFiltersBar } from "@/components/PlaceContactFiltersBar";
import { PlaceResultsList } from "@/components/PlaceResultsList";
import {
  emptyPlaceContactFilters,
  filterPlacesByContact,
  type PlaceContactFilters,
} from "@/lib/placeResultFilters";
import { GoogleMapView, mapLocationPresets } from "@/components/GoogleMapView";
import { placeListItemToLeadPayload } from "@/lib/mapPlaceToLead";
import { buildCrmPlaceIndex } from "@/lib/crmPlaceIndex";
import {
  deleteLead,
  getLeads,
  saveLeadsFromPlaces,
} from "@/services/crmService";
import { MapSavedLeadsPanel, type MapSavedLeadRow } from "@/components/MapSavedLeadsPanel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app/map")({
  component: SalesMapPage,
});

type ImportItem = {
  placeId?: string;
  status?: string;
  leadId?: string;
  reason?: string;
};

function SalesMapPage() {
  const { user, organization } = useAuth();
  const [mapSearchDraft, setMapSearchDraft] = useState("salon near Velachery, Chennai");
  const [mapQuery, setMapQuery] = useState(mapLocationPresets.velacherySalon);
  const [mapSelectedQuery, setMapSelectedQuery] = useState("");
  const [mapPlaces, setMapPlaces] = useState<PlaceListItem[]>([]);
  const [mapPlacesLoading, setMapPlacesLoading] = useState(false);
  const [mapPlacesError, setMapPlacesError] = useState("");
  const [contactFilters, setContactFilters] = useState<PlaceContactFilters>(
    emptyPlaceContactFilters(),
  );
  const [orgLeads, setOrgLeads] = useState<any[]>([]);
  const [inCrmPlaceIds, setInCrmPlaceIds] = useState<Set<string>>(new Set());
  const [savedRows, setSavedRows] = useState<MapSavedLeadRow[]>([]);
  const [savingAll, setSavingAll] = useState(false);
  const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);

  const filteredPlaces = useMemo(
    () => filterPlacesByContact(mapPlaces, contactFilters),
    [mapPlaces, contactFilters],
  );

  const crmIndex = useMemo(() => buildCrmPlaceIndex(orgLeads), [orgLeads]);

  const refreshLeads = useCallback(async () => {
    if (!organization?.id || !user) return;
    const rows = await getLeads(organization.id, user.role);
    setOrgLeads(rows);
  }, [organization?.id, user]);

  useEffect(() => {
    void refreshLeads();
  }, [refreshLeads]);

  useEffect(() => {
    setInCrmPlaceIds((prev) => {
      const next = new Set(prev);
      for (const p of mapPlaces) {
        if (crmIndex.placeAlreadyInCrm(p)) next.add(p.id);
      }
      return next;
    });
  }, [mapPlaces, crmIndex]);

  useEffect(() => {
    let cancelled = false;
    if (!mapQuery.trim()) {
      setMapPlaces([]);
      return;
    }
    setMapPlacesLoading(true);
    setMapPlacesError("");
    setMapSelectedQuery("");
    setContactFilters(emptyPlaceContactFilters());
    void searchPlaces(mapQuery)
      .then((places) => {
        if (!cancelled) setMapPlaces(places);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMapPlaces([]);
          setMapPlacesError(
            error instanceof Error ? error.message : "Place details could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setMapPlacesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mapQuery]);

  const applyImportResult = (items: ImportItem[], placesById: Map<string, PlaceListItem>) => {
    setInCrmPlaceIds((prev) => {
      const next = new Set(prev);
      for (const it of items) {
        if (it.placeId) next.add(it.placeId);
      }
      return next;
    });
    setSavedRows((prev) => {
      const byLead = new Map(prev.map((r) => [r.leadId, r]));
      for (const it of items) {
        if (!it.leadId) continue;
        const place = it.placeId ? placesById.get(it.placeId) : undefined;
        byLead.set(it.leadId, {
          leadId: it.leadId,
          placeId: it.placeId,
          name: place?.name ?? "Lead",
          status: it.status === "created" ? "created" : "skipped",
        });
      }
      return [...byLead.values()];
    });
  };

  const savePlaces = async (places: PlaceListItem[]) => {
    if (!organization?.id) {
      toast.error("Select an organization");
      return;
    }
    const payloads = places.map(placeListItemToLeadPayload);
    const res = await saveLeadsFromPlaces(organization.id, payloads);
    const byId = new Map(places.map((p) => [p.id, p]));
    applyImportResult((res.items ?? []) as ImportItem[], byId);
    await refreshLeads();
    toast.success(`Saved: ${res.created} new, ${res.skipped} skipped (duplicates)`);
  };

  const saveAll = async () => {
    if (filteredPlaces.length === 0) return;
    setSavingAll(true);
    try {
      await savePlaces(filteredPlaces);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingAll(false);
    }
  };

  const saveOne = async (place: PlaceListItem) => {
    setSavingPlaceId(place.id);
    try {
      await savePlaces([place]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingPlaceId(null);
    }
  };

  const removeSavedLead = async (leadId: string) => {
    setDeletingLeadId(leadId);
    try {
      await deleteLead(leadId);
      setSavedRows((prev) => prev.filter((r) => r.leadId !== leadId));
      await refreshLeads();
      toast.success("Lead deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingLeadId(null);
    }
  };

  if (!user) return null;

  const saveAllButton = (
    <Button
      type="button"
      size="sm"
      disabled={savingAll || filteredPlaces.length === 0 || mapPlacesLoading}
      onClick={() => void saveAll()}
    >
      {savingAll ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
      Save all ({filteredPlaces.length})
    </Button>
  );

  return (
    <div className="workspace map-workspace h-full min-h-0 flex-1">
      <aside className="map-results-panel" aria-label="Map search and results">
        <form
          className="maps-search-bar"
          onSubmit={(event) => {
            event.preventDefault();
            setMapQuery(mapSearchDraft.trim() || mapLocationPresets.chennai);
          }}
        >
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={mapSearchDraft}
            maxLength={200}
            placeholder="Search maps"
            aria-label="Search maps"
            onChange={(event) => setMapSearchDraft(event.target.value)}
          />
          {mapSearchDraft ? (
            <button
              type="button"
              className="maps-search-clear"
              aria-label="Clear search"
              onClick={() => {
                setMapSearchDraft("");
                setMapQuery(mapLocationPresets.chennai);
              }}
            >
              <X size={16} />
            </button>
          ) : null}
        </form>
        <div className="maps-chip-row">
          <button
            type="button"
            className="maps-chip"
            onClick={() => {
              setMapSearchDraft("salon near me");
              setMapQuery(mapLocationPresets.velacherySalon);
            }}
          >
            salon near me
          </button>
          <button
            type="button"
            className="maps-chip"
            onClick={() => {
              setMapSearchDraft(mapLocationPresets.lakmeVelachery);
              setMapQuery(mapLocationPresets.lakmeVelachery);
            }}
          >
            Lakme Salon
          </button>
          <button
            type="button"
            className="maps-chip"
            onClick={() => {
              setMapSearchDraft(mapLocationPresets.chennai);
              setMapQuery(mapLocationPresets.chennai);
            }}
          >
            Chennai
          </button>
        </div>
        <PlaceContactFiltersBar filters={contactFilters} onChange={setContactFilters} />
        <PlaceResultsList
          places={filteredPlaces}
          totalCount={mapPlaces.length}
          loading={mapPlacesLoading}
          error={mapPlacesError}
          activeQuery={mapQuery}
          selectedQuery={mapSelectedQuery}
          onSelect={(place) => setMapSelectedQuery(place.mapQuery)}
          inCrmPlaceIds={inCrmPlaceIds}
          savingPlaceId={savingPlaceId}
          onSaveOne={(place) => void saveOne(place)}
          saveAllSlot={saveAllButton}
        />
        <MapSavedLeadsPanel
          rows={savedRows}
          deletingId={deletingLeadId}
          onDelete={(id) => void removeSavedLead(id)}
        />
      </aside>
      <div className="map-panel">
        <GoogleMapView query={mapSelectedQuery || mapQuery} />
      </div>
    </div>
  );
}
