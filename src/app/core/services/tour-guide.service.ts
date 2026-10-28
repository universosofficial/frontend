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
  private readonly STORAGE_KEY = 'Virtual Human_tour_guide_completed_v1';

  readonly steps: TourStep[] = [
    {
      id: 'welcome',
      badge: 'Welcome to Virtual Human',
      icon: '✨',
      title: 'Your AI Companion & Knowledge Hub',
      description:
        'Virtual Human gives you private AI companions that remember what matters to you, plus public AIs you can explore or create for yourself.',
      position: 'center',
      actionHint: 'Take a quick 1-minute guided tour to see how everything works.',
    },
    {
      id: 'sidebar-chats',
      badge: 'Conversations',
      icon: '💬',
      title: 'All Your Chats in One Place',
      description:
        'Your conversations live in this left sidebar. Switch easily between your companions and public AIs anytime.',
      targetSelector: '.wa-chat-list',
      position: 'right',
      actionHint: 'Use the filter buttons above to view Featured companions, your private creations, or Public AIs.',
    },
    {
      id: 'create-new',
      badge: 'Quick Creation',
      icon: '⚡',
      title: 'Create AI Companions in Seconds',
      description:
        'Tap "+ New" to create a personal companion or set up your own public AI. Customize their personality, add a custom voice, or upload reference documents.',
      targetSelector: '.wa-new-chat-btn',
      position: 'bottom',
      actionHint: 'Your AI can stay private or be shared with friends and followers.',
    },
    {
      id: 'chat-input',
      badge: 'Voice & Text',
      icon: '🎙️',
      title: 'Text, Voice Notes & Calls',
      description:
        'Type messages normally, hold down the microphone button to send voice notes, or start a voice call anytime.',
      targetSelector: '.wa-chat-input-bar',
      position: 'top',
      actionHint: 'Tap the phone icon in the top header to start a live voice call.',
    },
    {
      id: 'memories-doctrine',
      badge: 'Saved Memories',
      icon: '📖',
      title: 'Memories & Knowledge',
      description:
        'Click Saved Memories at the top of any chat to see what your companion remembers about your conversations, or view the documents powering their answers.',
      targetSelector: '.wa-header-memory-btn',
      position: 'bottom',
      actionHint: 'Memories are updated automatically as you chat.',
    },
    {
      id: 'ready',
      badge: 'Ready to Start',
      icon: '🚀',
      title: 'You are Ready to Begin!',
      description:
        'Start a conversation, create a companion, or explore public AIs. You can replay this quick tour anytime from the settings menu.',
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
