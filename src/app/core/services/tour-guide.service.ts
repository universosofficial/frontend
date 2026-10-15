import { Injectable, signal, computed } from '@angular/core';

export interface TourStep {
  id: string;
  badge: string;
  icon: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  actionHint?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TourGuideService {
  private readonly STORAGE_KEY = 'lumina_tour_guide_completed_v1';

  readonly steps: TourStep[] = [
    {
      id: 'welcome',
      badge: 'Welcome to Lumina',
      icon: '✨',
      title: 'Your Unified AI Sanctuary & Thought Commons',
      description:
        'Lumina combines private emotional AI companions with public AI Minds (Digital Twins). Converse with warm companions who remember your thoughts, or consult verified minds grounded in authored writings.',
      position: 'center',
      actionHint: 'Take a quick 1-minute guided walkthrough to see how everything works.',
    },
    {
      id: 'sidebar-chats',
      badge: 'Conversations',
      icon: '💬',
      title: 'All Your Companions & Minds in One Place',
      description:
        'Your conversations live in this left sidebar. Switch seamlessly between private companions and public AI minds without ever losing your chat context.',
      targetSelector: '.wa-chat-list',
      position: 'right',
      actionHint: 'Use the filter pills above to view Official personas, Custom creations, or AI Minds.',
    },
    {
      id: 'create-new',
      badge: 'Quick Creation',
      icon: '⚡',
      title: 'Create Personas & Minds in Under 7 Fields',
      description:
        'Tap the "+ New" button to design a new companion or train your own AI Mind. Keep it simple with zero cognitive overload, upload documents or PDFs, and share your unique social link!',
      targetSelector: '.wa-new-chat-btn',
      position: 'bottom',
      actionHint: 'Your personal AI Mind gets its own public page and social media share card.',
    },
    {
      id: 'chat-input',
      badge: 'Voice & Text',
      icon: '🎙️',
      title: 'Text, Voice Notes & Live Spoken Calls',
      description:
        'Type your questions in the floating dock, or hold down the microphone button to record WhatsApp-style voice notes with live waveform audio visualization and instant transcripts.',
      targetSelector: '.wa-chat-input-bar',
      position: 'top',
      actionHint: 'You can also initiate real-time two-way voice calls with any companion or mind.',
    },
    {
      id: 'memories-doctrine',
      badge: 'Neural Recall',
      icon: '📖',
      title: 'Neural Memories & Knowledge Grounding',
      description:
        'Tap the Memories or Knowledge button to inspect the recall bank. See what your companion remembers about your conversations, or view the verified sources grounding an AI Mind’s advice.',
      targetSelector: '.wa-header-memory-btn',
      position: 'bottom',
      actionHint: 'Clicking opens a smooth slide-out drawer without interrupting your conversation.',
    },
    {
      id: 'ready',
      badge: 'Ready to Explore',
      icon: '🚀',
      title: 'You are Ready to Start!',
      description:
        'Explore the Thought Commons, chat with diverse personas, or start building your personal digital twin today. You can replay this interactive tour anytime from Settings.',
      position: 'center',
      actionHint: 'Click "Start Exploring" to dive in!',
    },
  ];

  isTourActive = signal<boolean>(false);
  currentStepIndex = signal<number>(0);

  currentStep = computed(() => this.steps[this.currentStepIndex()] || null);
  totalSteps = computed(() => this.steps.length);
  progressPercent = computed(() =>
    Math.round(((this.currentStepIndex() + 1) / this.steps.length) * 100)
  );
  isFirstStep = computed(() => this.currentStepIndex() === 0);
  isLastStep = computed(() => this.currentStepIndex() === this.steps.length - 1);

  initAutoTour(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const hasCompleted = localStorage.getItem(this.STORAGE_KEY);
    if (!hasCompleted) {
      setTimeout(() => {
        this.startTour(false);
      }, 700);
    }
  }

  startTour(force = false): void {
    if (!force) {
      const hasCompleted = localStorage.getItem(this.STORAGE_KEY);
      if (hasCompleted) return;
    }
    this.currentStepIndex.set(0);
    this.isTourActive.set(true);
  }

  nextStep(): void {
    if (this.isLastStep()) {
      this.completeTour();
    } else {
      this.currentStepIndex.update((idx) => Math.min(this.steps.length - 1, idx + 1));
    }
  }

  prevStep(): void {
    this.currentStepIndex.update((idx) => Math.max(0, idx - 1));
  }

  goToStep(index: number): void {
    if (index >= 0 && index < this.steps.length) {
      this.currentStepIndex.set(index);
    }
  }

  skipTour(): void {
    this.isTourActive.set(false);
    this.markCompleted();
  }

  completeTour(): void {
    this.isTourActive.set(false);
    this.markCompleted();
  }

  resetTour(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.startTour(true);
  }

  private markCompleted(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY, 'true');
    }
  }
}
