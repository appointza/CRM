import type { ReactNode } from "react";
import { ExternalLink, Loader2, Mail, Phone, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlaceListItem } from "@/lib/googlePlaces";

type PlaceResultsListProps = {
  places: PlaceListItem[];
  loading: boolean;
  error: string;
  activeQuery: string;
  selectedQuery: string;
  onSelect: (place: PlaceListItem) => void;
  /** When filtering, total before filter */
  totalCount?: number;
  inCrmPlaceIds?: Set<string>;
  savingPlaceId?: string | null;
  onSaveOne?: (place: PlaceListItem) => void;
  saveAllSlot?: ReactNode;
};

function displayValue(value: string) {
  return value.trim() || "Address not listed";
}

export function PlaceResultsList({
  places,
  loading,
  error,
  activeQuery,
  selectedQuery,
  onSelect,
  totalCount,
  inCrmPlaceIds,
  savingPlaceId,
  onSaveOne,
  saveAllSlot,
}: PlaceResultsListProps) {
  const countLabel =
    !loading && places.length > 0
      ? totalCount != null && totalCount !== places.length
        ? `${places.length} / ${totalCount}`
        : String(places.length)
      : null;

  return (
    <section className="maps-results" aria-labelledby="place-results-title">
      <div className="maps-results-head maps-results-head-with-action">
        <div className="flex items-center gap-2">
          <h2 id="place-results-title">Results</h2>
          {countLabel && <span>{countLabel}</span>}
        </div>
        {saveAllSlot}
      </div>
      {loading && (
        <p className="maps-results-status" role="status">
          Loading places for “{activeQuery}”…
        </p>
      )}
      {error && !loading && (
        <p className="maps-results-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && places.length === 0 && activeQuery.trim() && (
        <p className="maps-results-status">
          {totalCount != null && totalCount > 0
            ? "No results match your filters. Turn off a “Has” filter or broaden the search."
            : "No places found. Try a business name with a city."}
        </p>
      )}
      {!loading && places.length > 0 && (
        <ul className="maps-results-list">
          {places.map((place) => {
            const inCrm = inCrmPlaceIds?.has(place.id);
            return (
            <li key={place.id}>
              <button
                type="button"
                className={
                  place.mapQuery === selectedQuery
                    ? "maps-result-card is-active"
                    : "maps-result-card"
                }
                onClick={() => onSelect(place)}
              >
                <div className="maps-result-copy">
                  <strong>{place.name}</strong>
                  {inCrm && <span className="maps-result-badge">In CRM</span>}
                  {(place.rating != null || place.category || place.openNow != null) && (
                    <span className="maps-result-rating">
                      {place.rating != null && <b>{place.rating.toFixed(1)}</b>}
                      {place.reviewCount != null && (
                        <span>({place.reviewCount.toLocaleString("en-IN")})</span>
                      )}
                      {place.category && <span>{place.category}</span>}
                      {place.openNow === true && (
                        <span className="maps-result-open-now">Open</span>
                      )}
                      {place.openNow === false && <span>Closed</span>}
                    </span>
                  )}
                  <span className="maps-result-address">{displayValue(place.address)}</span>
                  <span className="maps-result-meta">
                    {place.phone ? (
                      <a
                        href={`tel:${place.phone.replace(/\s/g, "")}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Phone size={12} /> {place.phone}
                      </a>
                    ) : (
                      <span>Phone not provided by source</span>
                    )}
                    {place.website ? (
                      <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {place.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span>Website not provided by source</span>
                    )}
                    {place.email?.trim() ? (
                      <a
                        href={`mailto:${place.email.trim()}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Mail size={12} /> {place.email.trim()}
                      </a>
                    ) : (
                      <span>Email not provided by source</span>
                    )}
                  </span>
                </div>
                <div className="maps-result-actions">
                  {onSaveOne && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      disabled={inCrm || savingPlaceId === place.id}
                      title={inCrm ? "Already in CRM" : "Save to CRM"}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSaveOne(place);
                      }}
                    >
                      {savingPlaceId === place.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <a
                    className="maps-result-open"
                    href={place.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${place.name} in Google Maps`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </button>
            </li>
          );
          })}
        </ul>
      )}
    </section>
  );
}
