import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { MindService } from '../../../core/services/mind.service';
import { AuthService } from '../../../core/services/auth.service';
import { CharacterService } from '../../../core/services/character.service';
import { PublicMind, CouncilResult } from '../../../core/models/mind.model';

import { ShareMindModalComponent } from '../share-mind-modal/share-mind-modal.component';

@Component({
  selector: 'app-mind-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShareMindModalComponent],
  templateUrl: './mind-explore.component.html',
  styleUrl: './mind-explore.component.scss',
})
export class MindExploreComponent implements OnInit, OnDestroy {
  private mindService = inject(MindService);
  private authService = inject(AuthService);
  private characterService = inject(CharacterService);
  private router = inject(Router);

  searchQuery = signal<string>('');
  selectedTag = signal<string>('all');
  selectedSort = signal<string>('popular');
  isLoading = signal<boolean>(true);
  subscribingMindId = signal<number | null>(null);
  minds = signal<PublicMind[]>([]);
  totalMinds = signal<number>(0);
  errorMessage = signal<string | null>(null);
  selectedMindToShare = signal<PublicMind | null>(null);
  isShareModalOpen = signal<boolean>(false);

  // Feature #6: Boardroom / Council Mode (Ask 2-3 Minds at Once)
  isCouncilModalOpen = signal<boolean>(false);
  selectedCouncilHandles = signal<string[]>([]);
  councilQuestion = signal<string>('');
  isConsultingCouncil = signal<boolean>(false);
  councilError = signal<string | null>(null);
  councilResult = signal<CouncilResult | null>(null);

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  readonly availableTags = [
    { label: 'All', value: 'all' },
    { label: '#Technology', value: 'Technology' },
    { label: '#Philosophy', value: 'Philosophy' },
    { label: '#Business', value: 'Business' },
    { label: '#Design', value: 'Design' },
    { label: '#Founders', value: 'Founders' },
    { label: '#Engineering', value: 'Engineering' },
    { label: '#Science', value: 'Science' },
  ];

  ngOnInit(): void {
    // Setup instant search debounce (~250ms)
    this.searchSub = this.searchSubject
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => {
        this.loadMinds();
      });

    this.loadMinds();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearchInput(text: string): void {
    this.searchQuery.set(text);
    this.searchSubject.next(text);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }

  loadMinds(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const tagParam = this.selectedTag() === 'all' ? '' : this.selectedTag();

    this.mindService
      .exploreMinds({
        query: this.searchQuery(),
        tag: tagParam,
        sort: this.selectedSort(),
        page: 1,
        limit: 30,
      })
      .subscribe({
        next: (result) => {
          this.minds.set(result.minds || []);
          this.totalMinds.set(result.total || 0);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Failed to load public minds from the network.');
          this.isLoading.set(false);
        },
      });
  }

  selectTag(tagValue: string): void {
    this.selectedTag.set(tagValue);
    this.loadMinds();
  }

  setSort(sortValue: string): void {
    this.selectedSort.set(sortValue);
    this.loadMinds();
  }

  consultMind(mind: PublicMind): void {
    const handle = (mind.handle || String(mind.id)).replace(/^@/, '');
    if (this.authService.isAuthenticated()) {
      this.characterService.getCharacters().subscribe();
      this.router.navigate(['/dashboard/minds', handle]);
    } else {
      this.router.navigate(['/minds', handle]);
    }
  }

  toggleSubscription(mind: PublicMind, event: Event): void {
    event.stopPropagation();

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.subscribingMindId.set(mind.id);

    if (mind.is_subscribed) {
      this.mindService.unsubscribeMind(mind.id).subscribe({
        next: () => {
          this.characterService.getCharacters().subscribe();
          this.minds.update((list) =>
            list.map((m) =>
              m.id === mind.id
                ? {
                    ...m,
                    is_subscribed: false,
                    total_subscribers: Math.max(0, (m.total_subscribers || 1) - 1),
                  }
                : m
            )
          );
          this.subscribingMindId.set(null);
        },
        error: () => this.subscribingMindId.set(null),
      });
    } else {
      this.mindService.subscribeMind(mind.id).subscribe({
        next: () => {
          this.characterService.getCharacters().subscribe();
          this.minds.update((list) =>
            list.map((m) =>
              m.id === mind.id
                ? {
                    ...m,
                    is_subscribed: true,
                    total_subscribers: (m.total_subscribers || 0) + 1,
                  }
                : m
            )
          );
          this.subscribingMindId.set(null);
        },
        error: () => this.subscribingMindId.set(null),
      });
    }
  }

  openShareMind(mind: PublicMind, event: Event): void {
    event.stopPropagation();
    this.selectedMindToShare.set(mind);
    this.isShareModalOpen.set(true);
  }

  closeShareModal(): void {
    this.isShareModalOpen.set(false);
    this.selectedMindToShare.set(null);
  }

  // Feature #6: Boardroom / Council Mode Methods
  openCouncilModal(): void {
    this.councilError.set(null);
    if (this.selectedCouncilHandles().length < 2 && this.minds().length >= 2) {
      this.selectedCouncilHandles.set(
        this.minds()
          .slice(0, Math.min(3, this.minds().length))
          .map((m) => m.handle)
      );
    }
    this.isCouncilModalOpen.set(true);
  }

  closeCouncilModal(): void {
    this.isCouncilModalOpen.set(false);
  }

  isMindInCouncil(handle: string): boolean {
    return this.selectedCouncilHandles().includes(handle);
  }

  toggleCouncilMind(handle: string): void {
    const current = this.selectedCouncilHandles();
    if (current.includes(handle)) {
      this.selectedCouncilHandles.set(current.filter((h) => h !== handle));
    } else {
      if (current.length >= 3) {
        this.selectedCouncilHandles.set([...current.slice(1), handle]);
      } else {
        this.selectedCouncilHandles.set([...current, handle]);
      }
    }
  }

  setCouncilSampleQuestion(q: string): void {
    this.councilQuestion.set(q);
  }

  submitCouncilConsultation(): void {
    const handles = this.selectedCouncilHandles();
    const q = this.councilQuestion().trim();
    if (handles.length < 2) {
      this.councilError.set('Please select at least 2 AI Minds to convene a Council.');
      return;
    }
    if (!q) {
      this.councilError.set('Please enter a question or dilemma for the Council to debate.');
      return;
    }

    this.isConsultingCouncil.set(true);
    this.councilError.set(null);
    this.councilResult.set(null);

    this.mindService.consultCouncil(handles, q).subscribe({
      next: (res) => {
        this.councilResult.set(res);
        this.isConsultingCouncil.set(false);
      },
      error: (err) => {
        this.isConsultingCouncil.set(false);
        this.councilError.set(err.error?.message || 'Failed to convene Council. Please try again.');
      },
    });
  }
}
