import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject, catchError, debounceTime, of, switchMap, takeUntil, tap } from 'rxjs';
import { GeoService } from '../geo.service';
import { Place } from '../ride';

const MIN_QUERY_LENGTH = 3;

@Component({
  selector: 'app-address-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './address-input.component.html',
  styleUrls: ['./address-input.component.css'],
})
export class AddressInputComponent implements OnInit, OnDestroy {
  @Input({ required: true }) inputId = '';
  @Input({ required: true }) label = '';
  @Input() placeholder = '';
  @Input() text = '';
  @Input() tone: 'pickup' | 'destination' = 'pickup';
  @Output() textChange = new EventEmitter<string>();
  @Output() placeSelected = new EventEmitter<Place>();

  results: Place[] = [];
  activeIndex = -1;
  focused = false;
  searching = false;

  private query$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private geo: GeoService) {}

  get open(): boolean {
    return this.focused && this.results.length > 0;
  }

  get activeOptionId(): string | null {
    return this.open && this.activeIndex >= 0 ? `${this.inputId}-option-${this.activeIndex}` : null;
  }

  ngOnInit(): void {
    this.query$.pipe(
      tap(query => this.searching = query.length >= MIN_QUERY_LENGTH),
      debounceTime(300),
      switchMap(query => query.length < MIN_QUERY_LENGTH
        ? of([])
        // A failed suggestion lookup is not worth interrupting typing; submitting reports real errors.
        : this.geo.search(query).pipe(catchError(() => of([])))),
      takeUntil(this.destroy$),
    ).subscribe(results => {
      this.results = results;
      this.activeIndex = -1;
      this.searching = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInput(value: string): void {
    this.text = value;
    this.textChange.emit(value);
    this.query$.next(value.trim());
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.open) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.activeIndex = (this.activeIndex + step + this.results.length) % this.results.length;
    } else if (event.key === 'Enter' && this.activeIndex >= 0) {
      event.preventDefault();
      this.select(this.results[this.activeIndex]);
    } else if (event.key === 'Escape') {
      this.results = [];
    }
  }

  select(place: Place): void {
    this.text = place.label;
    this.results = [];
    this.query$.next('');
    this.placeSelected.emit(place);
  }
}
