import { DriveService } from './drive.service';

describe('DriveService', () => {
  const KEY = 'bookedDrives';
  const ride = {
    startAddress: 'A',
    destinationAddress: 'B',
    dateTime: '2026-01-01T10:00:00.000Z',
    passengerPhone: '+381601234567',
    paymentMethod: 'Cash',
    price: 400,
  };
  let service: DriveService;

  beforeEach(() => {
    localStorage.removeItem(KEY);
    service = new DriveService();
  });

  afterEach(() => localStorage.removeItem(KEY));

  it('saves rides and returns the newest departure first', () => {
    service.saveDrive(ride);
    service.saveDrive({ ...ride, dateTime: '2026-03-01T10:00:00.000Z', price: 800 });
    expect(service.getDrives().map(r => r.price)).toEqual([800, 400]);
    expect(service.getTotalDrivesCount()).toBe(2);
  });

  it('pages through rides', () => {
    for (let i = 1; i <= 3; i++) {
      service.saveDrive({ ...ride, dateTime: `2026-01-0${i}T10:00:00.000Z`, price: i });
    }
    expect(service.getPagedDrives(2, 2).map(r => r.price)).toEqual([1]);
  });

  it('erases card details left behind by older versions', () => {
    localStorage.setItem(KEY, JSON.stringify([{ ...ride, cardNumber: 4111111111111111, cardExpiry: '2030-01-01' }]));

    const [loaded] = service.getDrives();

    expect(loaded.startAddress).toBe('A');
    expect(loaded.id).toBeTruthy();
    const onDisk = localStorage.getItem(KEY) ?? '';
    expect(onDisk).not.toContain('4111');
    expect(onDisk).not.toContain('cardNumber');
    expect(onDisk).not.toContain('cardExpiry');
  });

  it('survives corrupt storage', () => {
    localStorage.setItem(KEY, '{not json');
    expect(service.getDrives()).toEqual([]);
    localStorage.setItem(KEY, '{"a":1}');
    expect(service.getDrives()).toEqual([]);
  });

  it('clears history', () => {
    service.saveDrive(ride);
    service.clear();
    expect(service.getTotalDrivesCount()).toBe(0);
  });
});
