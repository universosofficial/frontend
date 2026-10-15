import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CharacterService } from '../../../core/services/character.service';
import { ChatService } from '../../../core/services/chat.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TourGuideService } from '../../../core/services/tour-guide.service';
import { TourGuideComponent } from '../../../shared/components/tour-guide/tour-guide.component';
import { Character } from '../../../core/models/character.model';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FormsModule, TourGuideComponent],
  templateUrl: './dashboard-shell.component.html',
  styleUrl: './dashboard-shell.component.scss',
})
export class DashboardShellComponent implements OnInit {
  authService = inject(AuthService);
  characterService = inject(CharacterService);
  chatService = inject(ChatService);
  themeService = inject(ThemeService);
  tourService = inject(TourGuideService);
  private router = inject(Router);

  searchQuery = signal<string>('');
  activeTab = signal<'all' | 'official' | 'custom'>('all');
  activeCharacterId = signal<number | null>(null);
  activeMindHandle = signal<string | null>(null);
  isChatRoute = signal<boolean>(false);
  isFormRoute = signal<boolean>(false);
  isSettingsOpen = signal<boolean>(false);
  activeMobileTab = signal<('chats' | 'personas')>('chats');
  readChatKeys = signal<Set<string>>(new Set());

  // Filtered characters list for WhatsApp sidebar
  filteredCharacters = computed(() => {
    const list = this.characterService.characters();
    const query = this.searchQuery().toLowerCase().trim();
    const tab = this.activeTab();

    return list.filter((char) => {
      // Tab filter
      if (tab === 'official' && !char.is_system) return false;
      if (tab === 'custom' && char.is_system) return false;

      // Search query filter
      if (!query) return true;
      return (
        char.name.toLowerCase().includes(query) ||
        char.style.toLowerCase().includes(query) ||
        char.tone.toLowerCase().includes(query) ||
        char.personality.toLowerCase().includes(query)
      );
    });
  });

  ngOnInit(): void {
    this.loadReadCheckIns();

    // Load characters on startup
    this.characterService.getCharacters().subscribe();

    // Check for first-time user tour guide
    this.tourService.initAutoTour();

    // Track active chat from router events
    this.syncActiveRoute(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.syncActiveRoute(event.urlAfterRedirects);
      });
  }

  private loadReadCheckIns(): void {
    try {
      const raw = localStorage.getItem('lumina_read_checkins_v1');
      if (raw) {
        this.readChatKeys.set(new Set(JSON.parse(raw)));
      }
    } catch (_) {}
  }

  private markChatKeyRead(key: string): void {
    this.readChatKeys.update((prev) => {
      const next = new Set(prev);
      next.add(key);
      try {
        localStorage.setItem('lumina_read_checkins_v1', JSON.stringify(Array.from(next)));
      } catch (_) {}
      return next;
    });
  }

  getChatKey(char: Character): string {
    return char.handle ? `mind_${char.handle.replace(/^@/, '')}` : `char_${char.id}`;
  }

  hasProactiveCheckIn(char: Character, index: number): boolean {
    const key = this.getChatKey(char);
    if (char.handle && this.activeMindHandle() === char.handle.replace(/^@/, '')) return false;
    if (!char.handle && this.activeCharacterId() === char.id) return false;
    if (this.readChatKeys().has(key)) return false;
    return index < 2;
  }

  private syncActiveRoute(url: string): void {
    const chatMatch = url.match(/\/dashboard\/chat\/(\d+)/);
    const mindMatch = url.match(/\/dashboard\/minds\/([^\/]+)/) || url.match(/\/dashboard\/consult\/([^\/]+)/);
    const formMatch = url.includes('/dashboard/characters/new') || url.includes('/edit');

    if (chatMatch && chatMatch[1]) {
      const id = parseInt(chatMatch[1], 10);
      this.activeCharacterId.set(id);
      this.activeMindHandle.set(null);
      this.isChatRoute.set(true);
      this.isFormRoute.set(false);
      this.markChatKeyRead(`char_${id}`);
    } else if (mindMatch && mindMatch[1]) {
      const handle = mindMatch[1].replace(/^@/, '');
      this.activeMindHandle.set(handle);
      this.activeCharacterId.set(null);
      this.isChatRoute.set(true);
      this.isFormRoute.set(false);
      this.markChatKeyRead(`mind_${handle}`);
    } else if (formMatch) {
      this.activeCharacterId.set(null);
      this.activeMindHandle.set(null);
      this.isChatRoute.set(false);
      this.isFormRoute.set(true);
    } else {
      this.activeCharacterId.set(null);
      this.activeMindHandle.set(null);
      this.isChatRoute.set(false);
      this.isFormRoute.set(false);
    }
  }

  onSelectCharacter(char: Character): void {
    this.markChatKeyRead(this.getChatKey(char));
    if (char.is_mind || char.handle) {
      const handle = (char.handle || String(char.id)).replace(/^@/, '');
      this.activeMindHandle.set(handle);
      this.activeCharacterId.set(null);
      this.isSettingsOpen.set(false);
      this.router.navigate(['/dashboard/minds', handle]);
    } else {
      this.activeMindHandle.set(null);
      this.activeCharacterId.set(char.id);
      this.isSettingsOpen.set(false);
      this.router.navigate(['/dashboard/chat', char.id]);
    }
  }

  onNewPersona(): void {
    this.activeCharacterId.set(null);
    this.isSettingsOpen.set(false);
    this.router.navigate(['/dashboard/characters/new']);
  }

  onNavigatePersonas(): void {
    this.isSettingsOpen.set(false);
    this.activeMobileTab.set('personas');
    this.router.navigate(['/dashboard/characters']);
  }

  toggleSettings(): void {
    this.isSettingsOpen.update((v) => !v);
  }

  closeSettings(): void {
    this.isSettingsOpen.set(false);
  }

  onNavigateMinds(): void {
    this.isSettingsOpen.set(false);
    this.router.navigate(['/dashboard/explore']);
  }

  onNavigateExplore(): void {
    this.isSettingsOpen.set(false);
    this.router.navigate(['/dashboard/explore']);
  }

  onNavigateMyMind(): void {
    this.isSettingsOpen.set(false);
    this.router.navigate(['/dashboard/my-mind']);
  }

  setMobileTab(tab: 'chats' | 'personas'): void {
    this.activeMobileTab.set(tab);
    this.isSettingsOpen.set(false);
    if (this.router.url !== '/dashboard/characters') {
      this.router.navigate(['/dashboard/characters']);
    }
  }

  onLogout(): void {
    this.isSettingsOpen.set(false);
    this.authService.logout();
  }

  isOwner(char: Character): boolean {
    const currentUser = this.authService.currentUser();
    return !!currentUser && char.user_id === currentUser.id && !char.is_system;
  }

  onOpenStudio(char: Character, event: MouseEvent): void {
    event.stopPropagation();
    this.isSettingsOpen.set(false);
    this.router.navigate(['/dashboard/characters', char.id, 'studio']);
  }

  onDeleteCharacter(char: Character, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete ${char.name}? All conversational history will be removed.`)) {
      this.characterService.deleteCharacter(char.id).subscribe({
        next: () => {
          if (this.activeCharacterId() === char.id) {
            this.router.navigate(['/dashboard/characters']);
          }
        },
      });
    }
  }

  onEditCharacter(char: Character, event: MouseEvent): void {
    event.stopPropagation();
    this.isSettingsOpen.set(false);
    this.router.navigate(['/dashboard/characters', char.id, 'edit']);
  }
}
