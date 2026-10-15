import { Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MindService } from '../../../core/services/mind.service';
import { PublicMind, MindSessionMeta } from '../../../core/models/mind.model';

import { AuthService } from '../../../core/services/auth.service';
import { CharacterService } from '../../../core/services/character.service';
import { VoiceService } from '../../../core/services/voice.service';
import { VoiceCallOverlayComponent } from '../../chat/voice-call-overlay/voice-call-overlay.component';

interface ConsultationMessage {
  id: number;
  sender_type: 'user' | 'assistant' | 'creator' | 'system';
  content: string;
  sources?: Array<{ id: number; title: string; topic?: string; excerpt?: string; source_type?: string }>;
  message_type?: 'text' | 'voice';
  audio_url?: string | null;
  duration_seconds?: number | null;
  created_at: string;
}

export interface SavedTakeaway {
  id: number;
  content: string;
  saved_at: string;
}

import { ShareMindModalComponent } from '../share-mind-modal/share-mind-modal.component';

@Component({
  selector: 'app-mind-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, VoiceCallOverlayComponent, ShareMindModalComponent],
  templateUrl: './mind-profile.component.html',
  styleUrl: './mind-profile.component.scss',
})
export class MindProfileComponent implements OnInit, OnDestroy, AfterViewChecked {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private mindService = inject(MindService);
  authService = inject(AuthService);
  private characterService = inject(CharacterService);
  voiceService = inject(VoiceService);

  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('consultInput') private consultInput!: ElementRef<HTMLTextAreaElement>;

  handle = signal<string>('');
  mind = signal<PublicMind | null>(null);
  isLoadingMind = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  isShareModalOpen = signal<boolean>(false);

  // Paid AI-to-Human Direct Handoff State
  sessionMeta = signal<MindSessionMeta | null>(null);
  isEscalateModalOpen = signal<boolean>(false);
  escalationNoteInput = signal<string>('');
  isEscalating = signal<boolean>(false);
  escalateError = signal<string | null>(null);
  showHandoffBrief = signal<boolean>(true);
  private humanReplyPollInterval: any = null;

  activeTab = signal<'consultation' | 'knowledge'>('consultation');
  isKnowledgeDrawerOpen = signal<boolean>(false);
  lastGroundedInfo = signal<{ count: number; sources: any[] } | null>(null);
  messages = signal<ConsultationMessage[]>([]);
  userInput = '';
  isStreaming = signal<boolean>(false);
  isVoiceCallActive = signal<boolean>(false);

  // Feature #1: Smart Contextual Follow-Up Chips
  smartFollowUps = signal<string[]>([]);

  // Feature #4: Saved Takeaways / Personal Playbook
  savedTakeaways = signal<SavedTakeaway[]>([]);
  copiedTakeawayId = signal<number | null>(null);

  // Feature #7: Interactive Citation Preview
  selectedCitation = signal<{ title: string; excerpt?: string; topic?: string } | null>(null);

  // WhatsApp Voice Note Signals
  isRecordingVoiceNote = signal<boolean>(false);
  isVoiceNoteSending = signal<boolean>(false);
  recordingDurationSeconds = signal<number>(0);
  recordingTimeFormatted = signal<string>('0:00');
  expandedTranscripts = signal<Set<number>>(new Set());
  private recordingTimerInterval: any = null;

  private abortController: AbortController | null = null;
  private shouldScroll = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const handleParam = params.get('handle');
      if (handleParam) {
        this.handle.set(handleParam.replace(/^@/, ''));
        this.loadSavedTakeaways();
        this.loadProfile();
      }
    });

    // Background poll for verified human replies when in direct human mode
    this.humanReplyPollInterval = setInterval(() => {
      if (this.sessionMeta()?.is_paid_unlocked && !this.isStreaming()) {
        this.refreshMessagesQuietly();
      }
    }, 7000);
  }

  ngOnDestroy(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.humanReplyPollInterval) {
      clearInterval(this.humanReplyPollInterval);
      this.humanReplyPollInterval = null;
    }
    if (this.recordingTimerInterval) {
      clearInterval(this.recordingTimerInterval);
      this.recordingTimerInterval = null;
    }
    if (this.isRecordingVoiceNote()) {
      this.voiceService.cancelRecording();
      this.isRecordingVoiceNote.set(false);
    }
    this.voiceService.stopAudio();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
    }
  }

  private mapBackendMessage(m: any): ConsultationMessage {
    let sender: 'user' | 'assistant' | 'creator' | 'system' = 'assistant';
    if (m.sender_type === 'user') sender = 'user';
    else if (m.sender_type === 'creator') sender = 'creator';
    else if (m.sender_type === 'system') sender = 'system';
    else sender = 'assistant';

    return {
      id: m.id,
      sender_type: sender,
      content: m.content,
      created_at: m.created_at,
      message_type: m.message_type || 'text',
      audio_url: m.audio_url || null,
      duration_seconds: m.duration_seconds || null,
    };
  }

  loadProfile(): void {
    this.isLoadingMind.set(true);
    this.errorMessage.set(null);

    this.mindService.getMindByHandle(this.handle()).subscribe({
      next: (data) => {
        this.mind.set(data);
        if (data.session) {
          this.sessionMeta.set(data.session);
        }
        this.isLoadingMind.set(false);

        const displayName = data.display_name || data.name || data.handle;
        const greeting = data.greeting ||
          `Hello! I am the AI Mind of ${displayName}. My responses are synthesized through my core philosophies, writings, and mental models. What questions, decisions, or ideas would you like to explore today?`;

        if (data.messages && data.messages.length > 0) {
          this.messages.set(data.messages.map((m: any) => this.mapBackendMessage(m)));
          const lastMsg = data.messages[data.messages.length - 1];
          if (lastMsg && lastMsg.content) {
            this.updateSmartFollowUps(lastMsg.content);
          }
          this.shouldScroll = true;
        } else {
          this.messages.set([
            {
              id: 1,
              sender_type: 'assistant',
              content: greeting,
              created_at: new Date().toISOString(),
            },
          ]);
          this.smartFollowUps.set([]);
        }

        if (this.authService.isAuthenticated()) {
          this.characterService.getCharacters().subscribe();
        }
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || `AI Mind @${this.handle()} could not be found.`);
        this.isLoadingMind.set(false);
      },
    });
  }

  refreshMessagesQuietly(): void {
    if (!this.handle()) return;
    this.mindService.getMindByHandle(this.handle()).subscribe({
      next: (data) => {
        if (data.session) {
          this.sessionMeta.set(data.session);
        }
        if (data.messages && data.messages.length > this.messages().length) {
          this.messages.set(data.messages.map((m: any) => this.mapBackendMessage(m)));
          this.shouldScroll = true;
        }
      },
      error: () => {},
    });
  }

  openEscalateModal(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    this.escalateError.set(null);
    this.isEscalateModalOpen.set(true);
  }

  closeEscalateModal(): void {
    this.isEscalateModalOpen.set(false);
    this.escalateError.set(null);
  }

  confirmHumanEscalation(): void {
    if (this.isEscalating()) return;
    this.isEscalating.set(true);
    this.escalateError.set(null);

    this.mindService.escalateToHuman(this.handle(), this.escalationNoteInput().trim()).subscribe({
      next: (res) => {
        this.isEscalating.set(false);
        this.isEscalateModalOpen.set(false);
        this.escalationNoteInput.set('');
        if (res.session) {
          this.sessionMeta.set(res.session);
        }
        if (res.messages && res.messages.length > 0) {
          this.messages.set(res.messages.map((m: any) => this.mapBackendMessage(m)));
        }
        this.shouldScroll = true;
      },
      error: (err) => {
        this.isEscalating.set(false);
        this.escalateError.set(err.error?.error?.message || 'Could not unlock Direct Human Chat.');
      },
    });
  }

  switchThreadMode(mode: 'ai' | 'human_direct'): void {
    const current = this.sessionMeta();
    if (!current || !current.is_paid_unlocked) {
      if (mode === 'human_direct') {
        this.openEscalateModal();
      }
      return;
    }
    if (current.chat_mode === mode) return;

    this.mindService.switchChatMode(this.handle(), mode).subscribe({
      next: (res) => {
        if (res.session) {
          this.sessionMeta.set(res.session);
        }
      },
    });
  }

  goBack(): void {
    if (this.router.url.startsWith('/dashboard')) {
      this.router.navigate(['/dashboard/explore']);
    } else {
      this.router.navigate(['/minds/explore']);
    }
  }

  openShareModal(): void {
    this.isShareModalOpen.set(true);
  }

  closeShareModal(): void {
    this.isShareModalOpen.set(false);
  }

  toggleKnowledgeDrawer(): void {
    this.isKnowledgeDrawerOpen.update((v) => !v);
  }

  openCitationPreview(src: { title: string; excerpt?: string; topic?: string }): void {
    this.selectedCitation.set(src);
    this.isKnowledgeDrawerOpen.set(true);
  }

  closeCitationPreview(): void {
    this.selectedCitation.set(null);
  }

  // Feature #4: Saved Takeaways (Personal Playbook)
  private getTakeawaysKey(): string {
    return `lumina_saved_takeaways_mind_${this.handle()}`;
  }

  loadSavedTakeaways(): void {
    try {
      const raw = localStorage.getItem(this.getTakeawaysKey());
      if (raw) {
        this.savedTakeaways.set(JSON.parse(raw));
      } else {
        this.savedTakeaways.set([]);
      }
    } catch (_) {
      this.savedTakeaways.set([]);
    }
  }

  isTakeawaySaved(messageId: number): boolean {
    return this.savedTakeaways().some((t) => t.id === messageId);
  }

  toggleSaveTakeaway(msg: ConsultationMessage): void {
    if (!msg.content) return;
    const current = this.savedTakeaways();
    const exists = current.some((t) => t.id === msg.id);
    let next: SavedTakeaway[];
    if (exists) {
      next = current.filter((t) => t.id !== msg.id);
    } else {
      next = [
        {
          id: msg.id,
          content: msg.content,
          saved_at: new Date().toISOString(),
        },
        ...current,
      ];
    }
    this.savedTakeaways.set(next);
    try {
      localStorage.setItem(this.getTakeawaysKey(), JSON.stringify(next));
    } catch (_) {}
  }

  removeSavedTakeaway(id: number): void {
    const next = this.savedTakeaways().filter((t) => t.id !== id);
    this.savedTakeaways.set(next);
    try {
      localStorage.setItem(this.getTakeawaysKey(), JSON.stringify(next));
    } catch (_) {}
  }

  copyTakeaway(takeaway: SavedTakeaway): void {
    navigator.clipboard?.writeText(takeaway.content);
    this.copiedTakeawayId.set(takeaway.id);
    setTimeout(() => {
      if (this.copiedTakeawayId() === takeaway.id) {
        this.copiedTakeawayId.set(null);
      }
    }, 1800);
  }

  // Feature #1: Generate Contextual Follow-up Prompts
  updateSmartFollowUps(lastReply: string): void {
    const lower = (lastReply || '').toLowerCase();
    const prompts: string[] = [];

    if (lower.includes('framework') || lower.includes('principle') || lower.includes('model')) {
      prompts.push('Give me a real-world example of applying this');
      prompts.push('What is the biggest mistake people make with this?');
      prompts.push('Turn this into a 3-step action checklist for me');
    } else if (lower.includes('risk') || lower.includes('decision') || lower.includes('choice')) {
      prompts.push('Play devil’s advocate against my current plan');
      prompts.push('What blind spot am I overlooking here?');
      prompts.push('How would you test this decision with minimal risk?');
    } else {
      prompts.push('Give me a concrete example of this in practice');
      prompts.push('Challenge my thinking—what am I missing?');
      prompts.push('Summarize this into 3 actionable next steps');
    }

    this.smartFollowUps.set(prompts.slice(0, 3));
  }

  onSelectQuickPrompt(text: string): void {
    this.userInput = text;
    this.sendConsultation();
  }

  setTab(tab: 'consultation' | 'knowledge'): void {
    this.activeTab.set(tab);
    if (tab === 'consultation') {
      this.shouldScroll = true;
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendConsultation();
    }
  }

  onInputResize(): void {
    if (this.consultInput?.nativeElement) {
      const el = this.consultInput.nativeElement;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }

  async sendConsultation(): Promise<void> {
    const text = this.userInput.trim();
    if (!text || this.isStreaming()) return;

    this.userInput = '';
    this.isStreaming.set(true);
    this.shouldScroll = true;

    if (this.consultInput?.nativeElement) {
      this.consultInput.nativeElement.style.height = 'auto';
    }

    const userMsg: ConsultationMessage = {
      id: Date.now(),
      sender_type: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    const tempAssistantId = Date.now() + 1;
    const assistantMsg: ConsultationMessage = {
      id: tempAssistantId,
      sender_type: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    const historyPayload = this.messages().map((m) => ({
      sender_type: m.sender_type,
      content: m.content,
    }));

    this.messages.update((prev) => [...prev, userMsg, assistantMsg]);

    this.abortController = new AbortController();

    await this.mindService.streamConsultation({
      handle: this.handle(),
      content: text,
      history: historyPayload,
      signal: this.abortController.signal,
      onChunk: (chunk: string) => {
        this.messages.update((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId ? { ...m, content: m.content + chunk } : m
          )
        );
        this.shouldScroll = true;
      },
      onGrounded: (groundedData: any) => {
        if (groundedData.groundedSources?.length > 0) {
          this.lastGroundedInfo.set({
            count: groundedData.groundedSources.length,
            sources: groundedData.groundedSources,
          });
          this.messages.update((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId
                ? { ...m, sources: groundedData.groundedSources }
                : m
            )
          );
        }
      },
      onDone: (result: any) => {
        this.isStreaming.set(false);
        this.abortController = null;
        if (result.humanDirectQueued) {
          this.messages.update((prev) => [
            ...prev.filter((m) => m.id !== tempAssistantId),
            {
              id: Date.now() + 2,
              sender_type: 'system',
              content: `📬 Forwarded to ${this.mind()?.display_name || 'the creator'}'s personal VIP Inbox. They will reply here personally. (Switch to '🧠 AI Mind' above if you want instant AI responses.)`,
              created_at: new Date().toISOString(),
            },
          ]);
          this.shouldScroll = true;
          return;
        }
        const sources = result.groundedSources || result.grounding?.sources;
        if (sources && sources.length > 0) {
          this.lastGroundedInfo.set({
            count: sources.length,
            sources,
          });
          this.messages.update((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId
                ? { ...m, sources }
                : m
            )
          );
        }
        const latestAssistant = this.messages().find((m) => m.id === tempAssistantId);
        this.updateSmartFollowUps(result.fullResponse || latestAssistant?.content || '');
        if (this.authService.isAuthenticated()) {
          this.characterService.getCharacters().subscribe();
        }
        this.shouldScroll = true;
      },
      onError: (err: any) => {
        this.isStreaming.set(false);
        this.abortController = null;
        const errMsg = err.message || 'Consultation streaming interrupted.';
        this.messages.update((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? {
                  ...m,
                  content: m.content ? m.content : `*(Error: ${errMsg})*`,
                }
              : m
          )
        );
        this.shouldScroll = true;
      },
    });
  }

  startVoiceCall(): void {
    this.isVoiceCallActive.set(true);
  }

  endVoiceCall(): void {
    this.isVoiceCallActive.set(false);
    this.shouldScroll = true;
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onVoiceTurnMessageAdded(event: { userMessage?: any; assistantMessage?: any }): void {
    if (event.userMessage || event.assistantMessage) {
      this.messages.update((prev) => {
        const next = [...prev];
        if (event.userMessage) {
          next.push({
            id: event.userMessage.id || Date.now(),
            sender_type: 'user',
            content: event.userMessage.content,
            created_at: event.userMessage.created_at || new Date().toISOString(),
          });
        }
        if (event.assistantMessage) {
          next.push({
            id: event.assistantMessage.id || Date.now() + 1,
            sender_type: 'assistant',
            content: event.assistantMessage.content,
            created_at: event.assistantMessage.created_at || new Date().toISOString(),
          });
        }
        return next;
      });
      this.shouldScroll = true;
    }
  }

  // ========================================================
  // WHATSAPP VOICE NOTE RECORDING & PLAYBACK CONTROLLERS
  // ========================================================

  async startVoiceNoteRecording(): Promise<void> {
    if (this.isStreaming()) return;

    try {
      this.errorMessage.set(null);
      await this.voiceService.startRecording();
      this.isRecordingVoiceNote.set(true);
      this.recordingDurationSeconds.set(0);
      this.recordingTimeFormatted.set('0:00');

      this.recordingTimerInterval = setInterval(() => {
        const sec = this.recordingDurationSeconds() + 1;
        this.recordingDurationSeconds.set(sec);
        const mins = Math.floor(sec / 60);
        const remSec = sec % 60;
        this.recordingTimeFormatted.set(`${mins}:${remSec < 10 ? '0' : ''}${remSec}`);
      }, 1000);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Microphone access is required to record voice notes.');
    }
  }

  cancelVoiceNoteRecording(): void {
    if (this.recordingTimerInterval) {
      clearInterval(this.recordingTimerInterval);
      this.recordingTimerInterval = null;
    }
    this.voiceService.cancelRecording();
    this.isRecordingVoiceNote.set(false);
    this.recordingDurationSeconds.set(0);
    this.recordingTimeFormatted.set('0:00');
  }

  async sendVoiceNote(): Promise<void> {
    if (!this.isRecordingVoiceNote()) return;

    if (this.recordingTimerInterval) {
      clearInterval(this.recordingTimerInterval);
      this.recordingTimerInterval = null;
    }

    const durationSec = Math.max(1, this.recordingDurationSeconds());
    this.isRecordingVoiceNote.set(false);
    this.isVoiceNoteSending.set(true);

    try {
      const audioBlob = await this.voiceService.stopRecording();
      if (!audioBlob || audioBlob.size === 0) {
        this.isVoiceNoteSending.set(false);
        return;
      }

      // Optimistic user voice note
      const tempUserMessageId = Date.now();
      const optimisticAudioUrl = URL.createObjectURL(audioBlob);
      const tempUserMsg: ConsultationMessage = {
        id: tempUserMessageId,
        sender_type: 'user',
        content: '🎤 Voice message',
        message_type: 'voice',
        audio_url: optimisticAudioUrl,
        duration_seconds: durationSec,
        created_at: new Date().toISOString(),
      };

      this.messages.update((prev) => [...prev, tempUserMsg]);
      this.shouldScroll = true;

      this.voiceService.sendVoiceTurn({
        audioBlob,
        mindHandle: this.handle(),
        mindId: this.mind()?.id,
      }).subscribe({
        next: (res) => {
          this.isVoiceNoteSending.set(false);

          if (res.userMessage) {
            this.messages.update((prev) =>
              prev.map((m) => m.id === tempUserMessageId ? {
                ...m,
                id: res.userMessage.id || m.id,
                audio_url: res.userMessage.audio_url || m.audio_url,
                duration_seconds: res.userMessage.duration_seconds || m.duration_seconds,
                content: res.userMessage.content || m.content,
              } : m)
            );
          }

          if (res.assistantMessage) {
            const assistantMsg: ConsultationMessage = {
              id: res.assistantMessage.id || Date.now() + 1,
              sender_type: 'assistant',
              content: res.assistantMessage.content || res.replyText,
              message_type: 'voice',
              audio_url: res.assistantMessage.audio_url || res.audioUrl,
              duration_seconds: res.assistantMessage.duration_seconds || res.durationSeconds,
              created_at: res.assistantMessage.created_at || new Date().toISOString(),
            };

            this.messages.update((prev) => [...prev, assistantMsg]);

            // Auto-play assistant's response voice note
            const assistantAudio = assistantMsg.audio_url || res.audioUrl || res.audioBase64;
            if (assistantAudio) {
              setTimeout(() => {
                this.voiceService.togglePlayPauseMessage(assistantMsg.id, assistantAudio);
              }, 200);
            }
          }
          if (this.authService.isAuthenticated()) {
            this.characterService.getCharacters().subscribe();
          }
          this.shouldScroll = true;
        },
        error: (err) => {
          this.isVoiceNoteSending.set(false);
          this.errorMessage.set(err.error?.error?.message || err.message || 'Failed to process voice note.');
        }
      });
    } catch (err: any) {
      this.isVoiceNoteSending.set(false);
      this.errorMessage.set(err.message || 'Failed to capture voice note.');
    }
  }

  togglePlayVoiceNote(msg: ConsultationMessage): void {
    const audioSource = msg.audio_url || msg.content;
    if (!audioSource) return;
    this.voiceService.togglePlayPauseMessage(msg.id, audioSource);
  }

  onSeekVoiceNote(event: MouseEvent, msg: ConsultationMessage): void {
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));

    if (this.voiceService.currentPlayingMessageId() === msg.id) {
      this.voiceService.seekMessageAudio(percent);
    } else {
      const audioSource = msg.audio_url || msg.content;
      if (audioSource) {
        this.voiceService.togglePlayPauseMessage(msg.id, audioSource).then(() => {
          this.voiceService.seekMessageAudio(percent);
        });
      }
    }
  }

  toggleTranscript(messageId: number): void {
    this.expandedTranscripts.update((set) => {
      const next = new Set(set);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }

  formatSeconds(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const s = Math.round(seconds);
    const mins = Math.floor(s / 60);
    const remSec = s % 60;
    return `${mins}:${remSec < 10 ? '0' : ''}${remSec}`;
  }

  getWaveformBars(messageId: number): Array<{ height: number }> {
    const bars: Array<{ height: number }> = [];
    const count = 28;
    let seed = Math.abs(messageId || 42);
    for (let i = 0; i < count; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const rnd = seed / 233280;
      const height = Math.floor(6 + rnd * 22);
      bars.push({ height });
    }
    return bars;
  }

  toggleHandoffBrief(): void {
    this.showHandoffBrief.update((v) => !v);
  }

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
        this.shouldScroll = false;
      }
    } catch (_) {}
  }
}
