import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  themeService = inject(ThemeService);
  authService = inject(AuthService);

  readonly isLoadingApp = signal<boolean>(true);
  readonly isFadingOut = signal<boolean>(false);

  ngOnInit(): void {
    // Smooth, instant boot: fades out as soon as initial hydration completes
    setTimeout(() => {
      this.isFadingOut.set(true);
      setTimeout(() => {
        this.isLoadingApp.set(false);
      }, 300);
    }, 450);
  }
}
