import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CharacterService } from '../../../core/services/character.service';
import { MindService } from '../../../core/services/mind.service';
import { Character } from '../../../core/models/character.model';
import { MindSource, MindPublishDto } from '../../../core/models/mind.model';

@Component({
  selector: 'app-mind-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mind-studio.component.html',
  styleUrl: './mind-studio.component.scss',
})
export class MindStudioComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private characterService = inject(CharacterService);
  private mindService = inject(MindService);

  characterId = signal<number | null>(null);
  character = signal<Character | null>(null);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Publication State
  isPublic = signal<boolean>(false);
  handle = signal<string>('');
  headline = signal<string>('');
  websiteUrl = signal<string>('');
  philosophyStatement = signal<string>('');
  decisionFrameworks = signal<string[]>([]);
  newFrameworkInput = signal<string>('');
  tags = signal<string[]>([]);
  newTagInput = signal<string>('');

  // Ingestion State
  activeIngestTab = signal<'upload' | 'url' | 'text'>('upload');
  sources = signal<MindSource[]>([]);
  isLoadingSources = signal<boolean>(false);

  // Ingestion inputs
  urlInput = signal<string>('');
  urlTitleInput = signal<string>('');
  docTitleInput = signal<string>('');
  selectedFile = signal<File | null>(null);
  isDragOver = signal<boolean>(false);

  manualTextTitle = signal<string>('');
  manualTextContent = signal<string>('');

  isIngesting = signal<boolean>(false);
  ingestProgressMessage = signal<string | null>(null);
  ingestError = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      this.characterId.set(id);
      this.loadCharacter(id);
      this.loadSources(id);
    } else {
      this.router.navigate(['/dashboard/characters']);
    }
  }

  loadCharacter(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.characterService.getCharacterById(id).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.data) {
          const c = res.data;
          this.character.set(c);
          this.isPublic.set(Boolean(c.is_public));
          this.handle.set(c.handle || '');
          this.headline.set(c.headline || '');
          this.websiteUrl.set(c.website_url || '');
          this.philosophyStatement.set(c.philosophy_statement || c.personality || '');
          this.decisionFrameworks.set(
            Array.isArray(c.decision_frameworks) && c.decision_frameworks.length > 0
              ? [...c.decision_frameworks]
              : (Array.isArray(c.mental_models) ? [...c.mental_models] : [])
          );
          this.tags.set(Array.isArray(c.tags) ? [...c.tags] : []);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to load character.');
      },
    });
  }

  loadSources(id: number): void {
    this.isLoadingSources.set(true);
    this.mindService.getSources(id).subscribe({
      next: (srcs) => {
        this.sources.set(srcs || []);
        this.isLoadingSources.set(false);
      },
      error: () => {
        this.isLoadingSources.set(false);
      },
    });
  }

  addFramework(): void {
    const text = this.newFrameworkInput().trim();
    if (text) {
      this.decisionFrameworks.update((f) => [...f, text]);
      this.newFrameworkInput.set('');
    }
  }

  removeFramework(index: number): void {
    this.decisionFrameworks.update((f) => f.filter((_, i) => i !== index));
  }

  addTag(): void {
    let t = this.newTagInput().trim().replace(/^#/, '');
    if (t && !this.tags().includes(t)) {
      this.tags.update((tags) => [...tags, t]);
      this.newTagInput.set('');
    }
  }

  removeTag(tag: string): void {
    this.tags.update((tags) => tags.filter((t) => t !== tag));
  }

  saveMindSettings(): void {
    const id = this.characterId();
    if (!id) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const dto: MindPublishDto = {
      is_public: this.isPublic(),
      handle: this.handle().trim() || undefined,
      headline: this.headline().trim(),
      website_url: this.websiteUrl().trim() || undefined,
      philosophy_statement: this.philosophyStatement().trim(),
      decision_frameworks: this.decisionFrameworks(),
      mental_models: this.decisionFrameworks(),
      tags: this.tags(),
    };

    this.mindService.publishMind(id, dto).subscribe({
      next: (updatedChar) => {
        this.isSaving.set(false);
        this.character.set(updatedChar);
        this.successMessage.set(
          dto.is_public
            ? `Mind saved! Published to Thought Commons as @${updatedChar.handle || updatedChar.name}.`
            : 'Mind saved in private mode.'
        );
        setTimeout(() => this.successMessage.set(null), 5000);
      },
      error: (err: any) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to save mind settings.');
      },
    });
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.selectedFile.set(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile.set(target.files[0]);
    }
  }

  uploadDocument(): void {
    const id = this.characterId();
    const file = this.selectedFile();
    if (!id || !file) return;

    this.isIngesting.set(true);
    this.ingestProgressMessage.set(`Uploading and parsing ${file.name}...`);
    this.ingestError.set(null);

    this.mindService.ingestDocument(id, file, this.docTitleInput().trim() || file.name).subscribe({
      next: (newSource: any) => {
        this.isIngesting.set(false);
        this.ingestProgressMessage.set(null);
        this.selectedFile.set(null);
        this.docTitleInput.set('');
        this.sources.update((srcs) => [newSource, ...srcs]);
        this.successMessage.set(`Indexed "${file.name}" into knowledge nodes.`);
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err: any) => {
        this.isIngesting.set(false);
        this.ingestProgressMessage.set(null);
        this.ingestError.set(err.error?.message || 'Failed to parse and index document.');
      },
    });
  }

  ingestUrl(): void {
    const id = this.characterId();
    const url = this.urlInput().trim();
    if (!id || !url) return;

    this.isIngesting.set(true);
    this.ingestProgressMessage.set(`Scraping and cleaning article from ${url}...`);
    this.ingestError.set(null);

    this.mindService.ingestUrl(id, url, this.urlTitleInput().trim() || undefined).subscribe({
      next: (newSource: any) => {
        this.isIngesting.set(false);
        this.ingestProgressMessage.set(null);
        this.urlInput.set('');
        this.urlTitleInput.set('');
        this.sources.update((srcs) => [newSource, ...srcs]);
        this.successMessage.set(`Indexed webpage content into knowledge nodes.`);
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err: any) => {
        this.isIngesting.set(false);
        this.ingestProgressMessage.set(null);
        this.ingestError.set(err.error?.message || 'Failed to scrape and index URL.');
      },
    });
  }

  ingestText(): void {
    const id = this.characterId();
    const title = this.manualTextTitle().trim() || 'Core Framework Memo';
    const content = this.manualTextContent().trim();
    if (!id || !content) return;

    this.isIngesting.set(true);
    this.ingestProgressMessage.set('Segmenting and indexing doctrine...');
    this.ingestError.set(null);

    this.mindService.ingestText(id, title, content).subscribe({
      next: (newSource: any) => {
        this.isIngesting.set(false);
        this.ingestProgressMessage.set(null);
        this.manualTextTitle.set('');
        this.manualTextContent.set('');
        this.sources.update((srcs) => [newSource, ...srcs]);
        this.successMessage.set(`Indexed doctrine "${title}" into knowledge nodes.`);
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err: any) => {
        this.isIngesting.set(false);
        this.ingestProgressMessage.set(null);
        this.ingestError.set(err.error?.message || 'Failed to index manual doctrine.');
      },
    });
  }

  deleteSource(sourceId: number): void {
    const id = this.characterId();
    if (!id) return;
    if (!confirm('Are you sure you want to delete this source and its knowledge chunks?')) return;

    this.mindService.deleteSource(id, sourceId).subscribe({
      next: () => {
        this.sources.update((srcs) => srcs.filter((s) => s.id !== sourceId));
        this.successMessage.set('Source deleted.');
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err: any) => {
        this.errorMessage.set(err.error?.message || 'Failed to delete source.');
      },
    });
  }
}
