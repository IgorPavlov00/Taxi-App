import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DriveService } from '../drive.service';
import { Place } from '../ride';
import { MapComponent } from './map.component';

describe('MapComponent', () => {
  const from: Place = { label: 'Pickup St 1', lat: 44, lng: 20.9 };
  const to: Place = { label: 'Destination St 2', lat: 44.02, lng: 20.92 };
  const osrmOk = {
    code: 'Ok',
    routes: [{ distance: 3200, duration: 480, geometry: { coordinates: [[20.9, 44], [20.91, 44.01], [20.92, 44.02]] } }],
  };

  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let http: HttpTestingController;

  const isRoute = (url: string) => url.includes('project-osrm');
  const isSearch = (url: string) => url.includes('photon.komoot.io/api');

  beforeEach(() => {
    localStorage.removeItem('bookedDrives');
    TestBed.configureTestingModule({
      imports: [MapComponent, HttpClientTestingModule, RouterTestingModule],
    });
    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    localStorage.removeItem('bookedDrives');
  });

  function selectBoth(): void {
    component.onPlaceSelected('pickup', from);
    component.onPlaceSelected('destination', to);
  }

  it('prices the quote from the road distance', () => {
    selectBoth();
    component.findRoute();
    http.expectOne(r => isRoute(r.url)).flush(osrmOk);

    expect(component.stage).toBe('quote');
    expect(component.fare).toBe(1280);
  });

  it('explains when an address cannot be found, instead of hanging', () => {
    component.onTextChange('pickup', 'Nowhere at all');
    component.onPlaceSelected('destination', to);
    component.findRoute();
    http.expectOne(r => isSearch(r.url)).flush({ features: [] });

    expect(component.stage).toBe('plan');
    expect(component.locating).toBeFalse();
    expect(component.error).toContain('Nowhere at all');
  });

  it('explains when the route service fails', () => {
    selectBoth();
    component.findRoute();
    http.expectOne(r => isRoute(r.url)).flush('down', { status: 503, statusText: 'Unavailable' });

    expect(component.stage).toBe('plan');
    expect(component.error).toContain('not responding');
  });

  it('rejects a route with no real distance', () => {
    selectBoth();
    component.findRoute();
    http.expectOne(r => isRoute(r.url)).flush({
      code: 'Ok',
      routes: [{ distance: 0, duration: 0, geometry: { coordinates: [[20.9, 44], [20.9, 44]] } }],
    });

    expect(component.stage).toBe('plan');
    expect(component.error).toContain('same place');
  });

  it('only saves a ride once it has finished, without any card data', () => {
    const drives = TestBed.inject(DriveService);
    selectBoth();
    component.findRoute();
    http.expectOne(r => isRoute(r.url)).flush(osrmOk);
    component.phone = '+381601234567';
    component.payment = 'Card';

    component.startRide();
    expect(component.stage).toBe('driving');
    expect(drives.getTotalDrivesCount()).toBe(0);

    component.finishRide();
    expect(component.stage).toBe('done');
    const [saved] = drives.getDrives();
    expect(saved.startAddress).toBe(from.label);
    expect(saved.price).toBe(1280);
    expect(saved.paymentMethod).toBe('Card');
    expect(Object.keys(saved).join()).not.toMatch(/card/i);
  });

  it('does not save a cancelled ride', () => {
    selectBoth();
    component.findRoute();
    http.expectOne(r => isRoute(r.url)).flush(osrmOk);
    component.startRide();
    component.cancelRide();

    expect(component.stage).toBe('quote');
    expect(TestBed.inject(DriveService).getTotalDrivesCount()).toBe(0);
  });

  it('asks for both addresses before looking anything up', fakeAsync(() => {
    component.findRoute();
    tick();
    expect(component.error).toContain('both');
    http.expectNone(() => true);
  }));
});
