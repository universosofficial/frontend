import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MemoryService } from '../../../core/services/memory.service';
import { ChatService } from '../../../core/services/chat.service';
import { PushNotificationService } from '../../../core/services/push-notification.service';
import { Memory } from '../../../core/models/memory.model';

export interface SharedGoalItem {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
}

@Component({
  selector: 'app-memory-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './memory-drawer.component.html',
  styleUrl: './memory-drawer.component.scss',
})
export class MemoryDrawerComponent implements OnChanges {
  memoryService = inject(MemoryService);
  chatService = inject(ChatService);
  pushService = inject(PushNotificationService);

  @Input() isOpen = false;
  @Input() characterId!: number;
  @Output() close = new EventEmitter<void>();
  @Output() goalCheckIn = new EventEmitter<string>();

  pinnedTakeaways = signal<Array<{ id: number; content: string; saved_at: string }>>([]);

  // Feature #5: Direct "+ Teach Memory" & Inline Memory Editing
  showTeachMemoryForm = signal<boolean>(false);
  newMemoryInput = '';
  newMemoryCategory: 'fact' | 'preference' | 'goal' | 'relationship' | 'event' = 'fact';
  isSavingMemory = signal<boolean>(false);
  editingMemoryId = signal<number | null>(null);
  editingMemoryContent = '';

  // Feature #7: Shared Goals & Promises Tracker
  sharedGoals = signal<SharedGoalItem[]>([]);
  newGoalInput = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue && this.characterId) {
      this.loadMemories();
      this.loadPinnedTakeaways();
      this.loadSharedGoals();
    }
  }

  loadMemories(): void {
    if (this.characterId) {
      this.memoryService.getMemories(this.characterId).subscribe();
    }
  }

  // Feature #8: Evolving Relationship Bond & Milestone Calculation
  getBondInfo(): {
    level: number;
    title: string;
    icon: string;
    progressPercent: number;
    messagesCount: number;
    memoriesCount: number;
    completedGoalsCount: number;
    nextMilestoneHint: string;
  } {
    const messagesCount = this.chatService.messages().length;
    const memoriesCount = this.memoryService.memories().length;
    const completedGoalsCount = this.sharedGoals().filter((g) => g.completed).length;

    const score = messagesCount * 2 + memoriesCount * 5 + completedGoalsCount * 10;

    if (score >= 80) {
      return {
        level: 4,
        title: 'Inner Circle Bond',
        icon: '👑',
        progressPercent: 100,
        messagesCount,
        memoriesCount,
        completedGoalsCount,
        nextMilestoneHint: 'Deepest level of shared history & trust reached',
      };
    } else if (score >= 35) {
      return {
        level: 3,
        title: 'Trusted Confidant',
        icon: '🤝',
        progressPercent: Math.min(99, Math.round(((score - 35) / 45) * 100)),
        messagesCount,
        memoriesCount,
        completedGoalsCount,
        nextMilestoneHint: 'Keep sharing conversations & goals to reach Inner Circle',
      };
    } else if (score >= 12) {
      return {
        level: 2,
        title: 'Familiar Friend',
        icon: '✨',
        progressPercent: Math.min(99, Math.round(((score - 12) / 23) * 100)),
        messagesCount,
        memoriesCount,
        completedGoalsCount,
        nextMilestoneHint: 'Teach a few memories or check in on a goal to reach Trusted Confidant',
      };
    }

    return {
      level: 1,
      title: 'New Acquaintance',
      icon: '🌱',
      progressPercent: Math.max(12, Math.min(99, Math.round((score / 12) * 100))),
      messagesCount,
      memoriesCount,
      completedGoalsCount,
      nextMilestoneHint: 'Chat or teach a fact about yourself to deepen your bond',
    };
  }

  // Feature #7: Shared Goals Methods
  private getGoalsKey(): string {
    return `lumina_shared_goals_char_${this.characterId}`;
  }

  loadSharedGoals(): void {
    try {
      const raw = localStorage.getItem(this.getGoalsKey());
      this.sharedGoals.set(raw ? JSON.parse(raw) : []);
    } catch (_) {
      this.sharedGoals.set([]);
    }
  }

  private persistSharedGoals(items: SharedGoalItem[]): void {
    this.sharedGoals.set(items);
    try {
      localStorage.setItem(this.getGoalsKey(), JSON.stringify(items));
    } catch (_) {}
  }

  addSharedGoal(): void {
    const title = this.newGoalInput.trim();
    if (!title || !this.characterId) return;

    const newItem: SharedGoalItem = {
      id: Date.now(),
      title,
      completed: false,
      created_at: new Date().toISOString(),
    };
    this.persistSharedGoals([newItem, ...this.sharedGoals()]);
    this.newGoalInput = '';

    // Also teach the companion this goal in their neural memory bank
    this.memoryService
      .createMemory(this.characterId, {
        content: `Shared goal with companion: ${title}`,
        category: 'goal',
        memoryType: 'user_fact',
        importanceScore: 5,
      })
      .subscribe();
  }

  toggleGoalCompleted(goalId: number): void {
    const next = this.sharedGoals().map((g) =>
      g.id === goalId ? { ...g, completed: !g.completed } : g
    );
    this.persistSharedGoals(next);
  }

  removeSharedGoal(goalId: number): void {
    const next = this.sharedGoals().filter((g) => g.id !== goalId);
    this.persistSharedGoals(next);
  }

  onCheckInGoal(goal: SharedGoalItem): void {
    const prompt = goal.completed
      ? `I just completed my shared goal: "${goal.title}"! Let's celebrate and figure out my next step.`
      : `Let's do a quick accountability check-in on my goal: "${goal.title}". Ask me where I'm at and help me unblock it.`;
    this.goalCheckIn.emit(prompt);
    this.onClose();
  }

  // Feature #5: Teach & Edit Memory Methods
  onTeachMemory(): void {
    const content = this.newMemoryInput.trim();
    if (!content || !this.characterId || this.isSavingMemory()) return;

    this.isSavingMemory.set(true);
    this.memoryService
      .createMemory(this.characterId, {
        content,
        category: this.newMemoryCategory,
        memoryType: this.newMemoryCategory === 'relationship' ? 'persona_anchor' : 'user_fact',
        importanceScore: 5,
      })
      .subscribe({
        next: () => {
          this.isSavingMemory.set(false);
          this.newMemoryInput = '';
          this.showTeachMemoryForm.set(false);
        },
        error: () => {
          this.isSavingMemory.set(false);
        },
      });
  }

  startEditMemory(mem: Memory, event: MouseEvent): void {
    event.stopPropagation();
    this.editingMemoryId.set(mem.id);
    this.editingMemoryContent = mem.content;
  }

  cancelEditMemory(): void {
    this.editingMemoryId.set(null);
    this.editingMemoryContent = '';
  }

  saveEditMemory(mem: Memory): void {
    const updatedText = this.editingMemoryContent.trim();
    if (!updatedText) return;

    this.memoryService
      .updateMemory(mem.id, { content: updatedText, category: mem.category })
      .subscribe({
        next: () => {
          this.editingMemoryId.set(null);
          this.editingMemoryContent = '';
        },
      });
  }

  loadPinnedTakeaways(): void {
    try {
      const raw = localStorage.getItem(`lumina_pinned_takeaways_char_${this.characterId}`);
      this.pinnedTakeaways.set(raw ? JSON.parse(raw) : []);
    } catch (_) {
      this.pinnedTakeaways.set([]);
    }
  }

  removePinnedTakeaway(id: number): void {
    const next = this.pinnedTakeaways().filter((t) => t.id !== id);
    this.pinnedTakeaways.set(next);
    try {
      localStorage.setItem(`lumina_pinned_takeaways_char_${this.characterId}`, JSON.stringify(next));
    } catch (_) {}
  }

  onDelete(memory: Memory, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm(`Forget this memory: "${memory.content}"?`)) {
      this.memoryService.deleteMemory(memory.id).subscribe();
    }
  }

  onToggleProactive(event: Event, characterId: number): void {
    const target = event.target as HTMLInputElement;
    const allow = target.checked;
    this.pushService.toggleCharacterProactive(characterId, allow).subscribe({
      next: () => {
        const active = this.chatService.activeCharacter();
        if (active && active.id === characterId) {
          active.allow_proactive_checkins = allow;
        }
      },
      error: (err) => console.error('Failed to toggle proactive check-ins:', err),
    });
  }

  async onEnablePush(): Promise<void> {
    await this.pushService.requestPermissionAndSubscribe();
  }

  onSendTestPing(characterId: number): void {
    this.pushService.sendTestNotification(characterId).subscribe({
      next: (res) => console.log('Test notification dispatched:', res),
      error: (err) => console.error('Test notification failed:', err),
    });
  }

  onClose(): void {
    this.close.emit();
  }
}
