import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MindService } from '../../../core/services/mind.service';
import { UploadService } from '../../../core/services/upload.service';
import { VoiceService } from '../../../core/services/voice.service';
import { UserMind, MindSource, AudienceQuestion, PaidHumanSession } from '../../../core/models/mind.model';
import { VoicePreset } from '../../../core/models/voice.model';

import { ShareMindModalComponent } from '../../minds/share-mind-modal/share-mind-modal.component';

@Component({
  selector: 'app-my-mind-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ShareMindModalComponent],
  templateUrl: './my-mind-studio.component.html',
  styleUrl: './my-mind-studio.component.scss',
})
export class MyMindStudioComponent implements OnInit {
  private mindService = inject(MindService);
  private uploadService = inject(UploadService);
  public voiceService = inject(VoiceService);
  private router = inject(Router);

  mind = signal<UserMind | null>(null);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  isUploadingAvatar = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  isShareModalOpen = signal<boolean>(false);

  // Voice Presence state
  voiceProvider = signal<'preset' | 'cloned' | 'none'>('preset');
  voiceId = signal<string>('echo');
  voiceSampleUrl = signal<string | null>(null);
  presets = signal<VoicePreset[]>([]);
  activeVoiceTab = signal<'preset' | 'cloned'>('preset');
  isCloningVoice = signal<boolean>(false);
  cloneError = signal<string | null>(null);
  cloneSuccess = signal<string | null>(null);
  previewPlayingVoiceId = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Profile Details
  displayName = signal<string>('');
  handle = signal<string>('');
  headline = signal<string>('');
  avatarUrl = signal<string>('');
  websiteUrl = signal<string>('');
  bio = signal<string>('');
  philosophyStatement = signal<string>('');
  isPublished = signal<boolean>(false);
  showAdvancedDetails = signal<boolean>(false);

  // Paid Direct Human Access Settings & VIP Inbox
  directChatEnabled = signal<boolean>(true);
  directChatPrice = signal<number>(25);
  directChatSla = signal<string>('Replies personally within a few hours');
  paidSessions = signal<PaidHumanSession[]>([]);
  activePaidSessionId = signal<number | null>(null);
  creatorReplyInput = signal<string>('');
  isSendingCreatorReply = signal<boolean>(false);

  // Frameworks & Tags
  decisionFrameworks = signal<string[]>([]);
  newFrameworkInput = signal<string>('');
  tags = signal<string[]>([]);
  newTagInput = signal<string>('');

  // Knowledge Ingestion
  activeIngestTab = signal<'upload' | 'url' | 'text' | 'interview'>('upload');
  sources = signal<MindSource[]>([]);
  isIngesting = signal<boolean>(false);
  ingestError = signal<string | null>(null);
  ingestSuccess = signal<string | null>(null);

  // Feature #2: 3-Question Brain Interview State
  interviewQ1 = signal<string>('');
  interviewQ2 = signal<string>('');
  interviewQ3 = signal<string>('');
  dictatingQuestionIdx = signal<number | null>(null);
  private speechRecognition: any = null;

  // Feature #3: Audience Questions & 1-Click Teach My Mind State
  audienceQuestions = signal<AudienceQuestion[]>([]);
  activeTeachQuestion = signal<string | null>(null);
  customTeachQuestion = signal<string>('');
  teachAnswerInput = signal<string>('');
  isTeachingQA = signal<boolean>(false);

  // Inputs
  urlInput = signal<string>('');
  urlTitleInput = signal<string>('');
  docTitleInput = signal<string>('');
  selectedFile = signal<File | null>(null);
  isDragOver = signal<boolean>(false);

  manualTextTitle = signal<string>('');
  manualTextContent = signal<string>('');

  // Test Consultation Preview Drawer
  isPreviewOpen = signal<boolean>(false);
  previewMessages = signal<Array<{ sender_type: 'user' | 'mind'; content: string; sources?: any[] }>>([]);
  previewInput = signal<string>('');
  isPreviewStreaming = signal<boolean>(false);

  ngOnInit(): void {
    this.loadPresets();
    this.loadMyMind();
  }

  loadPresets(): void {
    this.voiceService.getPresets().subscribe({
      next: (data) => {
        this.presets.set(data || []);
      },
      error: (err) => console.warn('[VOICE] Failed to load presets:', err),
    });
  }

  selectVoicePreset(preset: VoicePreset): void {
    this.voiceId.set(preset.id);
    this.voiceProvider.set('preset');
  }

  previewVoice(preset: VoicePreset, event?: Event): void {
    if (event) event.stopPropagation();

    if (this.voiceService.isAudioPlaying() && this.previewPlayingVoiceId() === preset.id) {
      this.voiceService.stopAudio();
      this.previewPlayingVoiceId.set(null);
      return;
    }

    this.previewPlayingVoiceId.set(preset.id);
    this.voiceService.previewVoice(preset.previewText, preset.id).subscribe({
      next: (res) => {
        if (res.audioBase64) {
          this.voiceService.playAudio(res.audioBase64, preset.id).finally(() => {
            this.previewPlayingVoiceId.set(null);
          });
        }
      },
      error: () => {
        this.previewPlayingVoiceId.set(null);
      },
    });
  }

  onVoiceSampleUpload(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const mindName = this.displayName() || 'AI Mind';

      this.isCloningVoice.set(true);
      this.cloneError.set(null);
      this.cloneSuccess.set(null);

      this.voiceService.cloneVoice(file, mindName).subscribe({
        next: (res) => {
          this.isCloningVoice.set(false);
          this.voiceProvider.set('cloned');
          this.voiceId.set(res.voiceId);
          this.voiceSampleUrl.set(res.voiceSampleUrl);
          this.cloneSuccess.set('Voice profile cloned and assigned to your Digital Twin!');
        },
        error: (err) => {
          this.isCloningVoice.set(false);
          this.cloneError.set(err.error?.message || 'Failed to clone voice sample.');
        },
      });
    }
  }

  loadMyMind(): void {
    this.isLoading.set(true);
    this.mindService.getMyMind().subscribe({
      next: (m) => {
        this.mind.set(m);
        this.displayName.set(m.display_name || '');
        this.handle.set(m.handle || '');
        this.headline.set(m.headline || '');
        this.avatarUrl.set(m.avatar_url || '');
        this.websiteUrl.set(m.website_url || '');
        this.bio.set(m.bio || '');
        this.philosophyStatement.set(m.philosophy_statement || '');
        this.decisionFrameworks.set(m.decision_frameworks || []);
        this.tags.set(m.tags || []);
        this.isPublished.set(m.is_published || false);
        this.directChatEnabled.set(m.direct_chat_enabled !== undefined ? Boolean(m.direct_chat_enabled) : true);
        this.directChatPrice.set(m.direct_chat_price !== undefined ? Number(m.direct_chat_price) : 25);
        this.directChatSla.set(m.direct_chat_sla || 'Replies personally within a few hours');
        this.paidSessions.set(m.paid_sessions || []);
        if (m.paid_sessions && m.paid_sessions.length > 0 && !this.activePaidSessionId()) {
          this.activePaidSessionId.set(m.paid_sessions[0].id);
        }
        this.voiceProvider.set((m as any).voice_provider || 'preset');
        this.voiceId.set((m as any).voice_id || 'echo');
        this.voiceSampleUrl.set((m as any).voice_sample_url || null);
        if ((m as any).voice_provider === 'cloned') {
          this.activeVoiceTab.set('cloned');
        }
        this.sources.set(m.sources || []);
        this.audienceQuestions.set(m.audience_questions || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to load your AI Mind.');
        this.isLoading.set(false);
      },
    });
  }

  selectPaidSession(sessionId: number): void {
    this.activePaidSessionId.set(sessionId);
    this.creatorReplyInput.set('');
  }

  getActivePaidSession(): PaidHumanSession | null {
    const id = this.activePaidSessionId();
    return this.paidSessions().find((s) => s.id === id) || null;
  }

  refreshPaidSessions(): void {
    this.mindService.getPaidSessions().subscribe({
      next: (sessions) => {
        this.paidSessions.set(sessions || []);
        if (sessions.length > 0 && !this.activePaidSessionId()) {
          this.activePaidSessionId.set(sessions[0].id);
        }
      },
      error: () => {},
    });
  }

  sendCreatorReply(session: PaidHumanSession): void {
    const text = this.creatorReplyInput().trim();
    if (!text || this.isSendingCreatorReply()) return;

    this.isSendingCreatorReply.set(true);
    this.mindService.replyToPaidSession(session.id, text).subscribe({
      next: (sessions) => {
        this.paidSessions.set(sessions || []);
        this.creatorReplyInput.set('');
        this.isSendingCreatorReply.set(false);
        this.successMessage.set(`Verified Human reply sent directly to ${session.visitor_name}'s chat thread!`);
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.isSendingCreatorReply.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to send personal reply.');
      },
    });
  }

  saveMindProfile(): void {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const cleanHandle = this.handle().replace(/^@/, '').trim();
    if (!cleanHandle) {
      this.errorMessage.set('A unique handle is required for your AI Mind.');
      this.isSaving.set(false);
      return;
    }

    this.mindService
      .updateMyMind({
        display_name: this.displayName().trim() || 'My AI Mind',
        handle: cleanHandle,
        headline: this.headline().trim(),
        avatar_url: this.avatarUrl().trim() || null,
        website_url: this.websiteUrl().trim() || null,
        bio: this.bio().trim() || null,
        philosophy_statement: this.philosophyStatement().trim() || null,
        decision_frameworks: this.decisionFrameworks(),
        tags: this.tags(),
        is_published: this.isPublished(),
        direct_chat_enabled: this.directChatEnabled(),
        direct_chat_price: Number(this.directChatPrice()) || 25,
        direct_chat_sla: this.directChatSla().trim() || 'Replies personally within a few hours',
        voice_provider: this.voiceProvider(),
        voice_id: this.voiceId(),
        voice_sample_url: this.voiceSampleUrl(),
      })
      .subscribe({
        next: (updated) => {
          this.mind.set(updated);
          this.sources.set(updated.sources || []);
          if (updated.audience_questions) {
            this.audienceQuestions.set(updated.audience_questions);
          }
          if (updated.paid_sessions) {
            this.paidSessions.set(updated.paid_sessions);
          }
          this.isSaving.set(false);
          this.successMessage.set(
            updated.is_published
              ? `Your AI Mind @${updated.handle} is published in the Commons!`
              : 'Your AI Mind profile was updated (Draft mode).'
          );
          setTimeout(() => this.successMessage.set(null), 5000);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Failed to update Mind profile.');
        },
      });
  }

  openShareModal(): void {
    this.isShareModalOpen.set(true);
  }

  closeShareModal(): void {
    this.isShareModalOpen.set(false);
  }

  getShareUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
    const clean = (this.handle() || '').replace(/^@/, '').trim();
    return `${origin}/minds/@${clean}`;
  }

  // Frameworks Management
  addFramework(): void {
    const text = this.newFrameworkInput().trim();
    if (!text) return;
    this.decisionFrameworks.update((f) => [...f, text]);
    this.newFrameworkInput.set('');
  }

  removeFramework(index: number): void {
    this.decisionFrameworks.update((f) => f.filter((_, idx) => idx !== index));
  }

  // Tags Management
  addTag(): void {
    const raw = this.newTagInput().trim().replace(/^#/, '');
    if (!raw) return;
    if (!this.tags().includes(raw)) {
      this.tags.update((t) => [...t, raw]);
    }
    this.newTagInput.set('');
  }

  removeTag(index: number): void {
    this.tags.update((t) => t.filter((_, idx) => idx !== index));
  }

  // Knowledge Ingestion: URL
  submitUrl(): void {
    const url = this.urlInput().trim();
    if (!url) return;

    this.isIngesting.set(true);
    this.ingestError.set(null);
    this.ingestSuccess.set(null);

    this.mindService.ingestMyMindUrl(url, this.urlTitleInput().trim() || undefined).subscribe({
      next: (source) => {
        this.sources.update((prev) => [source, ...prev]);
        this.urlInput.set('');
        this.urlTitleInput.set('');
        this.isIngesting.set(false);
        this.ingestSuccess.set(`Successfully ingested ${source.title}. Extracted ${source.chunk_count || 1} knowledge chunks.`);
        setTimeout(() => this.ingestSuccess.set(null), 5000);
      },
      error: (err) => {
        this.isIngesting.set(false);
        this.ingestError.set(err.error?.message || 'Failed to ingest URL.');
      },
    });
  }

  // Knowledge Ingestion: File
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files?.length) {
      this.handleFileSelected(event.dataTransfer.files[0]);
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFileSelected(input.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    this.onFileChange(event);
  }

  private handleFileSelected(file: File): void {
    const validExts = ['.pdf', '.txt', '.md', '.markdown'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExts.some((ext) => lowerName.endsWith(ext));

    if (!isValid) {
      this.ingestError.set('Please select a .pdf, .txt, or .md document.');
      return;
    }
    this.selectedFile.set(file);
    if (!this.docTitleInput()) {
      this.docTitleInput.set(file.name.replace(/\.[^/.]+$/, ''));
    }
  }

  submitFile(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isIngesting.set(true);
    this.ingestError.set(null);
    this.ingestSuccess.set(null);

    this.mindService.ingestMyMindFile(file, this.docTitleInput().trim() || undefined).subscribe({
      next: (source) => {
        this.sources.update((prev) => [source, ...prev]);
        this.selectedFile.set(null);
        this.docTitleInput.set('');
        this.isIngesting.set(false);
        this.ingestSuccess.set(`Successfully indexed ${source.title}. Created ${source.chunk_count || 1} knowledge nodes.`);
        setTimeout(() => this.ingestSuccess.set(null), 5000);
      },
      error: (err) => {
        this.isIngesting.set(false);
        this.ingestError.set(err.error?.message || 'Document indexing failed.');
      },
    });
  }

  // Knowledge Ingestion: Direct Text
  submitText(): void {
    const content = this.manualTextContent().trim();
    if (!content) return;

    this.isIngesting.set(true);
    this.ingestError.set(null);
    this.ingestSuccess.set(null);

    this.mindService
      .ingestMyMindText(this.manualTextTitle().trim() || 'Core Philosophy & Rules', content)
      .subscribe({
        next: (source) => {
          this.sources.update((prev) => [source, ...prev]);
          this.manualTextTitle.set('');
          this.manualTextContent.set('');
          this.isIngesting.set(false);
          this.ingestSuccess.set(`Successfully saved note. Generated ${source.chunk_count || 1} knowledge chunks.`);
          setTimeout(() => this.ingestSuccess.set(null), 5000);
        },
        error: (err) => {
          this.isIngesting.set(false);
          this.ingestError.set(err.error?.message || 'Failed to save text note.');
        },
      });
  }

  // Feature #2: 3-Question Interactive Brain Interview
  toggleDictateQuestion(questionIdx: number): void {
    if (this.dictatingQuestionIdx() === questionIdx) {
      if (this.speechRecognition) {
        this.speechRecognition.stop();
      }
      this.dictatingQuestionIdx.set(null);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.ingestError.set('Browser speech dictation is not supported on this device. You can type your response directly.');
      return;
    }

    if (this.speechRecognition) {
      this.speechRecognition.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        if (questionIdx === 1) {
          this.interviewQ1.update((v) => (v ? `${v} ${transcript}` : transcript));
        } else if (questionIdx === 2) {
          this.interviewQ2.update((v) => (v ? `${v} ${transcript}` : transcript));
        } else if (questionIdx === 3) {
          this.interviewQ3.update((v) => (v ? `${v} ${transcript}` : transcript));
        }
      }
    };

    recognition.onend = () => {
      this.dictatingQuestionIdx.set(null);
    };

    recognition.onerror = () => {
      this.dictatingQuestionIdx.set(null);
    };

    this.speechRecognition = recognition;
    this.dictatingQuestionIdx.set(questionIdx);
    recognition.start();
  }

  submitBrainInterview(): void {
    const q1 = this.interviewQ1().trim();
    const q2 = this.interviewQ2().trim();
    const q3 = this.interviewQ3().trim();

    if (!q1 && !q2 && !q3) {
      this.ingestError.set('Please answer at least one interview question to train your AI Mind.');
      return;
    }

    this.isIngesting.set(true);
    this.ingestError.set(null);
    this.ingestSuccess.set(null);

    const answers = [
      {
        question: 'What is your #1 core philosophy or contrarian belief that guides your work?',
        answer: q1,
      },
      {
        question: 'What is your step-by-step mental model for making a hard decision in your domain?',
        answer: q2,
      },
      {
        question: 'What is the most common mistake beginners make, and what is your rule to avoid it?',
        answer: q3,
      },
    ].filter((a) => a.answer.length > 0);

    this.mindService.submitInterview(answers).subscribe({
      next: (updatedMind) => {
        this.mind.set(updatedMind);
        this.sources.set(updatedMind.sources || []);
        if (updatedMind.philosophy_statement) {
          this.philosophyStatement.set(updatedMind.philosophy_statement);
        }
        if (updatedMind.decision_frameworks) {
          this.decisionFrameworks.set(updatedMind.decision_frameworks);
        }
        this.interviewQ1.set('');
        this.interviewQ2.set('');
        this.interviewQ3.set('');
        this.isIngesting.set(false);
        this.ingestSuccess.set('Brain Interview extracted! Indexed into your knowledge base & updated your philosophy.');
        setTimeout(() => this.ingestSuccess.set(null), 5000);
      },
      error: (err) => {
        this.isIngesting.set(false);
        this.ingestError.set(err.error?.message || 'Failed to submit brain interview.');
      },
    });
  }

  // Feature #3: Audience Questions & 1-Click Teach My Mind
  openTeachQuestion(questionText: string): void {
    this.activeTeachQuestion.set(questionText);
    this.teachAnswerInput.set('');
  }

  cancelTeachQuestion(): void {
    this.activeTeachQuestion.set(null);
    this.teachAnswerInput.set('');
  }

  submitTeachQuestion(questionText?: string): void {
    const q = (questionText || this.activeTeachQuestion() || this.customTeachQuestion()).trim();
    const a = this.teachAnswerInput().trim();
    if (!q || !a) return;

    this.isTeachingQA.set(true);
    this.mindService.teachQuestionAnswer(q, a).subscribe({
      next: (res) => {
        this.sources.set(res.sources || []);
        this.audienceQuestions.set(res.audience_questions || []);
        this.activeTeachQuestion.set(null);
        this.customTeachQuestion.set('');
        this.teachAnswerInput.set('');
        this.isTeachingQA.set(false);
        this.ingestSuccess.set(`Canonical Q&A trained! Your Mind will now use this exact answer when asked.`);
        setTimeout(() => this.ingestSuccess.set(null), 5000);
      },
      error: (err) => {
        this.isTeachingQA.set(false);
        this.ingestError.set(err.error?.message || 'Failed to save Q&A training.');
      },
    });
  }

  // Delete Source
  onDeleteSource(source: MindSource): void {
    if (!confirm(`Remove "${source.title}" and delete its indexed knowledge chunks?`)) return;

    this.mindService.deleteMyMindSource(source.id).subscribe({
      next: () => {
        this.sources.update((prev) => prev.filter((s) => s.id !== source.id));
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to delete source.');
      },
    });
  }

  // Preview Consultation
  openPreview(): void {
    this.isPreviewOpen.set(true);
    if (this.previewMessages().length === 0) {
      const greeting = `Hello! I am your AI Mind (@${this.handle() || 'me'}). Test my reasoning or ask a question to see how I advise based on your knowledge.`;
      this.previewMessages.set([{ sender_type: 'mind', content: greeting }]);
    }
  }

  closePreview(): void {
    this.isPreviewOpen.set(false);
  }

  onAvatarFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.isUploadingAvatar.set(true);
      this.uploadService.uploadMindAvatar(file).subscribe({
        next: (res) => {
          this.avatarUrl.set(res.url);
          this.isUploadingAvatar.set(false);
          this.successMessage.set('Profile image uploaded to Cloudinary successfully!');
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.isUploadingAvatar.set(false);
          this.errorMessage.set(err.error?.message || 'Failed to upload profile image.');
          setTimeout(() => this.errorMessage.set(null), 4000);
        },
      });
    }
  }

  sendPreviewMessage(): void {
    const text = this.previewInput().trim();
    if (!text || this.isPreviewStreaming()) return;

    this.previewInput.set('');
    this.previewMessages.update((prev) => [...prev, { sender_type: 'user', content: text }]);

    const tempIndex = this.previewMessages().length;
    this.previewMessages.update((prev) => [...prev, { sender_type: 'mind', content: '' }]);
    this.isPreviewStreaming.set(true);

    this.mindService.streamConsultation({
      handle: this.handle(),
      content: text,
      history: this.previewMessages().slice(0, -1),
      onGrounded: (grounding) => {
        if (grounding?.groundedSources) {
          this.previewMessages.update((prev) =>
            prev.map((msg, idx) => (idx === tempIndex ? { ...msg, sources: grounding.groundedSources } : msg))
          );
        }
      },
      onChunk: (chunk) => {
        this.previewMessages.update((prev) =>
          prev.map((msg, idx) => (idx === tempIndex ? { ...msg, content: msg.content + chunk } : msg))
        );
      },
      onDone: () => {
        this.isPreviewStreaming.set(false);
      },
      onError: (err) => {
        this.isPreviewStreaming.set(false);
        this.previewMessages.update((prev) =>
          prev.map((msg, idx) =>
            idx === tempIndex ? { ...msg, content: `Error during consultation: ${err.message}` } : msg
          )
        );
      },
    });
  }
}
