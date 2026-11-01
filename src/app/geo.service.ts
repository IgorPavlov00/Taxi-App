import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { LatLngTuple, Place, RoutePlan } from './ride';

/** Kragujevac: the map's home, and where address search looks first. */
export const HOME: LatLngTuple = [44.0165, 20.9114];

const PHOTON_URL = 'https://photon.komoot.io';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const REQUEST_TIMEOUT_MS = 10000;

interface PhotonResponse {
  features: {
    geometry: { coordinates: [number, number] };
    properties: Record<string, string | undefined>;
  }[];
}

interface OsrmResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }[];
}

@Injectable({ providedIn: 'root' })
export class GeoService {
  constructor(private http: HttpClient) {}

  search(query: string): Observable<Place[]> {
    const params = { q: query, limit: 5, lat: HOME[0], lon: HOME[1], lang: 'en' };
    return this.http.get<PhotonResponse>(`${PHOTON_URL}/api/`, { params }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map(response => this.toPlaces(response)),
    );
  }

  reverse(lat: number, lng: number): Observable<Place | undefined> {
    return this.http.get<PhotonResponse>(`${PHOTON_URL}/reverse`, { params: { lat, lon: lng, lang: 'en' } }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map(response => this.toPlaces(response)[0]),
    );
  }

  route(from: Place, to: Place): Observable<RoutePlan> {
    const url = `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}`;
    return this.http.get<OsrmResponse>(url, { params: { overview: 'full', geometries: 'geojson' } }).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map(response => {
        const route = response.routes?.[0];
        if (response.code !== 'Ok' || !route) {
          throw new Error(`No route: ${response.code}`);
        }
        return {
          distanceKm: route.distance / 1000,
          durationMin: route.duration / 60,
          path: route.geometry.coordinates.map(([lng, lat]): LatLngTuple => [lat, lng]),
        };
      }),
    );
  }

  private toPlaces(response: PhotonResponse): Place[] {
    const places = response.features.map(feature => ({
      label: this.labelFor(feature.properties),
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
    }));
    return places.filter((place, i) => places.findIndex(other => other.label === place.label) === i);
  }

  private labelFor(p: Record<string, string | undefined>): string {
    const street = p['street'] ? [p['street'], p['housenumber']].filter(Boolean).join(' ') : undefined;
    const parts = [p['name'], street, p['city'] ?? p['county'], p['country']];
    return parts.filter((part, i) => part && parts.indexOf(part) === i).join(', ');
  }
}
