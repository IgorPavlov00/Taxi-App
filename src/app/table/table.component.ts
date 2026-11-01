import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DriveService } from '../drive.service';
import { Ride } from '../ride';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css']
})
export class TableComponent implements OnInit {
  @ViewChild('detailsDialog') detailsDialog?: ElementRef<HTMLDialogElement>;

  readonly pageSize = 8;

  pagedRides: Ride[] = [];
  currentPage = 1;
  totalItems = 0;
  totalPages = 0;
  pages: number[] = [];
  totalKm = 0;
  totalSpent = 0;
  selectedRide: Ride | null = null;
  confirmingClear = false;

  constructor(private driveService: DriveService) {}

  ngOnInit(): void {
    this.load();
  }

  onPageChange(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages || 1);
    this.pagedRides = this.driveService.getPagedDrives(this.currentPage, this.pageSize);
  }

  openDetails(ride: Ride): void {
    this.selectedRide = ride;
    this.detailsDialog?.nativeElement.showModal();
  }

  closeDetails(): void {
    this.detailsDialog?.nativeElement.close();
  }

  onDialogClick(event: MouseEvent): void {
    // Clicks on the content land on its children, so a hit on the dialog itself is the backdrop.
    if (event.target === this.detailsDialog?.nativeElement) {
      this.closeDetails();
    }
  }

  clearHistory(): void {
    this.driveService.clear();
    this.confirmingClear = false;
    this.load();
  }

  shortAddress(address: string): string {
    return address.split(',').slice(0, 2).join(',');
  }

  private load(): void {
    const rides = this.driveService.getDrives();
    this.totalItems = rides.length;
    this.totalPages = Math.ceil(rides.length / this.pageSize);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.totalKm = rides.reduce((sum, ride) => sum + (ride.distanceKm ?? 0), 0);
    this.totalSpent = rides.reduce((sum, ride) => sum + (ride.price ?? 0), 0);
    this.onPageChange(1);
  }
}
