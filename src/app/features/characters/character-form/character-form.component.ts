import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CharacterService } from '../../../core/services/character.service';
import { MindService } from '../../../core/services/mind.service';
import { UploadService } from '../../../core/services/upload.service';
import { VoiceService } from '../../../core/services/voice.service';
import { CreateCharacterDto } from '../../../core/models/character.model';
import { MindSource } from '../../../core/models/mind.model';
import { VoicePreset, ClonedVoiceResult } from '../../../core/models/voice.model';

@Component({
  selector: 'app-character-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './character-form.component.html',
  styleUrl: './character-form.component.scss',
})
export class CharacterFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private characterService = inject(CharacterService);
  private mindService = inject(MindService);
  private uploadService = inject(UploadService);
  public voiceService = inject(VoiceService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  characterId: number | null = null;
  isEditMode = false;
  isLoading = false;
  isUploadingAvatar = signal<boolean>(false);
  avatarUploadError = signal<string | null>(null);
  errorMessage: string | null = null;

  // Voice Presence state
  presets = signal<VoicePreset[]>([]);
  activeVoiceTab = signal<'preset' | 'cloned'>('preset');
  selectedPresetId = signal<string>('alloy');
  isCloningVoice = signal<boolean>(false);
  cloneError = signal<string | null>(null);
  cloneSuccess = signal<string | null>(null);
  isRecordingVoiceSample = signal<boolean>(false);
  isPreviewPlayingVoiceId = signal<string | null>(null);

  // Thought Commons Knowledge Studio state
  sources = signal<MindSource[]>([]);
  isLoadingSources = signal<boolean>(false);
  isIngestingUrl = signal<boolean>(false);
  isUploadingDoc = signal<boolean>(false);
  urlInput = '';
  urlTitleInput = '';
  docTitleInput = '';
  selectedDocFile: File | null = null;
  studioSuccess = signal<string | null>(null);
  studioError = signal<string | null>(null);

  relationshipOptions: { value: string; label: string }[] = [
    { value: 'father', label: 'Father / Dad' },
    { value: 'mother', label: 'Mother / Mom' },
    { value: 'spouse', label: 'Spouse / Husband / Wife' },
    { value: 'partner', label: 'Partner / Girlfriend / Boyfriend' },
    { value: 'friend', label: 'Close Friend / Companion' },
    { value: 'mentor', label: 'Life Mentor / Guide' },
    { value: 'sibling', label: 'Sibling / Brother / Sister' },
    { value: 'custom', label: 'Custom Relationship' },
  ];

  characterForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    avatarUrl: [''],
    gender: [''],
    relationship_type: ['friend', [Validators.required]],
    nicknames_for_user: [''],
    catchphrases: [''],
    speech_quirks: [''],
    shared_memories_seed: [''],
    personality: ['', [Validators.required]],
    tone: ['Warm & Empathetic', [Validators.required]],
    humor: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
    friendliness: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
    creativity: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
    style: ['Direct & Conversational', [Validators.required]],
    backstory: [''],
    interestsString: ['Philosophy, Sci-Fi, Coffee'],
    greeting: ['Hello! It is wonderful to meet you. What would you like to explore today?', [Validators.required]],
    // Voice Presence Fields
    voice_provider: ['preset'],
    voice_id: ['alloy'],
    voice_sample_url: [''],
    voice_settings: [null],
    // Public AI Mind Fields
    is_public: [false],
    handle: [''],
    headline: [''],
    website_url: [''],
    philosophy_statement: [''],
    mental_models_string: [''],
    tags_string: [''],
  });

  onAvatarFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.isUploadingAvatar.set(true);
      this.avatarUploadError.set(null);

      const upload$ = this.characterId
        ? this.uploadService.uploadCharacterAvatar(this.characterId, file)
        : this.uploadService.uploadImage(file);

      upload$.subscribe({
        next: (res) => {
          this.characterForm.patchValue({ avatarUrl: res.url });
          this.isUploadingAvatar.set(false);
        },
        error: (err) => {
          this.isUploadingAvatar.set(false);
          this.avatarUploadError.set(err.error?.message || 'Failed to upload avatar image.');
        },
      });
    }
  }

  ngOnInit(): void {
    this.loadPresets();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.characterId = parseInt(idParam, 10);
      this.isEditMode = true;
      this.loadCharacter(this.characterId);
      this.loadSources(this.characterId);
    }
  }

  loadPresets(): void {
    this.voiceService.getPresets().subscribe({
      next: (data) => {
        this.presets.set(data || []);
      },
      error: (err) => {
        console.warn('[VOICE] Failed to load presets:', err);
      },
    });
  }

  selectPreset(preset: VoicePreset): void {
    this.selectedPresetId.set(preset.id);
    this.characterForm.patchValue({
      voice_provider: 'preset',
      voice_id: preset.id,
    });
  }

  previewPreset(preset: VoicePreset, event?: Event): void {
    if (event) event.stopPropagation();

    if (this.voiceService.isAudioPlaying() && this.isPreviewPlayingVoiceId() === preset.id) {
      this.voiceService.stopAudio();
      this.isPreviewPlayingVoiceId.set(null);
      return;
    }

    this.isPreviewPlayingVoiceId.set(preset.id);
    this.voiceService.previewVoice(preset.previewText, preset.id).subscribe({
      next: (res) => {
        if (res.audioBase64) {
          this.voiceService.playAudio(res.audioBase64, preset.id).finally(() => {
            this.isPreviewPlayingVoiceId.set(null);
          });
        }
      },
      error: () => {
        this.isPreviewPlayingVoiceId.set(null);
      },
    });
  }

  onVoiceSampleSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const charName = this.characterForm.get('name')?.value || 'Companion';

      this.isCloningVoice.set(true);
      this.cloneError.set(null);
      this.cloneSuccess.set(null);

      this.voiceService.cloneVoice(file, charName).subscribe({
        next: (res) => {
          this.isCloningVoice.set(false);
          this.characterForm.patchValue({
            voice_provider: 'cloned',
            voice_id: res.voiceId,
            voice_sample_url: res.voiceSampleUrl,
            voice_settings: res.voiceSettings,
          });
          this.cloneSuccess.set('Voice sample cloned and assigned successfully!');
        },
        error: (err) => {
          this.isCloningVoice.set(false);
          this.cloneError.set(err.error?.message || 'Failed to clone voice sample.');
        },
      });
    }
  }

  async startRecordingVoiceSample(): Promise<void> {
    try {
      this.cloneError.set(null);
      this.cloneSuccess.set(null);
      await this.voiceService.startRecording();
      this.isRecordingVoiceSample.set(true);
    } catch (err: any) {
      this.cloneError.set(err.message || 'Microphone access denied.');
    }
  }

  async stopRecordingVoiceSample(): Promise<void> {
    if (!this.isRecordingVoiceSample()) return;
    this.isRecordingVoiceSample.set(false);
    this.isCloningVoice.set(true);

    try {
      const audioBlob = await this.voiceService.stopRecording();
      const charName = this.characterForm.get('name')?.value || 'Companion';

      this.voiceService.cloneVoice(audioBlob, charName).subscribe({
        next: (res) => {
          this.isCloningVoice.set(false);
          this.characterForm.patchValue({
            voice_provider: 'cloned',
            voice_id: res.voiceId,
            voice_sample_url: res.voiceSampleUrl,
            voice_settings: res.voiceSettings,
          });
          this.cloneSuccess.set('Microphone voice sample cloned and configured!');
        },
        error: (err) => {
          this.isCloningVoice.set(false);
          this.cloneError.set(err.error?.message || 'Failed to process voice sample.');
        },
      });
    } catch (err: any) {
      this.isCloningVoice.set(false);
      this.cloneError.set('Could not finalize recording.');
    }
  }

  loadCharacter(id: number): void {
    this.isLoading = true;
    this.characterService.getCharacterById(id).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.data) {
          const char = res.data;
          if (char.voice_provider === 'cloned') {
            this.activeVoiceTab.set('cloned');
          } else {
            this.activeVoiceTab.set('preset');
            this.selectedPresetId.set(char.voice_id || 'alloy');
          }

          this.characterForm.patchValue({
            name: char.name,
            avatarUrl: char.avatar_url || '',
            gender: char.gender || 'Non-Binary',
            relationship_type: char.relationship_type || 'friend',
            nicknames_for_user: Array.isArray(char.nicknames_for_user) ? char.nicknames_for_user.join(', ') : '',
            catchphrases: Array.isArray(char.catchphrases) ? char.catchphrases.join(', ') : '',
            speech_quirks: char.speech_quirks || '',
            shared_memories_seed: char.shared_memories_seed || '',
            personality: char.personality,
            tone: char.tone,
            humor: char.humor,
            friendliness: char.friendliness,
            creativity: char.creativity,
            style: char.style,
            backstory: char.backstory || '',
            interestsString: Array.isArray(char.interests) ? char.interests.join(', ') : '',
            greeting: char.greeting,
            voice_provider: char.voice_provider || 'preset',
            voice_id: char.voice_id || 'alloy',
            voice_sample_url: char.voice_sample_url || '',
            voice_settings: char.voice_settings || null,
            is_public: Boolean(char.is_public),
            handle: char.handle || '',
            headline: char.headline || '',
            website_url: char.website_url || '',
            philosophy_statement: char.philosophy_statement || '',
            mental_models_string: Array.isArray(char.mental_models) ? char.mental_models.join(', ') : '',
            tags_string: Array.isArray(char.tags) ? char.tags.join(', ') : '',
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error?.message || 'Failed to load character.';
      },
    });
  }

  loadSources(characterId: number): void {
    this.isLoadingSources.set(true);
    this.mindService.getSources(characterId).subscribe({
      next: (data) => {
        this.sources.set(data || []);
        this.isLoadingSources.set(false);
      },
      error: () => {
        this.isLoadingSources.set(false);
      },
    });
  }

  onIngestUrl(): void {
    if (!this.characterId || !this.urlInput.trim()) return;

    this.isIngestingUrl.set(true);
    this.studioError.set(null);
    this.studioSuccess.set(null);

    this.mindService.ingestUrl(this.characterId, this.urlInput.trim(), this.urlTitleInput.trim()).subscribe({
      next: (source) => {
        this.isIngestingUrl.set(false);
        this.urlInput = '';
        this.urlTitleInput = '';
        this.studioSuccess.set(`Successfully indexed "${source.title}" (${source.chunk_count || source.chunkCount || 1} knowledge nodes generated).`);
        this.loadSources(this.characterId!);
      },
      error: (err) => {
        this.isIngestingUrl.set(false);
        this.studioError.set(err.error?.message || 'Failed to ingest URL.');
      },
    });
  }

  onFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.selectedDocFile = file;
      if (!this.docTitleInput) {
        this.docTitleInput = file.name.replace(/\.[^/.]+$/, '');
      }
    }
  }

  onUploadDocument(): void {
    if (!this.characterId || !this.selectedDocFile) return;

    this.isUploadingDoc.set(true);
    this.studioError.set(null);
    this.studioSuccess.set(null);

    this.mindService
      .ingestDocument(this.characterId, this.selectedDocFile, this.docTitleInput.trim())
      .subscribe({
        next: (source) => {
          this.isUploadingDoc.set(false);
          this.selectedDocFile = null;
          this.docTitleInput = '';
          this.studioSuccess.set(`Successfully parsed and indexed "${source.title}" (${source.chunk_count || source.chunkCount || 1} knowledge chunks created).`);
          this.loadSources(this.characterId!);
        },
        error: (err) => {
          this.isUploadingDoc.set(false);
          this.studioError.set(err.error?.message || 'Failed to upload and parse document.');
        },
      });
  }

  onDeleteSource(sourceId: number): void {
    if (!this.characterId) return;

    this.mindService.deleteSource(this.characterId, sourceId).subscribe({
      next: () => {
        this.sources.update((prev) => prev.filter((s) => s.id !== sourceId));
        this.studioSuccess.set('Source and knowledge chunks removed.');
      },
      error: (err) => {
        this.studioError.set(err.error?.message || 'Failed to delete source.');
      },
    });
  }

  onSubmit(): void {
    if (this.characterForm.invalid) {
      this.characterForm.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.isLoading = true;

    const val = this.characterForm.value;

    const interests = val.interestsString
      ? val.interestsString.split(',').map((s: string) => s.trim()).filter((s: string) => !!s)
      : [];

    const nicknames_for_user = val.nicknames_for_user
      ? val.nicknames_for_user.split(',').map((s: string) => s.trim()).filter((s: string) => !!s)
      : [];

    const catchphrases = val.catchphrases
      ? val.catchphrases.split(',').map((s: string) => s.trim()).filter((s: string) => !!s)
      : [];

    const mental_models = val.mental_models_string
      ? val.mental_models_string.split(',').map((s: string) => s.trim()).filter((s: string) => !!s)
      : [];

    const tags = val.tags_string
      ? val.tags_string.split(',').map((s: string) => s.trim()).filter((s: string) => !!s)
      : [];

    const cleanHandle = val.handle ? String(val.handle).replace(/^@/, '').toLowerCase().trim() : null;

    const dto: CreateCharacterDto = {
      name: val.name,
      avatarUrl: val.avatarUrl || null,
      gender: val.gender || null,
      relationship_type: val.relationship_type,
      nicknames_for_user,
      catchphrases,
      speech_quirks: val.speech_quirks || null,
      shared_memories_seed: val.shared_memories_seed || null,
      personality: val.personality,
      tone: val.tone,
      humor: parseInt(val.humor, 10),
      friendliness: parseInt(val.friendliness, 10),
      creativity: parseInt(val.creativity, 10),
      style: val.style,
      backstory: val.backstory || null,
      interests,
      greeting: val.greeting,
      voice_provider: val.voice_provider || 'preset',
      voice_id: val.voice_id || 'alloy',
      voice_sample_url: val.voice_sample_url || null,
      voice_settings: val.voice_settings || null,
      is_public: Boolean(val.is_public),
      handle: cleanHandle,
      headline: val.headline || null,
      website_url: val.website_url || null,
      philosophy_statement: val.philosophy_statement || null,
      mental_models,
      tags,
    };

    if (this.isEditMode && this.characterId) {
      this.characterService.updateCharacter(this.characterId, dto).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/dashboard/characters']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.error?.message || 'Failed to update character.';
        },
      });
    } else {
      this.characterService.createCharacter(dto).subscribe({
        next: (res) => {
          this.isLoading = false;
          // If public and created, redirect to edit or list
          this.router.navigate(['/dashboard/characters']);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.error?.message || 'Failed to create character.';
        },
      });
    }
  }
}
