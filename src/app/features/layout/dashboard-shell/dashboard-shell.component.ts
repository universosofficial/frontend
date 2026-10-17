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

  // Filtered characters list for WhatsApp sidebar with live last message sorting
  filteredCharacters = computed(() => {
    const list = this.characterService.characters();
    const query = this.searchQuery().toLowerCase().trim();
    const tab = this.activeTab();
    // Subscribe to live message updates from chatService
    const _liveMap = this.chatService.lastMessageMap();

    const filtered = list.filter((char) => {
      // Tab filter
      if (tab === 'official' && !char.is_system) return false;
      if (tab === 'custom' && char.is_system) return false;

      // Search query filter
      if (!query) return true;
      const lastMsg = this.getLastMessage(char).toLowerCase();
      return (
        char.name.toLowerCase().includes(query) ||
        lastMsg.includes(query) ||
        (char.style && char.style.toLowerCase().includes(query)) ||
        (char.tone && char.tone.toLowerCase().includes(query)) ||
        (char.personality && char.personality.toLowerCase().includes(query))
      );
    });

    return filtered.slice().sort((a, b) => {
      return this.getCharacterSortTime(b) - this.getCharacterSortTime(a);
    });
  });

  getCharacterSortTime(char: Character): number {
    const key = char.handle ? `mind_${char.handle.replace(/^@/, '')}` : String(char.id);
    const live = this.chatService.lastMessageMap().get(key) || (char.id ? this.chatService.lastMessageMap().get(String(char.id)) : null);
    const timeStr = live?.created_at || char.last_message_at || (char as any).sort_time || char.updated_at || char.created_at;
    if (!timeStr) return 0;
    const t = new Date(timeStr).getTime();
    return isNaN(t) ? 0 : t;
  }

  getLastMessage(char: Character): string {
    const key = char.handle ? `mind_${char.handle.replace(/^@/, '')}` : String(char.id);
    const live = this.chatService.lastMessageMap().get(key) || (char.id ? this.chatService.lastMessageMap().get(String(char.id)) : null);

    if (live && live.content) {
      return this.formatMessageSnippet(live.content, live.sender_type);
    }
    if (char.last_message) {
      return this.formatMessageSnippet(char.last_message, char.last_message_sender);
    }
    return char.greeting || char.headline || char.personality || 'No messages yet';
  }

  private formatMessageSnippet(content: string, senderType?: string | null): string {
    if (!content) return '';
    let clean = content
      .replace(/\[Shared Image:\s*[^\]]+\]\n?/g, '📷 Photo ')
      .replace(/📄\s*\[Attached Note "[^"]+"\]:\n"[^"]*"\n\n?/g, '📄 Document ')
      .replace(/[\r\n]+/g, ' ')
      .trim();

    const prefix = senderType === 'user' ? 'You: ' : '';
    return `${prefix}${clean}`;
  }

  getLastMessageTime(char: Character): string {
    const key = char.handle ? `mind_${char.handle.replace(/^@/, '')}` : String(char.id);
    const live = this.chatService.lastMessageMap().get(key) || (char.id ? this.chatService.lastMessageMap().get(String(char.id)) : null);
    const timeStr = live?.created_at || char.last_message_at;
    if (!timeStr) return '';
    return this.formatMessageTime(timeStr);
  }

  formatMessageTime(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return 'Yesterday';
    }

    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }

    return date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
  }

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
    const chatMatch = url.match(/\/dashboard\/chat\/([^\/?#]+)/);
    const mindMatch = url.match(/\/dashboard\/minds\/([^\/?#]+)/) || url.match(/\/dashboard\/consult\/([^\/?#]+)/);
    const formMatch = url.includes('/dashboard/characters/new') || url.includes('/edit') || url.includes('/dashboard/profile') || url.includes('/dashboard/my-mind');

    if (chatMatch && chatMatch[1]) {
      const id = parseInt(chatMatch[1], 10);
      this.activeCharacterId.set(isNaN(id) ? null : id);
      this.activeMindHandle.set(isNaN(id) ? chatMatch[1] : null);
      this.isChatRoute.set(true);
      this.isFormRoute.set(false);
      this.markChatKeyRead(`char_${chatMatch[1]}`);
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

  onNavigateProfile(): void {
    this.isSettingsOpen.set(false);
    this.router.navigate(['/dashboard/profile']);
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
