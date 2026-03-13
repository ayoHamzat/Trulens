import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'trulens_theme';

  isDark = signal<boolean>(this.loadTheme());

  constructor() {
    // Apply theme whenever signal changes
    effect(() => {
      document.documentElement.setAttribute(
        'data-theme',
        this.isDark() ? 'dark' : 'light'
      );
    });
    // Apply immediately on boot
    document.documentElement.setAttribute(
      'data-theme',
      this.isDark() ? 'dark' : 'light'
    );
  }

  toggle(): void {
    const next = !this.isDark();
    this.isDark.set(next);
    localStorage.setItem(this.KEY, next ? 'dark' : 'light');
  }

  setDark(dark: boolean): void {
    this.isDark.set(dark);
    localStorage.setItem(this.KEY, dark ? 'dark' : 'light');
  }

  private loadTheme(): boolean {
    const stored = localStorage.getItem(this.KEY);
    if (stored) return stored === 'dark';
    return false;
  }
}
