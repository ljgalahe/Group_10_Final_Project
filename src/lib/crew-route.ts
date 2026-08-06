/**
 * Day-route planning: cluster nearby stops, order from the yard, fetch road geometry.
 */

import { DEMO_YARD } from "@/lib/demo-org";

export type LatLng = { lat: number; lng: number };

export type RouteStop = LatLng & { id: string };

const EARTH_KM = 6371;
/** Soft cap for a single crew day before we drop outliers. */
export const MAX_DAY_STOPS = 8;
/** Prefer not to stretch a day beyond this km from the growing cluster centroid. */
const CLUSTER_RADIUS_KM = 12;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function centroid(points: LatLng[]): LatLng {
  if (points.length === 0) return { lat: DEMO_YARD.lat, lng: DEMO_YARD.lng };
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

/**
 * Pick a compact, economical day set: start nearest the yard, then add the
 * stop that is closest to the current cluster (keeps driving tight).
 */
export function selectEconomicalStops<T extends RouteStop>(
  stops: T[],
  opts?: { maxStops?: number; yard?: LatLng }
): T[] {
  if (stops.length === 0) return [];
  const yard = opts?.yard ?? DEMO_YARD;
  const maxStops = opts?.maxStops ?? MAX_DAY_STOPS;
  if (stops.length <= maxStops) return [...stops];

  const remaining = [...stops];
  const chosen: T[] = [];

  remaining.sort(
    (a, b) => haversineKm(yard, a) - haversineKm(yard, b)
  );
  chosen.push(remaining.shift()!);

  while (remaining.length > 0 && chosen.length < maxStops) {
    const center = centroid(chosen);
    remaining.sort((a, b) => {
      const da = haversineKm(center, a) + haversineKm(yard, a) * 0.15;
      const db = haversineKm(center, b) + haversineKm(yard, b) * 0.15;
      return da - db;
    });
    const next = remaining[0];
    if (haversineKm(center, next) > CLUSTER_RADIUS_KM && chosen.length >= 3) {
      break;
    }
    chosen.push(remaining.shift()!);
  }

  return chosen;
}

/** Nearest-neighbor tour starting at the yard (does not return to yard). */
export function orderStopsFromYard<T extends RouteStop>(
  stops: T[],
  yard: LatLng = DEMO_YARD
): T[] {
  if (stops.length <= 1) return [...stops];
  const remaining = [...stops];
  const ordered: T[] = [];
  let current: LatLng = yard;

  while (remaining.length > 0) {
    remaining.sort(
      (a, b) => haversineKm(current, a) - haversineKm(current, b)
    );
    const next = remaining.shift()!;
    ordered.push(next);
    current = next;
  }

  return twoOptImprove(ordered, yard);
}

function pathLengthKm<T extends RouteStop>(ordered: T[], yard: LatLng): number {
  let total = 0;
  let prev: LatLng = yard;
  for (const stop of ordered) {
    total += haversineKm(prev, stop);
    prev = stop;
  }
  return total;
}

/** Simple 2-opt to shorten the yard→stops path. */
function twoOptImprove<T extends RouteStop>(ordered: T[], yard: LatLng): T[] {
  const route = [...ordered];
  if (route.length < 4) return route;
  let improved = true;
  let guard = 0;
  while (improved && guard < 40) {
    improved = false;
    guard += 1;
    for (let i = 0; i < route.length - 1; i += 1) {
      for (let k = i + 1; k < route.length; k += 1) {
        const candidate = [
          ...route.slice(0, i),
          ...route.slice(i, k + 1).reverse(),
          ...route.slice(k + 1),
        ];
        if (pathLengthKm(candidate, yard) + 0.01 < pathLengthKm(route, yard)) {
          route.splice(0, route.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return route;
}

export type RoadRouteResult = {
  coordinates: [number, number][]; // [lat, lng] for Leaflet
  distanceMeters: number;
  durationSeconds: number;
};

/**
 * Driving polyline via public OSRM. Coordinates are yard first, then stops.
 * Falls back to straight segments if the request fails.
 */
export async function fetchRoadRoute(
  waypoints: LatLng[]
): Promise<RoadRouteResult | null> {
  if (waypoints.length < 2) return null;

  const path = waypoints
    .map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`)
    .join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) return straightFallback(waypoints);
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry?: { coordinates: [number, number][] };
      }>;
    };
    const route = data.routes?.[0];
    const coords = route?.geometry?.coordinates;
    if (!route || !coords?.length || data.code !== "Ok") {
      return straightFallback(waypoints);
    }
    return {
      coordinates: coords.map(([lng, lat]) => [lat, lng]),
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch {
    return straightFallback(waypoints);
  }
}

function straightFallback(waypoints: LatLng[]): RoadRouteResult {
  let distanceMeters = 0;
  for (let i = 1; i < waypoints.length; i += 1) {
    distanceMeters += haversineKm(waypoints[i - 1], waypoints[i]) * 1000;
  }
  return {
    coordinates: waypoints.map((p) => [p.lat, p.lng]),
    distanceMeters,
    durationSeconds: distanceMeters / 11.1, // ~40 km/h
  };
}

export function formatDriveSummary(route: RoadRouteResult | null): string {
  if (!route) return "";
  const miles = route.distanceMeters / 1609.34;
  const mins = Math.round(route.durationSeconds / 60);
  return `${miles.toFixed(1)} mi · ~${mins} min drive`;
}
