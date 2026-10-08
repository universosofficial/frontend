import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-pricing-cta',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pricing-cta.component.html',
  styleUrl: './pricing-cta.component.scss',
})
export class PricingCtaComponent {
  readonly isAnnual = signal<boolean>(false);

  toggleBilling(): void {
    this.isAnnual.update((v) => !v);
  }
}
