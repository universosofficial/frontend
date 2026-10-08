import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.scss',
})
export class HeroSectionComponent {
  // Public card state
  readonly showPublicCitation = signal<boolean>(false);
  readonly publicPromptIndex = signal<number>(0);

  readonly publicPrompts = [
    {
      user: "We're stuck on thermal cooling for our propulsion prototype. Should we add a dual-stage radiator or reduce peak burn duration?",
      mind: 'What is the limiting thermodynamic physics before you add mass? Why optimize a radiator for a stage that should be eliminated by higher injector efficiency?',
      citation: 'Ingested Memo: Raptor-V3 Hot Gas Manifold Memo (Rev 4) §3.1',
      citationExcerpt:
        '"Mass is the enemy of delta-V. If a subsystem requires secondary thermal mitigation, first evaluate whether chamber throat geometry can decrease boundary layer heat flux by 18% before adding radiant mass."',
      topic: 'Thermodynamics & Delta-V',
    },
    {
      user: 'Our production line is 3 weeks behind schedule. Should we hire 10 more line technicians?',
      mind: 'The most common error of a smart engineer is optimizing something that should not exist. Which step in the manufacturing line is actually superfluous?',
      citation: 'Ingested Principles: First-Principles Manufacturing Algorithm §1',
      citationExcerpt:
        '"Step 1: Make your requirements less dumb. Step 2: Delete the part or process step. Only after deletion should you simplify, accelerate, or automate."',
      topic: 'Production Bottlenecks',
    },
  ];

  // Private card state
  readonly showPrivateMemory = signal<boolean>(false);
  readonly isVoicePlaying = signal<boolean>(false);

  togglePublicCitation(): void {
    this.showPublicCitation.update((v) => !v);
  }

  setPublicPrompt(index: number): void {
    this.publicPromptIndex.set(index);
    this.showPublicCitation.set(false);
  }

  togglePrivateMemory(): void {
    this.showPrivateMemory.update((v) => !v);
  }

  toggleVoicePlay(): void {
    this.isVoicePlaying.update((v) => !v);
  }
}
