import { cellToBoundary, cellToLatLng, latLngToCell } from "h3-js";
import L from "leaflet";

export function latLngToH3(latLng: L.LatLngExpression, res: number): string {
  const ll = L.latLng(latLng);
  return latLngToCell(ll.lat, ll.lng, res);
}

export function h3ToGeo(h3Index: string): L.LatLngLiteral {
  const geo = cellToLatLng(h3Index);
  return { lat: geo[0], lng: geo[1] };
}

export function latLngBoundsToH3(
  bounds: L.LatLngBounds,
  res: number
): string[] {
  const h3Indexes = new Set<string>();
  const northEast = bounds.getNorthEast();
  const southWest = bounds.getSouthWest();
  const latStep = (northEast.lat - southWest.lat) / 50;
  const lngStep = (northEast.lng - southWest.lng) / 50;

  for (let lat = southWest.lat; lat <= northEast.lat; lat += latStep) {
    for (let lng = southWest.lng; lng <= northEast.lng; lng += lngStep) {
      h3Indexes.add(latLngToH3(L.latLng(lat, lng), res));
    }
  }

  return Array.from(h3Indexes);
}

export function h3ToGeoBoundary(h3Index: string): L.LatLngLiteral[] {
  // Use the modern cellToBoundary function
  const boundary = cellToBoundary(h3Index);
  return boundary.map((coord) => ({ lat: coord[0], lng: coord[1] }));
}
