import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CharacterService } from '../../../core/services/character.service';
import { ChatService } from '../../../core/services/chat.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Character } from '../../../core/models/character.model';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FormsModule],
  templateUrl: './dashboard-shell.component.html',
  styleUrl: './dashboard-shell.component.scss',
})
export class DashboardShellComponent implements OnInit {
  authService = inject(AuthService);
  characterService = inject(CharacterService);
  chatService = inject(ChatService);
  themeService = inject(ThemeService);
  private router = inject(Router);

  searchQuery = signal<string>('');
  activeTab = signal<'all' | 'official' | 'custom'>('all');
  activeCharacterId = signal<number | null>(null);
  isChatRoute = signal<boolean>(false);
  isFormRoute = signal<boolean>(false);
  isSettingsOpen = signal<boolean>(false);
  activeMobileTab = signal<'chats' | 'personas'>('chats');

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
    // Load characters on startup
    this.characterService.getCharacters().subscribe();

    // Track active chat from router events
    this.syncActiveRoute(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.syncActiveRoute(event.urlAfterRedirects);
      });
  }

  private syncActiveRoute(url: string): void {
    const chatMatch = url.match(/\/dashboard\/chat\/(\d+)/);
    const mindMatch = url.match(/\/dashboard\/minds\/([^\/]+)/) || url.match(/\/dashboard\/consult\/([^\/]+)/);
    const formMatch = url.includes('/dashboard/characters/new') || url.includes('/edit');

    if (chatMatch && chatMatch[1]) {
      this.activeCharacterId.set(parseInt(chatMatch[1], 10));
      this.isChatRoute.set(true);
      this.isFormRoute.set(false);
    } else if (mindMatch) {
      this.activeCharacterId.set(null);
      this.isChatRoute.set(true);
      this.isFormRoute.set(false);
    } else if (formMatch) {
      this.activeCharacterId.set(null);
      this.isChatRoute.set(false);
      this.isFormRoute.set(true);
    } else {
      this.activeCharacterId.set(null);
      this.isChatRoute.set(false);
      this.isFormRoute.set(false);
    }
  }

  onSelectCharacter(char: Character): void {
    this.activeCharacterId.set(char.id);
    this.isSettingsOpen.set(false);
    this.router.navigate(['/dashboard/chat', char.id]);
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
