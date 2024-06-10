import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ride-details',
  template: `
    <form>
      <div class="form-group" *ngIf="ride?.startAddress">
        <label for="startAddress">Start Address</label>
        <input type="text" class="form-control" id="startAddress" [value]="ride?.startAddress" readonly>
      </div>
      <div class="form-group" *ngIf="ride?.destinationAddress">
        <label for="destinationAddress">Destination Address</label>
        <input type="text" class="form-control" id="destinationAddress" [value]="ride?.destinationAddress" readonly>
      </div>
      <div class="form-group" *ngIf="ride?.dateTime">
        <label for="dateTime">Date & Time</label>
        <input type="text" class="form-control" id="dateTime" [value]="ride?.dateTime" readonly>
      </div>
      <div class="form-group" *ngIf="ride?.passengerPhone">
        <label for="passengerPhone">Passenger Phone</label>
        <input type="text" class="form-control" id="passengerPhone" [value]="ride?.passengerPhone" readonly>
      </div>
      <div class="form-group" *ngIf="ride?.paymentMethod">
        <label for="paymentMethod">Payment Method</label>
        <input type="text" class="form-control" id="paymentMethod" [value]="ride?.paymentMethod" readonly>
      </div>
      <div class="form-group" *ngIf="ride?.cardNumber">
        <label for="cardNumber">Card Number</label>
        <input type="text" class="form-control" id="cardNumber" [value]="ride?.cardNumber" readonly>
      </div>
      <div class="form-group" *ngIf="ride?.cardExpiry">
        <label for="cardExpiry">Card Expiry</label>
        <input type="text" class="form-control" id="cardExpiry" [value]="ride?.cardExpiry" readonly>
      </div>
      <div class="form-group" *ngIf="ride?.price">
        <label for="price">Price</label>
        <input type="text" class="form-control" id="price" [value]="ride?.price + ' RSD'" readonly>
      </div>

    </form>
  `,
})
export class RideDetailsComponent {
  @Input() ride: any;

  constructor() {}
}
