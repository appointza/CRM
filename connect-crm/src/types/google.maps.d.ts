/* Minimal typings for Maps JavaScript API loaded via script tag. */
declare namespace google.maps {
  enum SymbolPath {
    CIRCLE = 0,
    BACKWARD_CLOSED_ARROW = 1,
  }

  class LatLngBounds {
    extend(latlng: { lat: number; lng: number }): void;
  }

  class Map {
    constructor(el: HTMLElement, opts: Record<string, unknown>);
    panTo(latlng: { lat: number; lng: number }): void;
    setZoom(z: number): void;
    getZoom(): number | undefined;
    fitBounds(bounds: LatLngBounds, padding?: number): void;
  }

  class Marker {
    constructor(opts: Record<string, unknown>);
    setMap(map: Map | null): void;
    addListener(event: string, fn: () => void): MapsEventListener;
  }

  interface MarkerLabel {
    text: string;
    color?: string;
    fontWeight?: string;
  }

  class InfoWindow {
    setContent(html: string): void;
    open(opts: { map: Map; anchor?: Marker }): void;
  }

  interface MapsEventListener {
    remove(): void;
  }

  namespace event {
    function addListenerOnce(map: Map, eventName: string, handler: () => void): MapsEventListener;
  }
}

declare const google: {
  maps: typeof google.maps;
};
