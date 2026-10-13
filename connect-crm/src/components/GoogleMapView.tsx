import { useMemo } from "react";

const DEFAULT_QUERY = "Chennai, Tamil Nadu, India";

function googleMapsEmbedUrl(query: string) {
  const params = new URLSearchParams({
    q: query.trim() || DEFAULT_QUERY,
    z: "14",
    output: "embed",
    hl: "en",
  });
  return `https://www.google.com/maps?${params.toString()}`;
}

type GoogleMapViewProps = {
  query: string;
};

export function GoogleMapView({ query }: GoogleMapViewProps) {
  const resolvedQuery = query.trim() || DEFAULT_QUERY;
  const embedUrl = useMemo(() => googleMapsEmbedUrl(resolvedQuery), [resolvedQuery]);

  return (
    <iframe
      key={embedUrl}
      className="google-map-frame"
      title={`Map — ${resolvedQuery}`}
      src={embedUrl}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

export const mapLocationPresets = {
  velacherySalon: "salon near Velachery, Chennai",
  lakmeVelachery:
    "Lakme Salon, Bus Terminus, 16, Sarathi Nagar 2nd St, near Vijayanagar, LIC Colony, Velachery, Chennai, Tamil Nadu 600042, India",
  chennai: DEFAULT_QUERY,
} as const;
