import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChatService } from '../../../core/services/chat.service';
import { CharacterService } from '../../../core/services/character.service';
import { StreamService } from '../../../core/services/stream.service';
import { MemoryService } from '../../../core/services/memory.service';
import { VoiceService } from '../../../core/services/voice.service';
import { UploadService } from '../../../core/services/upload.service';
import { MemoryDrawerComponent } from '../memory-drawer/memory-drawer.component';
import { VoiceCallOverlayComponent } from '../voice-call-overlay/voice-call-overlay.component';
import { BankrollSettingsComponent } from '../components/bankroll-settings/bankroll-settings.component';
import { SportsService } from '../../../core/services/sports.service';
import { PushNotificationService } from '../../../core/services/push-notification.service';
import { Message } from '../../../core/models/character.model';

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MemoryDrawerComponent,
    VoiceCallOverlayComponent,
    BankrollSettingsComponent,
  ],
  templateUrl: './chat-view.component.html',
  styleUrl: './chat-view.component.scss',
})
export class ChatViewComponent implements OnInit, OnDestroy, AfterViewChecked {
  chatService = inject(ChatService);
  characterService = inject(CharacterService);
  streamService = inject(StreamService);
  memoryService = inject(MemoryService);
  voiceService = inject(VoiceService);
  sportsService = inject(SportsService);
  pushService = inject(PushNotificationService);
  uploadService = inject(UploadService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef<HTMLTextAreaElement>;

  characterId!: number;
  userInput = '';
  errorMessage: string | null = null;
  isStreaming = signal<boolean>(false);
  isMemoryDrawerOpen = signal<boolean>(false);
  isVoiceCallActive = signal<boolean>(false);
  isBankrollDrawerOpen = signal<boolean>(false);
  isStudyLabDrawerOpen = signal<boolean>(false);
  studySubjectInput = signal<string>('');
  studyProblemInput = signal<string>('');
  studyMode = signal<'calculation' | 'explain' | 'diagnose' | 'quiz'>('calculation');
  bankrollTotal = signal<number>(1000);
  bankrollCurrency = signal<string>('$');
  isCircuitBreakerActive = signal<boolean>(false);
  crisisSupportActive = signal<boolean>(false);
  crisisHotlineInfo = signal<any>(null);
  lastGroundedInfo = signal<{ count: number; sources: any[] } | null>(null);
  smartFollowUps = signal<string[]>([]);
  savedMessageIds = signal<Set<number>>(new Set());
  isPushPromptDismissed = signal<boolean>(false);

  // Message Edit & Delete State
  editingMessageId = signal<number | null>(null);
  editingMessageContent = '';
  activeMessageMenuId = signal<number | null>(null);
  isSavingEdit = signal<boolean>(false);

  // Companion Header Menu & Per-Character Settings / Delete
  isHeaderMenuOpen = signal<boolean>(false);
  isAutoTextModalOpen = signal<boolean>(false);
  isDeleteConfirmModalOpen = signal<boolean>(false);
  isSavingAutoText = signal<boolean>(false);
  autoTextSaveSuccess = signal<boolean>(false);
  autoTextSaveError = signal<string | null>(null);
  isDeletingCharacter = signal<boolean>(false);
  deleteError = signal<string | null>(null);

  // Per-Character Auto-Text Config Fields
  autoTextEnabled = signal<boolean>(true);
  autoTextTimingType = signal<'exact_time' | 'window' | 'interval'>('exact_time');
  autoTextExactTime = signal<string>('09:00');
  autoTextPreferredTime = signal<string>('anytime');
  autoTextFrequency = signal<string>('24h');
  autoTextDaysMode = signal<'everyday' | 'weekdays' | 'weekends' | 'custom'>('everyday');
  autoTextCustomDays = signal<string[]>(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  autoTextUserTimezone = signal<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  notifyPush = signal<boolean>(true);
  notifyEmail = signal<boolean>(true);

  weekDaysList = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ];

  timePresets = [
    { label: '☀️ 8:30 AM', time: '08:30', name: 'Morning' },
    { label: '🥪 12:30 PM', time: '12:30', name: 'Midday' },
    { label: '☕ 4:00 PM', time: '16:00', name: 'Afternoon' },
    { label: '🌇 7:00 PM', time: '19:00', name: 'Evening' },
    { label: '🌙 9:30 PM', time: '21:30', name: 'Night' },
  ];

  // Feature #4: Dynamic Conversation Posture / Mood Switcher
  activeConversationMode = signal<string>('default');
  isModeMenuOpen = signal<boolean>(false);
  conversationModes = [
    { id: 'default', icon: '✨', label: 'Natural', desc: 'Their standard personality' },
    { id: 'listen', icon: '🫂', label: 'Just Listen', desc: 'Listen with empathy, no advice' },
    { id: 'tough_love', icon: '🔥', label: 'Tough Love', desc: 'Honest, direct feedback' },
    { id: 'brainstorm', icon: '💡', label: 'Brainstorm', desc: 'Ideas, problem solving & planning' },
    { id: 'calm', icon: '🧘', label: 'Ground Me', desc: 'Relaxing, supportive & calming' },
  ];

  // Feature #6: Working Attachment & Quick Emoji Picker
  showEmojiPicker = signal<boolean>(false);
  quickEmojis = ['❤️', '😂', '🙌', '🔥', '🤔', '😢', '🎉', '🙏', '✨', '💪', '🫂', '🎯', '😊', '💡', '🚀', '☕'];
  pendingAttachment = signal<{ name: string; type: 'image' | 'file'; url?: string; textExcerpt?: string } | null>(null);
  isUploadingAttachment = signal<boolean>(false);

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
        this.loadSavedTakeaways();
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
    this.loadBankrollSettings();
    this.chatService.startConversation(characterId).subscribe({
      next: (res) => {
        this.shouldScrollToBottom = true;
        const msgs = this.chatService.messages();
        if (msgs.length > 0) {
          this.updateSmartFollowUps(msgs[msgs.length - 1].content);
        } else {
          this.smartFollowUps.set([]);
        }

        const char = res.data?.character || this.chatService.activeCharacter();
        if (char) {
          this.autoTextEnabled.set(char.allow_proactive_checkins !== false);
          this.autoTextFrequency.set(char.proactive_frequency || '24h');
          this.autoTextPreferredTime.set(char.proactive_preferred_time || 'anytime');
          const channels = char.proactive_channels || {};
          this.notifyPush.set(channels.push !== false);
          this.notifyEmail.set(channels.email !== false);
        }

        // Refresh sidebar characters so the companion/mind appears in chat list and is marked active
        this.characterService.getCharacters().subscribe();
      },
      error: (err) => {
        this.errorMessage = err.error?.error?.message || 'Failed to start conversation.';
      },
    });
  }

  loadBankrollSettings(): void {
    this.sportsService.getBankroll().subscribe({
      next: (data) => {
        if (data?.bankroll) {
          this.bankrollTotal.set(Number(data.bankroll.total_bankroll) || 1000);
          this.bankrollCurrency.set(data.bankroll.currency || 'USD');
        }
        if (data?.telemetry) {
          this.isCircuitBreakerActive.set(Boolean(data.telemetry.circuit_breaker_active));
        }
      },
      error: (err) => {
        console.warn('[SPORTS] Failed to load bankroll settings:', err?.message);
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

  getActiveModeObj() {
    return this.conversationModes.find((m) => m.id === this.activeConversationMode()) || this.conversationModes[0];
  }

  selectConversationMode(modeId: string): void {
    this.activeConversationMode.set(modeId);
    this.isModeMenuOpen.set(false);
  }

  insertEmoji(emoji: string): void {
    this.userInput = (this.userInput || '') + emoji;
    this.showEmojiPicker.set(false);
    setTimeout(() => this.messageInput?.nativeElement?.focus(), 20);
  }

  onChatAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    if (file.type.startsWith('image/')) {
      this.isUploadingAttachment.set(true);
      this.uploadService.uploadImage(file).subscribe({
        next: (res) => {
          this.isUploadingAttachment.set(false);
          this.pendingAttachment.set({
            name: file.name,
            type: 'image',
            url: res.url,
          });
        },
        error: () => {
          this.isUploadingAttachment.set(false);
          // Fallback local data URL if upload fails
          const reader = new FileReader();
          reader.onload = () => {
            this.pendingAttachment.set({
              name: file.name,
              type: 'image',
              url: String(reader.result || ''),
            });
          };
          reader.readAsDataURL(file);
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const rawText = String(reader.result || '').slice(0, 1800).trim();
        this.pendingAttachment.set({
          name: file.name,
          type: 'file',
          textExcerpt: rawText || `Attached file: ${file.name}`,
        });
      };
      reader.readAsText(file);
    }
  }

  clearPendingAttachment(): void {
    this.pendingAttachment.set(null);
  }

  extractAttachedImageUrl(content: string): string | null {
    if (!content) return null;
    const match = content.match(/\[Shared Image:\s*([^\]]+)\]/);
    return match ? match[1].trim() : null;
  }

  cleanMessageContent(content: string): string {
    if (!content) return '';
    return content.replace(/\[Shared Image:\s*[^\]]+\]\n?/, '').trim();
  }

  async sendMessage(): Promise<void> {
    const rawText = this.userInput.trim();
    const att = this.pendingAttachment();
    if ((!rawText && !att) || this.isStreaming() || this.chatService.isLoadingMessages()) {
      return;
    }

    const conversation = this.chatService.activeConversation();
    if (!conversation) {
      return;
    }

    let content = rawText;
    if (att) {
      if (att.type === 'image' && att.url) {
        content = `[Shared Image: ${att.url}]\n${rawText || 'Shared a photo with you.'}`;
      } else if (att.type === 'file') {
        content = `📄 [Attached Note "${att.name}"]:\n"${att.textExcerpt}"\n\n${rawText || 'Please review this note and share your thoughts.'}`;
      }
    }

    this.userInput = '';
    this.pendingAttachment.set(null);
    this.showEmojiPicker.set(false);
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
    this.chatService.updateLastMessage(this.characterId, content, 'user');

    this.abortController = new AbortController();

    // 3. Connect to SSE stream (including activeConversationMode)
    await this.streamService.streamChat({
      conversationId: conversation.id,
      characterId: this.characterId,
      content,
      conversationMode: this.activeConversationMode(),
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
        if (result.crisisDetected) {
          this.crisisSupportActive.set(true);
          if (result.crisisHotline) {
            this.crisisHotlineInfo.set(result.crisisHotline);
          }
        }
        if (result.groundedChunksCount !== undefined) {
          this.lastGroundedInfo.set({
            count: result.groundedChunksCount,
            sources: result.groundedSources || [],
          });
        }
        if (result.sportsIntel) {
          if (result.sportsIntel.circuitBreakerActive !== undefined) {
            this.isCircuitBreakerActive.set(Boolean(result.sportsIntel.circuitBreakerActive));
          } else if (result.sportsIntel.tiltWarning?.circuitBreakerActive !== undefined) {
            this.isCircuitBreakerActive.set(Boolean(result.sportsIntel.tiltWarning.circuitBreakerActive));
          }
        }
        if (result.assistantMessage) {
          const finalMsg: Message = { ...result.assistantMessage };
          if (result.sportsIntel && !finalMsg.sports_intel) {
            finalMsg.sports_intel = result.sportsIntel;
          }
          this.chatService.messages.update((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId ? finalMsg : m
            )
          );
          this.chatService.updateLastMessage(this.characterId, finalMsg.content || '', 'assistant');
          this.updateSmartFollowUps(finalMsg.content || '');
        } else {
          const latest = this.chatService.messages().find((m) => m.id === tempAssistantId);
          if (latest?.content) {
            this.chatService.updateLastMessage(this.characterId, latest.content, 'assistant');
          }
          this.updateSmartFollowUps(latest?.content || '');
        }
        // Refresh memories and sidebar chat order in background
        this.memoryService.getMemories(this.characterId).subscribe();
        this.characterService.getCharacters().subscribe();
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

  dismissCrisisSupport(): void {
    this.crisisSupportActive.set(false);
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

  private getPinnedKey(): string {
    return `lumina_pinned_takeaways_char_${this.characterId}`;
  }

  loadSavedTakeaways(): void {
    try {
      const raw = localStorage.getItem(this.getPinnedKey());
      if (raw) {
        const items: Array<{ id: number; content: string; saved_at: string }> = JSON.parse(raw);
        this.savedMessageIds.set(new Set(items.map((i) => i.id)));
      } else {
        this.savedMessageIds.set(new Set());
      }
    } catch (_) {
      this.savedMessageIds.set(new Set());
    }
  }

  isMessageSaved(messageId: number): boolean {
    return this.savedMessageIds().has(messageId);
  }

  toggleSaveMessageTakeaway(msg: Message): void {
    if (!msg.content) return;
    try {
      const raw = localStorage.getItem(this.getPinnedKey());
      let items: Array<{ id: number; content: string; saved_at: string }> = raw ? JSON.parse(raw) : [];
      if (items.some((i) => i.id === msg.id)) {
        items = items.filter((i) => i.id !== msg.id);
      } else {
        items = [{ id: msg.id, content: msg.content, saved_at: new Date().toISOString() }, ...items];
      }
      localStorage.setItem(this.getPinnedKey(), JSON.stringify(items));
      this.savedMessageIds.set(new Set(items.map((i) => i.id)));
    } catch (_) {}
  }

  updateSmartFollowUps(lastReply: string): void {
    const lower = (lastReply || '').toLowerCase();
    const prompts: string[] = [];
    if (this.isTeacherCharacter()) {
      prompts.push('Can you give me a real-world example of this?');
      prompts.push('Can you break down that step in simpler words?');
      prompts.push('Give me a similar practice problem to test my understanding');
    } else if (this.isSportsCharacter()) {
      prompts.push('What about Over 2.5 vs BTTS here?');
      prompts.push('How do you see corners playing out?');
      prompts.push('What is the safest single pick for my slip?');
    } else if (lower.includes('goal') || lower.includes('plan') || lower.includes('focus')) {
      prompts.push('Break this down into 3 small steps for today');
      prompts.push('What usually holds people back here?');
      prompts.push('Hold me accountable on this tomorrow');
    } else {
      prompts.push('Tell me more about what you mean');
      prompts.push('Give me a practical example I can use today');
      prompts.push('What is one thing I might be overlooking?');
    }
    this.smartFollowUps.set(prompts.slice(0, 3));
  }

  toggleMemoryDrawer(): void {
    this.isMemoryDrawerOpen.update((v) => !v);
  }

  toggleBankrollDrawer(): void {
    this.isBankrollDrawerOpen.update((v) => !v);
  }

  toggleStudyLabDrawer(): void {
    this.isStudyLabDrawerOpen.update((v) => !v);
  }

  setStudyMode(mode: 'calculation' | 'explain' | 'diagnose' | 'quiz'): void {
    this.studyMode.set(mode);
  }

  launchStudyLabPrompt(): void {
    const subject = this.studySubjectInput().trim();
    const problem = this.studyProblemInput().trim();
    const mode = this.studyMode();
    let prompt = '';

    if (mode === 'calculation') {
      prompt = `Please solve this calculation step by step: "${problem || subject}". Show what we are finding, the formula and principle why it works, every intermediate line of math with clear arithmetic and explanation, and the final highlighted result with units.`;
    } else if (mode === 'explain') {
      prompt = `Please teach me about "${problem || subject}" like a world-class teacher. Explain the intuition first using a vivid real-world analogy, give a concrete worked example, and check my understanding at the end.`;
    } else if (mode === 'diagnose') {
      prompt = `I worked through this problem and need you to check my reasoning or spot my mistake: "${problem || subject}". Please praise what I got right, diagnose where the slip happened, and walk me through the correction with patience.`;
    } else if (mode === 'quiz') {
      prompt = `Let's do an interactive practice session on "${problem || subject}". Ask me ONE question at a time to test my understanding, wait for my response, and guide me through like a patient tutor.`;
    }

    if (prompt) {
      this.isStudyLabDrawerOpen.set(false);
      this.onSelectQuickPrompt(prompt);
    }
  }

  async enablePushFromPrompt(): Promise<void> {
    const success = await this.pushService.requestPermissionAndSubscribe();
    if (success) {
      this.isPushPromptDismissed.set(true);
    }
  }

  onBankrollUpdated(updated: any): void {
    if (updated) {
      this.bankrollTotal.set(Number(updated.total_bankroll) || 1000);
      this.bankrollCurrency.set(updated.currency || 'USD');
    }
  }

  onTelemetryUpdated(tel: any): void {
    if (tel) {
      this.isCircuitBreakerActive.set(Boolean(tel.circuit_breaker_active));
    }
  }

  getCurrencySymbol(curr?: string): string {
    if (curr === 'EUR') return '€';
    if (curr === 'GBP') return '£';
    return '$';
  }

  isTeacherCharacter(): boolean {
    const c = this.chatService.activeCharacter();
    if (!c) return false;
    return Boolean(
      c.relationship_type === 'teacher' ||
      c.relationship_type === 'tutor' ||
      c.relationship_type === 'educator' ||
      (c.name && /teacher|tutor|professor|maya|educat|academic|instructor/i.test(c.name)) ||
      (c.personality && /teacher|tutor|professor|teach|math|step-by-step|calculation|pedagog|homework|education/i.test(c.personality))
    );
  }

  isSportsCharacter(): boolean {
    const c = this.chatService.activeCharacter();
    if (!c) return false;
    return Boolean(
      c.is_sports_analyst ||
      (c.name && /betting|sports|analyst|gambl|tipster/i.test(c.name)) ||
      (c.personality && /betting|sports|odds|gambling/i.test(c.personality))
    );
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
          // Refresh memories and sidebar chat order in background
          this.memoryService.getMemories(this.characterId).subscribe();
          this.characterService.getCharacters().subscribe();
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

  toggleMessageMenu(messageId: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.activeMessageMenuId() === messageId) {
      this.activeMessageMenuId.set(null);
    } else {
      this.activeMessageMenuId.set(messageId);
    }
  }

  closeMessageMenu(): void {
    if (this.activeMessageMenuId() !== null) {
      this.activeMessageMenuId.set(null);
    }
  }

  startEditingMessage(msg: Message, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.activeMessageMenuId.set(null);
    this.editingMessageId.set(msg.id);
    this.editingMessageContent = msg.content;
  }

  cancelEditingMessage(): void {
    this.editingMessageId.set(null);
    this.editingMessageContent = '';
  }

  saveEditedMessage(messageId: number): void {
    const trimmed = this.editingMessageContent.trim();
    if (!trimmed) return;

    this.isSavingEdit.set(true);
    this.chatService.editMessage(messageId, trimmed).subscribe({
      next: () => {
        this.isSavingEdit.set(false);
        this.editingMessageId.set(null);
        this.editingMessageContent = '';
      },
      error: (err) => {
        this.isSavingEdit.set(false);
        this.errorMessage = err.error?.message || err.message || 'Failed to update message.';
      },
    });
  }

  onEditKeyDown(event: KeyboardEvent, messageId: number): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEditedMessage(messageId);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditingMessage();
    }
  }

  deleteMessage(msg: Message, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.activeMessageMenuId.set(null);

    const isUser = msg.sender_type === 'user';
    const confirmText = isUser ? 'Delete your message?' : 'Delete this message?';

    if (confirm(confirmText)) {
      this.chatService.deleteMessage(msg.id).subscribe({
        next: () => {
          if (this.editingMessageId() === msg.id) {
            this.cancelEditingMessage();
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.message || err.message || 'Failed to delete message.';
        },
      });
    }
  }

  copyMessageText(content: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.activeMessageMenuId.set(null);
    try {
      navigator.clipboard.writeText(content);
    } catch (_) {}
  }

  toggleHeaderMenu(event?: Event): void {
    if (event) event.stopPropagation();
    this.isHeaderMenuOpen.set(!this.isHeaderMenuOpen());
  }

  closeAllMenus(): void {
    this.closeMessageMenu();
    if (this.isHeaderMenuOpen()) {
      this.isHeaderMenuOpen.set(false);
    }
  }

  openAutoTextSettings(): void {
    this.isHeaderMenuOpen.set(false);
    const char = this.chatService.activeCharacter();
    if (char) {
      this.autoTextEnabled.set(char.allow_proactive_checkins !== false);
      this.autoTextFrequency.set(char.proactive_frequency || '24h');

      let channels: any = {};
      if (typeof char.proactive_channels === 'string') {
        try { channels = JSON.parse(char.proactive_channels); } catch {}
      } else if (typeof char.proactive_channels === 'object') {
        channels = char.proactive_channels || {};
      }

      this.notifyPush.set(channels.push !== false);
      this.notifyEmail.set(channels.email !== false);

      const prefTime = (char.proactive_preferred_time || 'anytime').trim();
      const isExactTimeFormat = /^\d{1,2}:\d{2}$/.test(prefTime);

      if (channels.timing_type) {
        this.autoTextTimingType.set(channels.timing_type);
      } else if (isExactTimeFormat) {
        this.autoTextTimingType.set('exact_time');
      } else if (['morning', 'afternoon', 'evening', 'night'].includes(prefTime)) {
        this.autoTextTimingType.set('window');
      } else if (char.proactive_frequency && ['2h', '4h', '6h', '12h', 'weekly'].includes(char.proactive_frequency)) {
        this.autoTextTimingType.set('interval');
      } else {
        this.autoTextTimingType.set('exact_time');
      }

      this.autoTextExactTime.set(channels.exact_time || (isExactTimeFormat ? prefTime : '09:00'));
      this.autoTextPreferredTime.set(channels.window || (!isExactTimeFormat && prefTime !== 'anytime' ? prefTime : 'morning'));

      const daysMode = channels.days_mode || 
        (char.proactive_frequency === 'weekdays' ? 'weekdays' : 
        (char.proactive_frequency === 'weekends' ? 'weekends' : 
        (char.proactive_frequency === 'custom_days' ? 'custom' : 'everyday')));
      this.autoTextDaysMode.set(daysMode);

      if (Array.isArray(channels.custom_days) && channels.custom_days.length > 0) {
        this.autoTextCustomDays.set(channels.custom_days);
      } else {
        this.autoTextCustomDays.set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
      }

      this.autoTextUserTimezone.set(channels.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    }
    this.autoTextSaveSuccess.set(false);
    this.autoTextSaveError.set(null);
    this.isAutoTextModalOpen.set(true);
  }

  closeAutoTextModal(): void {
    this.isAutoTextModalOpen.set(false);
    this.autoTextSaveSuccess.set(false);
    this.autoTextSaveError.set(null);
  }

  setTimingType(type: 'exact_time' | 'window' | 'interval'): void {
    this.autoTextTimingType.set(type);
  }

  setDaysMode(mode: 'everyday' | 'weekdays' | 'weekends' | 'custom'): void {
    this.autoTextDaysMode.set(mode);
    if (mode === 'everyday') {
      this.autoTextCustomDays.set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    } else if (mode === 'weekdays') {
      this.autoTextCustomDays.set(['mon', 'tue', 'wed', 'thu', 'fri']);
    } else if (mode === 'weekends') {
      this.autoTextCustomDays.set(['sat', 'sun']);
    }
  }

  setExactTimePreset(time: string): void {
    this.autoTextExactTime.set(time);
    this.autoTextTimingType.set('exact_time');
  }

  toggleCustomDay(dayKey: string): void {
    const current = this.autoTextCustomDays();
    if (current.includes(dayKey)) {
      if (current.length > 1) {
        this.autoTextCustomDays.set(current.filter((d) => d !== dayKey));
      }
    } else {
      this.autoTextCustomDays.set([...current, dayKey]);
    }
    this.autoTextDaysMode.set('custom');
  }

  isCustomDaySelected(dayKey: string): boolean {
    return this.autoTextCustomDays().includes(dayKey);
  }

  onExactTimeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target?.value) {
      this.autoTextExactTime.set(target.value);
    }
  }

  onAutoTextFreqChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.autoTextFrequency.set(target.value);
    }
  }

  onAutoTextTimeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.autoTextPreferredTime.set(target.value);
    }
  }

  getScheduleSummaryText(): string {
    const charName = this.chatService.activeCharacter()?.name || 'Companion';
    if (!this.autoTextEnabled()) {
      return `${charName}'s proactive messages and check-ins are turned off.`;
    }

    const channels: string[] = [];
    if (this.notifyPush()) channels.push('Web Push');
    if (this.notifyEmail()) channels.push('Email');
    const channelText = channels.length > 0 ? channels.join(' & ') : 'silent chat';

    let dayText = 'every day';
    if (this.autoTextDaysMode() === 'weekdays') dayText = 'on weekdays (Mon–Fri)';
    else if (this.autoTextDaysMode() === 'weekends') dayText = 'on weekends (Sat–Sun)';
    else if (this.autoTextDaysMode() === 'custom') {
      const days = this.autoTextCustomDays();
      if (days.length === 7) dayText = 'every day';
      else if (days.length === 0) dayText = 'on selected days';
      else dayText = `on ${days.map((d) => d.toUpperCase()).join(', ')}`;
    }

    if (this.autoTextTimingType() === 'exact_time') {
      const time = this.autoTextExactTime();
      let formattedTime = time;
      try {
        const parts = time.split(':').map(Number);
        const h = parts[0];
        const m = parts[1] || 0;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        formattedTime = `${displayH}:${m < 10 ? '0' : ''}${m} ${ampm}`;
      } catch {}
      return `✨ ${charName} will text you ${dayText} at ${formattedTime} (${this.autoTextUserTimezone()}) via ${channelText}.`;
    }

    if (this.autoTextTimingType() === 'window') {
      const w = this.autoTextPreferredTime();
      const windowLabels: Record<string, string> = {
        morning: 'in the morning (8:00 AM – 12:00 PM)',
        afternoon: 'in the afternoon (12:00 PM – 6:00 PM)',
        evening: 'in the evening (6:00 PM – 10:00 PM)',
        night: 'at night (9:00 PM – 12:00 AM)',
        anytime: 'spontaneously throughout the day',
      };
      return `✨ ${charName} will text you ${dayText} ${windowLabels[w] || w} via ${channelText}.`;
    }

    const freqLabels: Record<string, string> = {
      '2h': 'every 2 hours',
      '4h': 'every 4 hours',
      '6h': 'every 6 hours',
      '12h': 'twice a day (every 12 hours)',
      '24h': 'daily (every 24 hours)',
      '48h': 'every 2 days',
      'weekly': 'once a week',
    };
    return `✨ ${charName} will reach out ${freqLabels[this.autoTextFrequency()] || 'regularly'} via ${channelText}.`;
  }

  saveAutoTextSettings(): void {
    const char = this.chatService.activeCharacter();
    if (!char) return;

    this.isSavingAutoText.set(true);
    this.autoTextSaveSuccess.set(false);
    this.autoTextSaveError.set(null);

    const timingType = this.autoTextTimingType();
    let effectiveFreq = this.autoTextFrequency();
    let effectivePrefTime = this.autoTextPreferredTime();

    if (timingType === 'exact_time') {
      effectivePrefTime = this.autoTextExactTime();
      const daysMode = this.autoTextDaysMode();
      if (daysMode === 'everyday') effectiveFreq = '24h';
      else if (daysMode === 'weekdays') effectiveFreq = 'weekdays';
      else if (daysMode === 'weekends') effectiveFreq = 'weekends';
      else if (daysMode === 'custom') effectiveFreq = 'custom_days';
    } else if (timingType === 'window') {
      effectivePrefTime = this.autoTextPreferredTime();
      const daysMode = this.autoTextDaysMode();
      if (daysMode === 'everyday') effectiveFreq = '24h';
      else if (daysMode === 'weekdays') effectiveFreq = 'weekdays';
      else if (daysMode === 'weekends') effectiveFreq = 'weekends';
      else if (daysMode === 'custom') effectiveFreq = 'custom_days';
    } else if (timingType === 'interval') {
      effectivePrefTime = 'anytime';
      effectiveFreq = this.autoTextFrequency();
    }

    const channelsPayload = {
      push: this.notifyPush(),
      email: this.notifyEmail(),
      timing_type: timingType,
      exact_time: this.autoTextExactTime(),
      window: this.autoTextPreferredTime(),
      days_mode: this.autoTextDaysMode(),
      custom_days: this.autoTextCustomDays(),
      timezone: this.autoTextUserTimezone(),
    };

    const patchPayload = {
      allow_proactive_checkins: this.autoTextEnabled(),
      proactive_frequency: effectiveFreq,
      proactive_preferred_time: effectivePrefTime,
      proactive_channels: channelsPayload,
    };

    this.characterService.updateCharacter(char.id, patchPayload).subscribe({
      next: (res) => {
        this.isSavingAutoText.set(false);
        this.autoTextSaveSuccess.set(true);
        if (res.data) {
          this.chatService.activeCharacter.set(res.data);
        }
        setTimeout(() => {
          this.closeAutoTextModal();
        }, 1200);
      },
      error: (err) => {
        this.isSavingAutoText.set(false);
        this.autoTextSaveError.set(err.error?.message || err.message || 'Failed to save settings.');
      },
    });
  }

  onEditCharacter(characterId: number): void {
    this.isHeaderMenuOpen.set(false);
    this.router.navigate(['/dashboard/characters', characterId, 'edit']);
  }

  openMemoriesFromMenu(): void {
    this.isHeaderMenuOpen.set(false);
    this.toggleMemoryDrawer();
  }

  openDeleteConfirmModal(): void {
    this.isHeaderMenuOpen.set(false);
    this.deleteError.set(null);
    this.isDeleteConfirmModalOpen.set(true);
  }

  closeDeleteConfirmModal(): void {
    this.isDeleteConfirmModalOpen.set(false);
    this.deleteError.set(null);
  }

  executeDeleteCharacter(): void {
    const char = this.chatService.activeCharacter();
    if (!char || char.is_system) return;

    this.isDeletingCharacter.set(true);
    this.deleteError.set(null);

    this.characterService.deleteCharacter(char.id).subscribe({
      next: () => {
        this.isDeletingCharacter.set(false);
        this.closeDeleteConfirmModal();
        this.router.navigate(['/dashboard/characters']);
      },
      error: (err) => {
        this.isDeletingCharacter.set(false);
        this.deleteError.set(err.error?.message || err.message || 'Failed to delete companion.');
      },
    });
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
