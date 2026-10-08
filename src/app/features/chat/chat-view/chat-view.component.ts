import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChatService } from '../../../core/services/chat.service';
import { StreamService } from '../../../core/services/stream.service';
import { MemoryService } from '../../../core/services/memory.service';
import { VoiceService } from '../../../core/services/voice.service';
import { MemoryDrawerComponent } from '../memory-drawer/memory-drawer.component';
import { VoiceCallOverlayComponent } from '../voice-call-overlay/voice-call-overlay.component';
import { Message } from '../../../core/models/character.model';

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MemoryDrawerComponent, VoiceCallOverlayComponent],
  templateUrl: './chat-view.component.html',
  styleUrl: './chat-view.component.scss',
})
export class ChatViewComponent implements OnInit, OnDestroy, AfterViewChecked {
  chatService = inject(ChatService);
  streamService = inject(StreamService);
  memoryService = inject(MemoryService);
  voiceService = inject(VoiceService);
  private route = inject(ActivatedRoute);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef<HTMLTextAreaElement>;

  characterId!: number;
  userInput = '';
  errorMessage: string | null = null;
  isStreaming = signal<boolean>(false);
  isMemoryDrawerOpen = signal<boolean>(false);
  isVoiceCallActive = signal<boolean>(false);
  lastGroundedInfo = signal<{ count: number; sources: any[] } | null>(null);

  // WhatsApp Voice Note Recording & Playback Signals
  isRecordingVoiceNote = signal<boolean>(false);
  isVoiceNoteSending = signal<boolean>(false);
  recordingDurationSeconds = signal<number>(0);
  recordingTimeFormatted = signal<string>('0:00');
  expandedTranscripts = signal<Set<number>>(new Set());
  private recordingTimerInterval: any = null;

  private shouldScrollToBottom = true;
  private isUserScrolledUp = false;
  private abortController: AbortController | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('characterId');
      if (idParam) {
        this.characterId = parseInt(idParam, 10);
        this.initChat(this.characterId);
        this.memoryService.getMemories(this.characterId).subscribe();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.abortController) {
      this.abortController.abort();
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
    this.chatService.clearChat();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom && !this.isUserScrolledUp) {
      this.scrollToBottom();
    }
  }

  initChat(characterId: number): void {
    this.errorMessage = null;
    this.shouldScrollToBottom = true;
    this.isUserScrolledUp = false;
    this.chatService.startConversation(characterId).subscribe({
      next: () => {
        this.shouldScrollToBottom = true;
      },
      error: (err) => {
        this.errorMessage = err.error?.error?.message || 'Failed to start conversation.';
      },
    });
  }

  onScroll(event: Event): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) {
      // If user is more than 100px from the bottom, they have deliberately scrolled up
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      this.isUserScrolledUp = distanceFromBottom > 100;
    }
  }

  async sendMessage(): Promise<void> {
    const content = this.userInput.trim();
    if (!content || this.isStreaming() || this.chatService.isLoadingMessages()) {
      return;
    }

    const conversation = this.chatService.activeConversation();
    if (!conversation) {
      return;
    }

    this.userInput = '';
    this.errorMessage = null;
    this.isStreaming.set(true);
    this.shouldScrollToBottom = true;
    this.isUserScrolledUp = false;

    // Reset textarea height
    if (this.messageInput?.nativeElement) {
      this.messageInput.nativeElement.style.height = 'auto';
    }

    // 1. Optimistically append user message to messages list
    const tempUserMessage: Message = {
      id: Date.now(),
      conversation_id: conversation.id,
      sender_type: 'user',
      content,
      token_count: Math.ceil(content.length / 4),
      created_at: new Date().toISOString(),
    };

    // 2. Prepare streaming placeholder assistant message
    const tempAssistantId = Date.now() + 1;
    const streamingAssistantMessage: Message = {
      id: tempAssistantId,
      conversation_id: conversation.id,
      sender_type: 'assistant',
      content: '',
      token_count: 0,
      created_at: new Date().toISOString(),
    };

    this.chatService.messages.update((prev) => [
      ...prev,
      tempUserMessage,
      streamingAssistantMessage,
    ]);

    this.abortController = new AbortController();

    // 3. Connect to SSE stream
    await this.streamService.streamChat({
      conversationId: conversation.id,
      characterId: this.characterId,
      content,
      signal: this.abortController.signal,
      onChunk: (chunk: string) => {
        this.chatService.messages.update((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId ? { ...m, content: m.content + chunk } : m
          )
        );
        this.shouldScrollToBottom = true;
      },
      onDone: (result: any) => {
        this.isStreaming.set(false);
        this.abortController = null;
        if (result.groundedChunksCount !== undefined) {
          this.lastGroundedInfo.set({
            count: result.groundedChunksCount,
            sources: result.groundedSources || [],
          });
        }
        if (result.assistantMessage) {
          this.chatService.messages.update((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId ? result.assistantMessage : m
            )
          );
        }
        // Refresh memories in background
        this.memoryService.getMemories(this.characterId).subscribe();
        this.shouldScrollToBottom = true;
      },
      onError: (err: any) => {
        this.isStreaming.set(false);
        this.abortController = null;
        this.errorMessage = err.message || 'Stream connection failed.';
        // If nothing was streamed, remove the empty assistant placeholder
        this.chatService.messages.update((prev) =>
          prev.filter((m) => m.id !== tempAssistantId || m.content.length > 0)
        );
      },
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onInputResize(): void {
    if (this.messageInput?.nativeElement) {
      const el = this.messageInput.nativeElement;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }

  onSelectQuickPrompt(promptText: string): void {
    if (this.isStreaming() || this.chatService.isLoadingMessages()) return;
    this.userInput = promptText;
    this.sendMessage();
  }

  toggleMemoryDrawer(): void {
    this.isMemoryDrawerOpen.update((v) => !v);
  }

  startVoiceCall(): void {
    this.isVoiceCallActive.set(true);
  }

  endVoiceCall(): void {
    this.isVoiceCallActive.set(false);
    this.shouldScrollToBottom = true;
    setTimeout(() => this.scrollToBottom(), 100);
  }

  onVoiceTurnMessageAdded(event: { userMessage?: any; assistantMessage?: any }): void {
    if (event.userMessage || event.assistantMessage) {
      this.chatService.messages.update((prev) => {
        const next = [...prev];
        if (event.userMessage && !next.some((m) => m.id === event.userMessage.id)) {
          next.push(event.userMessage);
        }
        if (event.assistantMessage && !next.some((m) => m.id === event.assistantMessage.id)) {
          next.push(event.assistantMessage);
        }
        return next;
      });
      this.shouldScrollToBottom = true;
    }
  }

  // ========================================================
  // WHATSAPP VOICE NOTE RECORDING & PLAYBACK CONTROLLERS
  // ========================================================

  async startVoiceNoteRecording(): Promise<void> {
    if (this.isStreaming() || this.chatService.isLoadingMessages()) return;

    try {
      this.errorMessage = null;
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
      this.errorMessage = err.message || 'Microphone access is required to record voice notes.';
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

    const conversation = this.chatService.activeConversation();
    if (!conversation) {
      this.voiceService.cancelRecording();
      return;
    }

    this.isVoiceNoteSending.set(true);

    try {
      const audioBlob = await this.voiceService.stopRecording();
      if (!audioBlob || audioBlob.size === 0) {
        this.isVoiceNoteSending.set(false);
        return;
      }

      // Temporary optimistic user voice note
      const tempUserMessageId = Date.now();
      const optimisticAudioUrl = URL.createObjectURL(audioBlob);
      const tempUserMsg: Message = {
        id: tempUserMessageId,
        conversation_id: conversation.id,
        sender_type: 'user',
        content: '🎤 Voice message',
        message_type: 'voice',
        audio_url: optimisticAudioUrl,
        duration_seconds: durationSec,
        token_count: 0,
        created_at: new Date().toISOString(),
      };

      this.chatService.messages.update((prev) => [...prev, tempUserMsg]);
      this.shouldScrollToBottom = true;

      this.voiceService.sendVoiceTurn({
        audioBlob,
        characterId: this.characterId,
        conversationId: conversation.id,
      }).subscribe({
        next: (res) => {
          this.isVoiceNoteSending.set(false);

          // Update user message with persisted response data
          if (res.userMessage) {
            this.chatService.messages.update((prev) =>
              prev.map((m) => m.id === tempUserMessageId ? res.userMessage : m)
            );
          }

          // Append assistant voice response
          if (res.assistantMessage) {
            this.chatService.messages.update((prev) => [...prev, res.assistantMessage]);

            // Auto-play assistant's response voice note
            const assistantAudio = res.assistantMessage.audio_url || res.audioUrl || res.audioBase64;
            if (assistantAudio) {
              setTimeout(() => {
                this.voiceService.togglePlayPauseMessage(res.assistantMessage.id, assistantAudio);
              }, 200);
            }
          }
          this.shouldScrollToBottom = true;
          // Refresh memories in background
          this.memoryService.getMemories(this.characterId).subscribe();
        },
        error: (err) => {
          this.isVoiceNoteSending.set(false);
          this.errorMessage = err.error?.error?.message || err.message || 'Failed to process voice note.';
        }
      });
    } catch (err: any) {
      this.isVoiceNoteSending.set(false);
      this.errorMessage = err.message || 'Failed to capture voice note.';
    }
  }

  togglePlayVoiceNote(msg: Message): void {
    const audioSource = msg.audio_url || msg.content;
    if (!audioSource) return;
    this.voiceService.togglePlayPauseMessage(msg.id, audioSource);
  }

  onSeekVoiceNote(event: MouseEvent, msg: Message): void {
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

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
        this.shouldScrollToBottom = false;
      }
    } catch {}
  }
}
