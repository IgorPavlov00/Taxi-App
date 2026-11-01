import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { Observable, Subscription, forkJoin, map, of, switchMap } from 'rxjs';
import { AddressInputComponent } from '../address-input/address-input.component';
import { DriveService } from '../drive.service';
import { GeoService, HOME } from '../geo.service';
import {
  FARE_PER_KM_RSD, PaymentMethod, Place, Ride, RoutePlan,
  cumulativeDistances, fareFor, formatDuration, positionAlong, simulationMillis,
} from '../ride';

type Stage = 'plan' | 'quote' | 'driving' | 'done';
type PinKind = 'pickup' | 'destination';

const MIN_ROUTE_KM = 0.05;
const UI_UPDATE_INTERVAL_MS = 200;
const REDUCED_MOTION_DRIVE_MS = 4000;
const STALE_DEPARTURE_MS = 5 * 60 * 1000;

const PINS: Record<PinKind | 'car', L.DivIconOptions> = {
  pickup: {
    className: 'pin pin-pickup',
    html: '<span></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  },
  destination: {
    className: 'pin pin-destination',
    html: '<svg width="32" height="40" viewBox="0 0 32 40"><path d="M16 1C7.700 1 1 7.700 1 16c0 10.500 15 23 15 23s15-12.500 15-23C31 7.700 24.300 1 16 1Z" fill="#ffc72c" stroke="#0e1526" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="#0e1526"/></svg>',
    iconSize: [32, 40],
    iconAnchor: [16, 39],
  },
  car: {
    className: 'pin pin-car',
    html: '<svg width="26" height="44" viewBox="0 0 26 44"><rect x="1" y="1" width="24" height="42" rx="8" fill="#ffc72c" stroke="#0e1526" stroke-width="2"/><path d="M5 15c5-3 11-3 16 0l-2 6H7Z" fill="#0e1526"/><path d="M7 33h12l2 4c-5 2-11 2-16 0Z" fill="#0e1526"/><rect x="8" y="24" width="10" height="4" rx="1" fill="#0e1526"/></svg>',
    iconSize: [26, 44],
    iconAnchor: [13, 22],
  },
};

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AddressInputComponent],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLElement>;

  readonly farePerKm = FARE_PER_KM_RSD;
  readonly formatDuration = formatDuration;

  stage: Stage = 'plan';
  locating = false;
  error = '';

  pickup: Place | null = null;
  destination: Place | null = null;
  pickupText = '';
  destinationText = '';

  route: RoutePlan | null = null;
  fare = 0;

  departure = this.localNow();
  phone = '';
  payment: PaymentMethod = 'Cash';

  progress = 0;
  completedRide: Ride | null = null;

  private map?: L.Map;
  private pins: Partial<Record<PinKind, L.Marker>> = {};
  private routeLayer?: L.LayerGroup;
  private travelled?: L.Polyline;
  private car?: L.Marker;
  private frame = 0;
  private lookup?: Subscription;
  private resizeObserver?: ResizeObserver;
  private destroyed = false;

  constructor(
    private geo: GeoService,
    private drives: DriveService,
    private zone: NgZone,
  ) {}

  get departureIsStale(): boolean {
    return Date.parse(this.departure) < Date.now() - STALE_DEPARTURE_MS;
  }

  get remainingKm(): number {
    return (this.route?.distanceKm ?? 0) * (1 - this.progress);
  }

  get remainingMin(): number {
    return (this.route?.durationMin ?? 0) * (1 - this.progress);
  }

  ngAfterViewInit(): void {
    // Keep Leaflet's constant mouse and animation events from triggering change detection.
    this.zone.runOutsideAngular(() => {
      this.map = L.map(this.mapEl.nativeElement, { center: HOME, zoom: 13 });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.map);
      this.map.on('click', (event: L.LeafletMouseEvent) => this.zone.run(() => this.onMapClick(event.latlng)));

      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
      this.resizeObserver.observe(this.mapEl.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.lookup?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  onTextChange(kind: PinKind, text: string): void {
    this.error = '';
    if (kind === 'pickup') {
      this.pickupText = text;
      this.pickup = null;
    } else {
      this.destinationText = text;
      this.destination = null;
    }
    this.setPin(kind, null);
  }

  onPlaceSelected(kind: PinKind, place: Place): void {
    this.error = '';
    this.assign(kind, place);
    this.setPin(kind, place);
    this.frameMap();
  }

  swap(): void {
    [this.pickup, this.destination] = [this.destination, this.pickup];
    [this.pickupText, this.destinationText] = [this.destinationText, this.pickupText];
    this.setPin('pickup', this.pickup);
    this.setPin('destination', this.destination);
  }

  findRoute(): void {
    if (this.locating) {
      return;
    }
    this.error = '';
    if (!this.pickupText.trim() || !this.destinationText.trim()) {
      this.error = 'Enter both a pickup and a destination.';
      return;
    }

    this.locating = true;
    this.lookup = forkJoin([
      this.resolve(this.pickup, this.pickupText),
      this.resolve(this.destination, this.destinationText),
    ]).pipe(
      switchMap(([from, to]) => {
        const missing = !from ? this.pickupText : !to ? this.destinationText : null;
        if (!from || !to) {
          throw new AddressNotFound(missing ?? '');
        }
        this.onPlaceSelected('pickup', from);
        this.onPlaceSelected('destination', to);
        return this.geo.route(from, to);
      }),
    ).subscribe({
      next: route => this.showQuote(route),
      error: err => {
        this.locating = false;
        this.error = this.describeError(err);
      },
    });
  }

  backToPlan(): void {
    this.clearRoute();
    this.route = null;
    this.stage = 'plan';
  }

  startRide(): void {
    const route = this.route;
    const activeMap = this.map;
    if (!route || !activeMap) {
      return;
    }
    const totals = cumulativeDistances(route.path);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? REDUCED_MOTION_DRIVE_MS : simulationMillis(route.durationMin);

    this.progress = 0;
    this.stage = 'driving';

    this.zone.runOutsideAngular(() => {
      this.travelled = L.polyline([], { color: '#98a2b3', weight: 6, opacity: 1 }).addTo(activeMap);
      this.car = L.marker(route.path[0], { icon: L.divIcon(PINS.car), interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(activeMap);
      const carSvg = this.car.getElement()?.querySelector('svg');

      const startedAt = performance.now();
      let lastUiUpdate = startedAt;
      const tick = (now: number) => {
        if (this.destroyed || this.stage !== 'driving') {
          return;
        }
        const progress = Math.min((now - startedAt) / duration, 1);
        const position = positionAlong(route.path, totals, progress);
        this.car?.setLatLng(position.point);
        if (carSvg) {
          carSvg.style.transform = `rotate(${position.bearing}deg)`;
        }
        this.travelled?.setLatLngs([...route.path.slice(0, position.segment + 1), position.point]);

        if (progress >= 1) {
          this.zone.run(() => this.finishRide());
          return;
        }
        if (now - lastUiUpdate >= UI_UPDATE_INTERVAL_MS) {
          lastUiUpdate = now;
          this.zone.run(() => this.progress = progress);
        }
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    });
  }

  cancelRide(): void {
    cancelAnimationFrame(this.frame);
    this.removeDriveLayers();
    this.progress = 0;
    this.stage = 'quote';
  }

  finishRide(): void {
    const route = this.route;
    if (!route || !this.pickup || !this.destination || this.stage !== 'driving') {
      return;
    }
    cancelAnimationFrame(this.frame);
    const end = route.path[route.path.length - 1];
    this.car?.setLatLng(end);
    this.travelled?.setLatLngs(route.path);
    this.progress = 1;
    this.completedRide = this.drives.saveDrive({
      startAddress: this.pickup.label,
      destinationAddress: this.destination.label,
      dateTime: new Date(this.departure).toISOString(),
      passengerPhone: this.phone.trim(),
      paymentMethod: this.payment,
      price: this.fare,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
    });
    this.stage = 'done';
  }

  bookAnother(): void {
    this.clearRoute();
    this.setPin('pickup', null);
    this.setPin('destination', null);
    this.pickup = this.destination = this.route = this.completedRide = null;
    this.pickupText = this.destinationText = '';
    this.departure = this.localNow();
    this.progress = 0;
    this.stage = 'plan';
  }

  private onMapClick(latlng: L.LatLng): void {
    if (this.stage !== 'plan' || this.locating || (this.pickup && this.destination)) {
      return;
    }
    const kind: PinKind = this.pickup ? 'destination' : 'pickup';
    const pinned: Place = {
      label: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`,
      lat: latlng.lat,
      lng: latlng.lng,
    };
    this.onPlaceSelected(kind, pinned);

    // The pin works with raw coordinates; swap in a street name if one arrives while it's still selected.
    this.geo.reverse(latlng.lat, latlng.lng).subscribe({
      next: place => {
        if (place?.label && (kind === 'pickup' ? this.pickup : this.destination) === pinned) {
          this.assign(kind, { ...pinned, label: place.label });
        }
      },
      error: () => undefined,
    });
  }

  private assign(kind: PinKind, place: Place): void {
    if (kind === 'pickup') {
      this.pickup = place;
      this.pickupText = place.label;
    } else {
      this.destination = place;
      this.destinationText = place.label;
    }
  }

  private resolve(place: Place | null, text: string): Observable<Place | undefined> {
    return place ? of(place) : this.geo.search(text.trim()).pipe(map(results => results[0]));
  }

  private showQuote(route: RoutePlan): void {
    this.locating = false;
    if (route.distanceKm < MIN_ROUTE_KM || route.path.length < 2) {
      this.error = 'Pickup and destination are the same place. Choose a different destination.';
      return;
    }
    this.route = route;
    this.fare = fareFor(route.distanceKm);
    this.departure = this.localNow();
    this.stage = 'quote';
    this.drawRoute(route);
  }

  private drawRoute(route: RoutePlan): void {
    this.clearRoute();
    this.zone.runOutsideAngular(() => {
      if (!this.map) {
        return;
      }
      this.routeLayer = L.layerGroup([
        L.polyline(route.path, { color: '#ffffff', weight: 10, opacity: .9 }),
        L.polyline(route.path, { color: '#0f62fe', weight: 6 }),
      ]).addTo(this.map);
      this.map.fitBounds(L.latLngBounds(route.path), { padding: [56, 56] });
    });
  }

  private clearRoute(): void {
    cancelAnimationFrame(this.frame);
    this.removeDriveLayers();
    this.routeLayer?.remove();
    this.routeLayer = undefined;
  }

  private removeDriveLayers(): void {
    this.car?.remove();
    this.travelled?.remove();
    this.car = undefined;
    this.travelled = undefined;
  }

  private setPin(kind: PinKind, place: Place | null): void {
    this.zone.runOutsideAngular(() => {
      this.pins[kind]?.remove();
      this.pins[kind] = undefined;
      if (place && this.map) {
        this.pins[kind] = L.marker([place.lat, place.lng], { icon: L.divIcon(PINS[kind]), keyboard: false }).addTo(this.map);
      }
    });
  }

  private frameMap(): void {
    this.zone.runOutsideAngular(() => {
      if (this.pickup && this.destination) {
        this.map?.fitBounds(L.latLngBounds([
          [this.pickup.lat, this.pickup.lng],
          [this.destination.lat, this.destination.lng],
        ]), { padding: [56, 56], maxZoom: 16 });
      } else {
        const place = this.pickup ?? this.destination;
        if (place) {
          this.map?.setView([place.lat, place.lng], Math.max(this.map.getZoom(), 15));
        }
      }
    });
  }

  private describeError(err: unknown): string {
    if (err instanceof AddressNotFound) {
      return `We couldn't find "${err.address}". Try adding the city, or tap the spot on the map.`;
    }
    if (err instanceof HttpErrorResponse && err.error?.code === 'NoRoute'
      || err instanceof Error && err.message.includes('NoRoute')) {
      return 'There is no road route between these two places. Try somewhere closer.';
    }
    return 'The map service is not responding right now. Please try again in a moment.';
  }

  /** The current time in the format a datetime-local input expects. */
  private localNow(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
}

class AddressNotFound extends Error {
  constructor(readonly address: string) {
    super(`Address not found: ${address}`);
  }
}
