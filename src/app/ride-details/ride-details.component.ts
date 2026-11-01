import { Component, Input } from '@angular/core';
import { Ride, formatDuration } from '../ride';

@Component({
  selector: 'app-ride-details',
  template: `
    <dl *ngIf="ride">
      <div class="wide"><dt>From</dt><dd>{{ ride.startAddress }}</dd></div>
      <div class="wide"><dt>To</dt><dd>{{ ride.destinationAddress }}</dd></div>
      <div><dt>Departure</dt><dd>{{ ride.dateTime | date:'d MMM y, HH:mm' }}</dd></div>
      <div><dt>Phone</dt><dd>{{ ride.passengerPhone }}</dd></div>
      <div><dt>Payment</dt><dd>{{ ride.paymentMethod }}</dd></div>
      <div><dt>Fare</dt><dd>{{ ride.price | number:'1.0-0' }} RSD</dd></div>
      <div *ngIf="ride.distanceKm"><dt>Distance</dt><dd>{{ ride.distanceKm | number:'1.1-1' }} km</dd></div>
      <div *ngIf="ride.durationMin"><dt>Time</dt><dd>{{ formatDuration(ride.durationMin) }}</dd></div>
    </dl>
  `,
  styles: [`
    dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 0; }
    .wide { grid-column: 1 / -1; }
    dt { color: var(--ink-faint); font-size: .8rem; font-weight: 600; }
    dd { margin: 2px 0 0; font-weight: 600; overflow-wrap: anywhere; }
  `],
})
export class RideDetailsComponent {
  @Input() ride: Ride | null = null;

  readonly formatDuration = formatDuration;
}
