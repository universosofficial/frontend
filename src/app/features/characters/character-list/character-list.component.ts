import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CharacterService } from '../../../core/services/character.service';
import { MindService } from '../../../core/services/mind.service';
import { AuthService } from '../../../core/services/auth.service';
import { Character } from '../../../core/models/character.model';
import { PublicMind } from '../../../core/models/mind.model';

@Component({
  selector: 'app-character-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './character-list.component.html',
  styleUrl: './character-list.component.scss',
})
export class CharacterListComponent implements OnInit {
  characterService = inject(CharacterService);
  mindService = inject(MindService);
  authService = inject(AuthService);
  private router = inject(Router);

  publicMinds = signal<PublicMind[]>([]);
  mindsSearchQuery = signal<string>('');
  isLoadingMinds = signal<boolean>(true);

  ngOnInit(): void {
    this.characterService.getCharacters().subscribe();
    this.loadPublicMinds();
  }

  loadPublicMinds(): void {
    this.isLoadingMinds.set(true);
    this.mindService.exploreMinds({ limit: 4, sort: 'popular' }).subscribe({
      next: (res) => {
        this.publicMinds.set(res.minds || []);
        this.isLoadingMinds.set(false);
      },
      error: () => {
        this.isLoadingMinds.set(false);
      },
    });
  }

  onSearchMinds(): void {
    const q = this.mindsSearchQuery().trim();
    if (q) {
      this.router.navigate(['/dashboard/explore'], { queryParams: { q } });
    } else {
      this.router.navigate(['/dashboard/explore']);
    }
  }

  onConsultMind(mind: PublicMind): void {
    const handle = (mind.handle || String(mind.id)).replace(/^@/, '');
    this.router.navigate(['/dashboard/minds', handle]);
  }

  onChat(character: Character): void {
    this.router.navigate(['/dashboard/chat', character.id]);
  }

  onEdit(character: Character, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate(['/dashboard/characters', character.id, 'edit']);
  }

  onDelete(character: Character, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${character.name}"?`)) {
      this.characterService.deleteCharacter(character.id).subscribe();
    }
  }

  isOwner(character: Character): boolean {
    const currentUserId = this.authService.currentUser()?.id;
    return !character.is_system && character.user_id === currentUserId;
  }
}
