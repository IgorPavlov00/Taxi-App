import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-routing-machine';
import DriftMarker from 'leaflet-drift-marker';
import { HttpClient } from '@angular/common/http';
import { DriveService } from '../drive.service';
import { ToastrService } from "ngx-toastr";

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  @Output() rideBooked = new EventEmitter<void>();

  ride = {
    startAddress: '',
    destinationAddress: '',
    dateTime: '',
    passengerPhone: '',
    paymentMethod: '',
    cardNumber: '',
    cardExpiry: ''
  };

  showPrice = false;
  ridePrice: number | undefined;

  private map!: L.Map;
  private fromMarker!: L.Marker;
  private toMarker!: L.Marker;
  private routingControl!: L.Routing.Control;
  private driftMarker: DriftMarker | null = null;

  constructor(
    private http: HttpClient,
    private driveService: DriveService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.initMap();
  }

  initMap(): void {
    this.map = L.map('map', {
      center: [44.0165, 21.0059],
      zoom: 12
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 10,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    tiles.addTo(this.map);
  }

  bookRide(): void {
    this.updateMapFrom()
      .then(() => this.updateMapTo())
      .then(() => this.addRoutingControl())
      .then(() => {
        this.simulateDrive();
        this.calculateRidePrice();
        this.showPrice = true;
        this.rideBooked.emit(); // Emit event to notify parent component that ride is booked
        this.convertCoordinatesToAddresses();
        this.finishRide();
      })
      .catch(error => {
        console.error('Error booking ride:', error);
      });
  }

  updateMapFrom(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.fromMarker) {
        this.map.removeLayer(this.fromMarker);
      }

      const url = `https://nominatim.openstreetmap.org/search?q=${this.ride.startAddress}&format=json`;
      this.http.get(url).subscribe((data: any) => {
        const coordinates = data[0];
        this.setFrom(coordinates);
        this.map.setView(new L.LatLng(coordinates.lat, coordinates.lon), 18);
        this.fromMarker = L.marker([coordinates.lat, coordinates.lon], { draggable: false }).addTo(this.map);
        resolve();
        this.fromMarker.dragging?.disable()
      }, error => {
        reject(error);
      });
    });
  }

  updateMapTo(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.toMarker) {
        this.map.removeLayer(this.toMarker);
      }

      const url = `https://nominatim.openstreetmap.org/search?q=${this.ride.destinationAddress}&format=json`;
      this.http.get(url).subscribe((data: any) => {
        const coordinates = data[0];
        this.setTo(coordinates);
        this.map.setView(new L.LatLng(coordinates.lat, coordinates.lon), 18);
        this.toMarker = L.marker([coordinates.lat, coordinates.lon], { draggable: false }).addTo(this.map);
        resolve();
      }, error => {
        reject(error);
      });
    });
  }

  addRoutingControl(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.routingControl) {
        this.map.removeControl(this.routingControl);
      }

      const waypoints = [
        this.fromMarker.getLatLng(),
        this.toMarker.getLatLng()
      ];

      const plan = L.Routing.plan(waypoints, {
        createMarker: (i: any, wp: any, nWps: any) => {
          return new DriftMarker(wp.latLng, {
            duration: 3000,
            keepAtCenter: true,
            icon: L.icon({
              iconUrl: 'assets/car.png',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            }),
            draggable: false // Ensure the drift marker is not draggable
          }).addTo(this.map);
        }
      });

      this.routingControl = L.Routing.control({
        waypoints: waypoints,
        plan: plan,
        routeWhileDragging: true,
        showAlternatives: true,
        lineOptions: {
          extendToWaypoints: true,
          missingRouteTolerance: 100,
          styles: [
            {
              color: '#1E90FF',
              opacity: 0.7,
              weight: 5
            }
          ]
        }
      });

      this.routingControl.on('routesfound', () => {
        resolve();
      });

      this.routingControl.addTo(this.map);
    });
  }

  simulateDrive(): void {


    const self = this;
    const waypoints = this.routingControl.getWaypoints();


    var marker = L.marker(this.fromMarker.getLatLng(), {icon: L.icon({iconUrl: 'https://cdn-icons-png.flaticon.com/128/7991/7991029.png', iconSize: [32, 32], iconAnchor: [16, 16]})}).addTo(this.map);

    var fromMarker = this.fromMarker;
    var toMarker = this.toMarker;


    L.Routing.control({
      waypoints: [
        L.latLng(fromMarker.getLatLng()),
        L.latLng(toMarker.getLatLng())
      ],
      lineOptions: {
        extendToWaypoints: true,
        missingRouteTolerance: 100,
        styles: [
          {
            color: '#1E90FF',
            opacity: 0.7,
            weight: 5
          }
        ]
      }
    }).on('routesfound', function (e: { routes: { coordinates: any[]; }[]; }) {
      var routes = e.routes;
      console.log(routes);

      e.routes[0].coordinates.forEach(function (coord, index) {
        setTimeout(function () {
          marker.setLatLng([coord.lat, coord.lng]);

          if (index == e.routes[0].coordinates.length - 1) {
            // Animation is complete, remove markers

          }
        }, 300 * index)
      })

    }).addTo(this.map);
  }



  setFrom(data: any): void {
    this.ride.startAddress = `${data.lat}, ${data.lon}`;
  }

  setTo(data: any): void {
    this.ride.destinationAddress = `${data.lat}, ${data.lon}`;
  }

  convertCoordinatesToAddresses(): void {
    const fromUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${this.fromMarker.getLatLng().lat}&lon=${this.fromMarker.getLatLng().lng}&zoom=18&addressdetails=1`;
    const toUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${this.toMarker.getLatLng().lat}&lon=${this.toMarker.getLatLng().lng}&zoom=18&addressdetails=1`;

    this.http.get(fromUrl).subscribe((fromData: any) => {
      this.ride.startAddress = fromData.display_name;

      this.http.get(toUrl).subscribe((toData: any) => {
        this.ride.destinationAddress = toData.display_name;

        // After setting the addresses, save the ride
        const rideDetails = {
          ...this.ride,
          dateTime: new Date(this.ride.dateTime).toISOString(), // Convert date to ISO format
          price: this.ridePrice
        };

        this.driveService.saveDrive(rideDetails);
      });
    });
  }

  calculateRidePrice(): void {
    const distance = this.calculateDistance();
    // Simulate ride price calculation based on distance
    this.ridePrice = Math.floor(distance * 400);
  }

  calculateDistance(): number {
    // Get latitudes and longitudes
    const lat1 = parseFloat(this.ride.startAddress.split(',')[0]);
    const lon1 = parseFloat(this.ride.startAddress.split(',')[1]);
    const lat2 = parseFloat(this.ride.destinationAddress.split(',')[0]);
    const lon2 = parseFloat(this.ride.destinationAddress.split(',')[1]);

    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  finishRide(): void {
    this.toastr.success('Ride completed. Price: ' + this.ridePrice+' RSD', 'Finished!');
  }
  backtoHome(): void {
    window.location.href = '/';

  }
}

