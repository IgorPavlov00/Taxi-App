import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [NavbarComponent],
    });
    fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();
  });

  it('opens and closes the mobile menu', () => {
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector('.menu-toggle');
    const menu: HTMLElement = fixture.nativeElement.querySelector('#primary-menu');

    toggle.click();
    fixture.detectChanges();
    expect(menu.classList).toContain('open');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    (menu.querySelector('a') as HTMLAnchorElement).click();
    fixture.detectChanges();
    expect(menu.classList).not.toContain('open');
  });
});
