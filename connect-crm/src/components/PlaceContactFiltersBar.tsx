import type { PlaceContactFilters } from "@/lib/placeResultFilters";
import { cn } from "@/lib/utils";

type Props = {
  filters: PlaceContactFilters;
  onChange: (next: PlaceContactFilters) => void;
};

const ITEMS: { key: keyof PlaceContactFilters; label: string; title?: string }[] = [
  { key: "requirePhone", label: "Mobile" },
  { key: "requireWebsite", label: "Website" },
  { key: "requireAddress", label: "Address" },
  {
    key: "requireEmail",
    label: "Email",
    title: "Google Places rarely lists email; most results will hide when this is on",
  },
];

export function PlaceContactFiltersBar({ filters, onChange }: Props) {
  return (
    <div className="maps-filter-row" role="group" aria-label="Filter results by contact info">
      <span className="maps-filter-label">Has</span>
      {ITEMS.map(({ key, label, title }) => {
        const on = filters[key];
        return (
          <button
            key={key}
            type="button"
            title={title}
            className={cn("maps-filter-chip", on && "is-on")}
            aria-pressed={on}
            onClick={() => onChange({ ...filters, [key]: !on })}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
