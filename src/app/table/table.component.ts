import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DriveService } from '../drive.service';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css']
})
export class TableComponent implements OnInit {
  @ViewChild('rideDetailsModal') rideDetailsModal: TemplateRef<any> | undefined;
  pagedRides: any[] = [];
  currentPage = 1;
  pageSize = 5;
  totalItems = 0;
  totalPages = 0;
  selectedRide: any = null;

  constructor(private driveService: DriveService, private modalService: NgbModal) {}

  ngOnInit(): void {
    this.totalItems = this.driveService.getTotalDrivesCount();
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    this.fetchData();
  }

  fetchData(): void {
    this.pagedRides = this.driveService.getPagedDrives(this.currentPage, this.pageSize);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.fetchData();
  }

  getPages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  openDetailsModal(ride: any): void {
    this.selectedRide = ride;
    this.modalService.open(this.rideDetailsModal, { size: 'lg' });
  }

  truncateAddress(address: string): string {
    const parts = address.split(',');
    return parts.slice(0, 2).join(',');
  }
  backtoHome() {
    window.location.href = '/';
  }
}
