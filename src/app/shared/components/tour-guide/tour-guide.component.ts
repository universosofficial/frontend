import {
  Component,
  inject,
  HostListener,
  signal,
  effect,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TourGuideService, TourStep } from '../../../core/services/tour-guide.service';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-tour-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tour-guide.component.html',
  styleUrl: './tour-guide.component.scss',
})
export class TourGuideComponent implements AfterViewInit, OnDestroy {
  tourService = inject(TourGuideService);

  spotlightRect = signal<SpotlightRect | null>(null);
  cardPosition = signal<{ top: number; left: number } | null>(null);

  private resizeObserver?: ResizeObserver;
  private updateTimeout?: any;

  constructor() {
    effect(() => {
      const active = this.tourService.isTourActive();
      const step = this.tourService.currentStep();

      if (active && step) {
        // Wait a tick for DOM to stabilize
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
          this.recalculateSpotlight(step);
        }, 60);
      } else {
        this.spotlightRect.set(null);
        this.cardPosition.set(null);
      }
    });
  }

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onWindowResize);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onWindowResize);
    }
    clearTimeout(this.updateTimeout);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.tourService.isTourActive()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.tourService.skipTour();
    } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
      event.preventDefault();
      this.tourService.nextStep();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.tourService.prevStep();
    }
  }

  private onWindowResize = (): void => {
    const step = this.tourService.currentStep();
    if (step && this.tourService.isTourActive()) {
      this.recalculateSpotlight(step);
    }
  };

  recalculateSpotlight(step: TourStep): void {
    if (!step.targetSelector || step.position === 'center' || typeof document === 'undefined') {
      this.spotlightRect.set(null);
      this.cardPosition.set(null);
      return;
    }

    const targetEl = document.querySelector(step.targetSelector) as HTMLElement;
    if (!targetEl) {
      this.spotlightRect.set(null);
      this.cardPosition.set(null);
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const padding = 8;

    this.spotlightRect.set({
      top: Math.max(0, rect.top - padding),
      left: Math.max(0, rect.left - padding),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    // Compute smart position for tour card (380px wide card)
    const cardWidth = Math.min(420, window.innerWidth - 32);
    const cardHeight = 280;
    let top = 0;
    let left = 0;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;

    if (step.position === 'bottom' || (spaceBelow >= cardHeight && step.position !== 'top')) {
      top = rect.bottom + 16;
      left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, rect.left));
    } else if (step.position === 'top' || (spaceAbove >= cardHeight)) {
      top = Math.max(16, rect.top - cardHeight - 16);
      left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, rect.left));
    } else if (step.position === 'right' && spaceRight >= cardWidth + 24) {
      top = Math.max(16, Math.min(window.innerHeight - cardHeight - 16, rect.top));
      left = rect.right + 16;
    } else if (step.position === 'left' && spaceLeft >= cardWidth + 24) {
      top = Math.max(16, Math.min(window.innerHeight - cardHeight - 16, rect.top));
      left = Math.max(16, rect.left - cardWidth - 16);
    } else {
      // Fallback: centered
      top = Math.max(16, (window.innerHeight - cardHeight) / 2);
      left = Math.max(16, (window.innerWidth - cardWidth) / 2);
    }

    this.cardPosition.set({ top, left });
  }
}
