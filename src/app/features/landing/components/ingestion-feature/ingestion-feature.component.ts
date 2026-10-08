import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface WorkflowStep {
  number: number;
  title: string;
  shortDesc: string;
  icon: string;
}

@Component({
  selector: 'app-ingestion-feature',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ingestion-feature.component.html',
  styleUrl: './ingestion-feature.component.scss',
})
export class IngestionFeatureComponent {
  readonly activeStep = signal<number>(1);

  // Step 1: URL scraping simulation
  readonly simulatedUrl = signal<string>('https://danmartell.substack.com');
  readonly isCrawling = signal<boolean>(false);
  readonly crawlComplete = signal<boolean>(true);

  // Step 2: Documents
  readonly selectedDocIndex = signal<number>(0);
  readonly sampleDocs = [
    {
      name: 'first-principles-manufacturing.pdf',
      size: '2.4 MB',
      chunks: 84,
      tokens: '41,200',
      sampleChunk:
        'Chunk #18: If a component cannot be deleted, aggressively simplify it. The third step is to accelerate cycle time, but never accelerate before deleting redundant steps.',
    },
    {
      name: 'stoic-journal-reflections.md',
      size: '640 KB',
      chunks: 32,
      tokens: '16,800',
      sampleChunk:
        'Chunk #04: When you encounter an ungrateful person, ask what injury their behavior actually did to your internal moral fortress. Nothing outside can harm character without consent.',
    },
  ];

  // Step 3: Life Rules
  readonly rules = signal<Array<{ id: number; text: string; category: string; enabled: boolean }>>([
    {
      id: 1,
      text: 'Always identify the unexamined premise and ask the diagnostic question before recommending action.',
      category: 'Socratic Diagnostic',
      enabled: true,
    },
    {
      id: 2,
      text: 'Never use generic corporate AI platitudes, apologetic disclaimers, or polite filler.',
      category: 'Anti-Chatbot Pacing',
      enabled: true,
    },
    {
      id: 3,
      text: 'Ground every technical statement in explicit equations or verified ingested memo citations.',
      category: 'Epistemic Grounding',
      enabled: true,
    },
    {
      id: 4,
      text: 'In emotional companion sessions, prioritize childhood memories and use authentic nicknames.',
      category: 'Relational Resonance',
      enabled: true,
    },
  ]);

  // Step 4: Handle registration
  readonly claimedHandle = signal<string>('alex_founder');
  readonly isPublished = signal<boolean>(false);

  setStep(stepNumber: number): void {
    this.activeStep.set(stepNumber);
  }

  toggleRule(ruleId: number): void {
    this.rules.update((list) =>
      list.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  }

  selectDoc(index: number): void {
    this.selectedDocIndex.set(index);
  }

  triggerPublish(): void {
    this.isPublished.set(true);
    setTimeout(() => {
      this.isPublished.set(false);
    }, 3500);
  }
}
