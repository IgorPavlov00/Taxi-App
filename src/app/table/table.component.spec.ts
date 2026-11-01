import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DriveService } from '../drive.service';
import { RideDetailsComponent } from '../ride-details/ride-details.component';
import { TableComponent } from './table.component';

describe('TableComponent', () => {
  let fixture: ComponentFixture<TableComponent>;
  let component: TableComponent;

  function seed(count: number): void {
    const drives = TestBed.inject(DriveService);
    for (let i = 1; i <= count; i++) {
      drives.saveDrive({
        startAddress: `Start ${i}, Kragujevac, Serbia`,
        destinationAddress: `End ${i}, Kragujevac, Serbia`,
        dateTime: new Date(2026, 0, i).toISOString(),
        passengerPhone: '+381601234567',
        paymentMethod: 'Cash',
        price: 100,
        distanceKm: 2,
      });
    }
  }

  beforeEach(() => {
    localStorage.removeItem('bookedDrives');
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [TableComponent, RideDetailsComponent],
    });
    fixture = TestBed.createComponent(TableComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => localStorage.removeItem('bookedDrives'));

  it('shows an empty state with no rides', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No rides yet');
  });

  it('totals rides and pages through them without leaving the valid range', () => {
    seed(9);
    fixture.detectChanges();

    expect(component.totalItems).toBe(9);
    expect(component.totalKm).toBe(18);
    expect(component.totalSpent).toBe(900);
    expect(component.totalPages).toBe(2);

    component.onPageChange(99);
    expect(component.currentPage).toBe(2);
    expect(component.pagedRides.length).toBe(1);
    component.onPageChange(0);
    expect(component.currentPage).toBe(1);
  });

  it('clears the history', () => {
    seed(2);
    fixture.detectChanges();
    component.clearHistory();
    fixture.detectChanges();
    expect(component.totalItems).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No rides yet');
  });
});
