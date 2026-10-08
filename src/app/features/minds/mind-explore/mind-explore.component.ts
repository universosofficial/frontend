import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { MindService } from '../../../core/services/mind.service';
import { AuthService } from '../../../core/services/auth.service';
import { PublicMind } from '../../../core/models/mind.model';

@Component({
  selector: 'app-mind-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mind-explore.component.html',
  styleUrl: './mind-explore.component.scss',
})
export class MindExploreComponent implements OnInit, OnDestroy {
  private mindService = inject(MindService);
  private authService = inject(AuthService);
  private router = inject(Router);

  searchQuery = signal<string>('');
  selectedTag = signal<string>('all');
  selectedSort = signal<string>('popular');
  isLoading = signal<boolean>(true);
  subscribingMindId = signal<number | null>(null);
  minds = signal<PublicMind[]>([]);
  totalMinds = signal<number>(0);
  errorMessage = signal<string | null>(null);

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
    if (this.router.url.startsWith('/dashboard')) {
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
}
