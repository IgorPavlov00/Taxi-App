import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DriveService {
  private readonly drivesKey = 'bookedDrives';



  saveDrive(drive: any): void {
    const drives = this.getDrives();
    drives.push(drive);
    localStorage.setItem(this.drivesKey, JSON.stringify(drives));
  }

  getDrives(): any[] {
    const drives = localStorage.getItem(this.drivesKey);
    return drives ? JSON.parse(drives) : [];
  }

  getPagedDrives(page: number, pageSize: number): any[] {
    const drives = this.getDrives();
    const startIndex = (page - 1) * pageSize;
    return drives.slice(startIndex, startIndex + pageSize);
  }

  getTotalDrivesCount(): number {
    const drives = this.getDrives();
    return drives.length;
  }
}
