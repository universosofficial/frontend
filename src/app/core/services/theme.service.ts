import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'wa_theme_preference';

  readonly currentTheme = signal<ThemeMode>(this.getInitialTheme());

  constructor() {
    // Whenever theme signal changes, apply it to the DOM and persist
    effect(() => {
      const theme = this.currentTheme();
      this.applyThemeToDOM(theme);
      try {
        localStorage.setItem(this.STORAGE_KEY, theme);
      } catch {}
    });
  }

  toggleTheme(): void {
    this.currentTheme.update((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  setTheme(theme: ThemeMode): void {
    this.currentTheme.set(theme);
  }

  private getInitialTheme(): ThemeMode {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {}

    // Default to dark mode for WhatsApp Dark Web experience
    return 'dark';
  }

  private applyThemeToDOM(theme: ThemeMode): void {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      if (theme === 'light') {
        root.classList.add('wa-theme-light');
        root.classList.remove('wa-theme-dark');
      } else {
        root.classList.add('wa-theme-dark');
        root.classList.remove('wa-theme-light');
      }
    }
  }
}
