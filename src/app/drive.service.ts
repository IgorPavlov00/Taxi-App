import { Injectable } from '@angular/core';
import { Ride } from './ride';

const LEGACY_SENSITIVE_FIELDS = ['cardNumber', 'cardExpiry'];

@Injectable({
  providedIn: 'root'
})
export class DriveService {
  private readonly drivesKey = 'bookedDrives';

  saveDrive(drive: Omit<Ride, 'id'>): Ride {
    const saved: Ride = { ...drive, id: this.newId() };
    this.write([...this.read(), saved]);
    return saved;
  }

  /** All rides, newest departure first. */
  getDrives(): Ride[] {
    return this.read().sort((a, b) => (Date.parse(b.dateTime) || 0) - (Date.parse(a.dateTime) || 0));
  }

  getPagedDrives(page: number, pageSize: number): Ride[] {
    const startIndex = (page - 1) * pageSize;
    return this.getDrives().slice(startIndex, startIndex + pageSize);
  }

  getTotalDrivesCount(): number {
    return this.read().length;
  }

  clear(): void {
    try {
      localStorage.removeItem(this.drivesKey);
    } catch {
      // Storage is unavailable, so there is nothing to clear.
    }
  }

  private read(): Ride[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(localStorage.getItem(this.drivesKey) ?? '[]');
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Older versions stored full card details in plain text. Remove them from disk on first read.
    let changed = false;
    const rides = parsed.map((raw: Record<string, unknown>) => {
      const ride = { ...raw };
      for (const field of LEGACY_SENSITIVE_FIELDS) {
        if (field in ride) {
          delete ride[field];
          changed = true;
        }
      }
      if (!ride['id']) {
        ride['id'] = this.newId();
        changed = true;
      }
      return ride as unknown as Ride;
    });
    if (changed) {
      this.write(rides);
    }
    return rides;
  }

  private write(rides: Ride[]): void {
    try {
      localStorage.setItem(this.drivesKey, JSON.stringify(rides));
    } catch {
      // Storage is full or blocked: the ride still completes, it just is not remembered.
    }
  }

  private newId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
