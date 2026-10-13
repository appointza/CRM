import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MapSavedLeadRow = {
  leadId: string;
  placeId?: string;
  name: string;
  status: "created" | "skipped";
};

type Props = {
  rows: MapSavedLeadRow[];
  deletingId: string | null;
  onDelete: (leadId: string) => void;
};

export function MapSavedLeadsPanel({ rows, deletingId, onDelete }: Props) {
  if (rows.length === 0) return null;

  return (
    <section className="map-leads-panel" aria-labelledby="map-saved-leads-title">
      <div className="map-leads-head">
        <div>
          <h2 id="map-saved-leads-title">Saved to CRM</h2>
          <p>
            Leads from this map session. Remove any you do not need — deletes from your database on
            the server.
          </p>
        </div>
      </div>
      <ul className="map-leads-list">
        {rows.map((row) => (
          <li key={row.leadId} className="map-leads-row">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{row.name}</div>
              <div className="text-xs text-muted-foreground">
                {row.status === "skipped" ? "Already in CRM (duplicate skipped)" : "New lead"}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive hover:text-destructive"
              aria-label={`Delete ${row.name}`}
              disabled={deletingId === row.leadId}
              onClick={() => onDelete(row.leadId)}
            >
              {deletingId === row.leadId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
