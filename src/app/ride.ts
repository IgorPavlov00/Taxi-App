export type LatLngTuple = [number, number];
export type PaymentMethod = 'Cash' | 'Card';

export interface Ride {
  id: string;
  startAddress: string;
  destinationAddress: string;
  dateTime: string;
  passengerPhone: string;
  paymentMethod: string;
  price: number;
  /** Absent on rides saved before road distance was tracked. */
  distanceKm?: number;
  durationMin?: number;
}

export interface Place {
  label: string;
  lat: number;
  lng: number;
}

export interface RoutePlan {
  distanceKm: number;
  durationMin: number;
  path: LatLngTuple[];
}

export interface RoutePosition {
  point: LatLngTuple;
  bearing: number;
  /** Index of the last path vertex already passed. */
  segment: number;
}

export const FARE_PER_KM_RSD = 400;

export function fareFor(distanceKm: number): number {
  return Math.round(distanceKm * FARE_PER_KM_RSD);
}

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => deg * Math.PI / 180;

export function distanceMeters(a: LatLngTuple, b: LatLngTuple): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function bearingDegrees(a: LatLngTuple, b: LatLngTuple): number {
  const dLng = toRad(b[1] - a[1]);
  const y = Math.sin(dLng) * Math.cos(toRad(b[0]));
  const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/** Running distance from the start of the path to each vertex, in metres. */
export function cumulativeDistances(path: LatLngTuple[]): number[] {
  const totals = [0];
  for (let i = 1; i < path.length; i++) {
    totals.push(totals[i - 1] + distanceMeters(path[i - 1], path[i]));
  }
  return totals;
}

/** Where a vehicle is after covering `progress` (0-1) of the path's length. */
export function positionAlong(path: LatLngTuple[], totals: number[], progress: number): RoutePosition {
  const target = Math.min(Math.max(progress, 0), 1) * totals[totals.length - 1];
  let i = 0;
  while (i < path.length - 2 && totals[i + 1] < target) {
    i++;
  }
  const next = Math.min(i + 1, path.length - 1);
  const a = path[i];
  const b = path[next];
  const span = totals[next] - totals[i];
  const t = span > 0 ? (target - totals[i]) / span : 0;
  return {
    point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    bearing: bearingDegrees(a, b),
    segment: i,
  };
}

/** Real trips would be too long to watch: a minute of driving plays in 1.5s, within limits. */
export function simulationMillis(durationMin: number): number {
  return Math.min(Math.max(durationMin * 1500, 12000), 45000);
}

export function formatDuration(minutes: number): string {
  const total = Math.max(1, Math.round(minutes));
  const hours = Math.floor(total / 60);
  return hours ? `${hours} h ${total % 60} min` : `${total} min`;
}
