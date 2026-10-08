import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { HeroSectionComponent } from './components/hero-section/hero-section.component';
import { DualParadigmComponent } from './components/dual-paradigm/dual-paradigm.component';
import { MindDirectoryPreviewComponent } from './components/mind-directory-preview/mind-directory-preview.component';
import { IngestionFeatureComponent } from './components/ingestion-feature/ingestion-feature.component';
import { SocraticDemoComponent } from './components/socratic-demo/socratic-demo.component';
import { PricingCtaComponent } from './components/pricing-cta/pricing-cta.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    HeroSectionComponent,
    DualParadigmComponent,
    MindDirectoryPreviewComponent,
    IngestionFeatureComponent,
    SocraticDemoComponent,
    PricingCtaComponent,
    FooterComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  readonly authService = inject(AuthService);
  readonly isMobileMenuOpen = signal<boolean>(false);

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  scrollToSection(sectionId: string): void {
    this.closeMobileMenu();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
