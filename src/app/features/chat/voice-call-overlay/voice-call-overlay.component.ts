import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoiceService } from '../../../core/services/voice.service';
import { Character } from '../../../core/models/character.model';
import { PublicMind } from '../../../core/models/mind.model';

export type CallState = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'muted';

@Component({
  selector: 'app-voice-call-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voice-call-overlay.component.html',
  styleUrl: './voice-call-overlay.component.scss',
})
export class VoiceCallOverlayComponent implements OnInit, OnDestroy {
  public voiceService = inject(VoiceService);

  @Input() character: Character | null = null;
  @Input() mind: PublicMind | null = null;
  @Input() conversationId: number | null = null;

  @Output() closeCall = new EventEmitter<void>();
  @Output() messageAdded = new EventEmitter<{ userMessage?: any; assistantMessage?: any }>();

  callState = signal<CallState>('connecting');
  isMuted = signal<boolean>(false);
  callDuration = signal<number>(0);
  formattedTime = signal<string>('00:00');
  userTranscript = signal<string>('');
  assistantReply = signal<string>('');
  errorMessage = signal<string | null>(null);

  // Manual text fallback in case mic is unavailable
  showTextInput = signal<boolean>(false);
  textInputFallback = signal<string>('');

  // Audio wave bars visualization data
  waveBars = signal<number[]>([20, 45, 75, 30, 90, 60, 40, 85, 50, 70, 35, 65]);

  private timerInterval: any = null;
  private waveAnimationInterval: any = null;
  private isProcessingTurn = false;

  get targetName(): string {
    if (this.character) return this.character.name;
    if (this.mind) return this.mind.display_name || this.mind.name || this.mind.handle;
    return 'AI Companion';
  }

  get targetAvatar(): string | null {
    if (this.character) return this.character.avatar_url;
    if (this.mind) return this.mind.avatar_url;
    return null;
  }

  get targetSubtitle(): string {
    if (this.character) {
      if (this.character.is_public) return 'Public Digital Twin';
      return this.character.relationship_type
        ? `${this.character.relationship_type.charAt(0).toUpperCase() + this.character.relationship_type.slice(1)}`
        : 'Companion';
    }
    if (this.mind) return `@${this.mind.handle} • AI Mind`;
    return 'Voice Presence';
  }

  ngOnInit(): void {
    this.startCallTimer();
    this.startWaveAnimation();
    this.initiateVoiceSession();
  }

  ngOnDestroy(): void {
    this.cleanupSession();
  }

  private startCallTimer(): void {
    this.callDuration.set(0);
    this.timerInterval = setInterval(() => {
      this.callDuration.update((d) => {
        const next = d + 1;
        const mins = Math.floor(next / 60)
          .toString()
          .padStart(2, '0');
        const secs = (next % 60).toString().padStart(2, '0');
        this.formattedTime.set(`${mins}:${secs}`);
        return next;
      });
    }, 1000);
  }

  private startWaveAnimation(): void {
    this.waveAnimationInterval = setInterval(() => {
      const state = this.callState();
      if (state === 'speaking') {
        // High dynamic frequency waves
        this.waveBars.set(
          Array.from({ length: 16 }, () => Math.floor(Math.random() * 70 + 25))
        );
      } else if (state === 'listening' && !this.isMuted()) {
        // Subtle ambient microphone waves
        this.waveBars.set(
          Array.from({ length: 16 }, () => Math.floor(Math.random() * 40 + 15))
        );
      } else if (state === 'thinking') {
        // Gentle rhythmic ripple
        const t = Date.now() / 300;
        this.waveBars.set(
          Array.from({ length: 16 }, (_, i) => Math.floor(Math.sin(t + i * 0.4) * 25 + 35))
        );
      } else {
        // Minimal flatline
        this.waveBars.set(Array.from({ length: 16 }, () => 10));
      }
    }, 120);
  }

  private async initiateVoiceSession(): Promise<void> {
    try {
      this.callState.set('listening');
      await this.startListeningTurn();
    } catch (err: any) {
      console.warn('[VOICE CALL] Mic access issue:', err.message);
      this.errorMessage.set('Microphone access is unavailable. You can type to talk.');
      this.showTextInput.set(true);
      this.callState.set('listening');
    }
  }

  private async startListeningTurn(): Promise<void> {
    if (this.isMuted() || this.isProcessingTurn) return;

    try {
      await this.voiceService.startRecording();
      this.callState.set('listening');
    } catch (err: any) {
      console.warn('[VOICE CALL] Could not record mic:', err);
      this.showTextInput.set(true);
    }
  }

  /**
   * Called when user finishes speaking (by tapping central button or silence detection)
   */
  async finishSpeaking(): Promise<void> {
    if (this.isProcessingTurn) return;
    this.isProcessingTurn = true;
    this.errorMessage.set(null);

    let audioBlob: Blob | null = null;
    try {
      audioBlob = await this.voiceService.stopRecording();
    } catch (err) {
      console.warn('[VOICE CALL] Error stopping recording:', err);
    }

    if (!audioBlob || audioBlob.size < 500) {
      this.isProcessingTurn = false;
      this.errorMessage.set('No speech detected. Please speak and tap Done Speaking.');
      this.callState.set('listening');
      this.startListeningTurn();
      return;
    }

    this.callState.set('thinking');

    this.voiceService
      .sendVoiceTurn({
        audioBlob,
        characterId: this.character ? this.character.id : undefined,
        conversationId: this.conversationId || undefined,
        mindHandle: this.mind ? this.mind.handle : undefined,
        mindId: this.mind ? this.mind.id : undefined,
      })
      .subscribe({
        next: async (res) => {
          this.userTranscript.set(res.userTranscript);
          this.assistantReply.set(res.replyText);

          // Emit to parent chat view so turns appear in messages stream
          this.messageAdded.emit({
            userMessage: res.userMessage,
            assistantMessage: res.assistantMessage,
          });

          // Play AI synthesized speech
          if (res.audioBase64) {
            this.callState.set('speaking');
            try {
              await this.voiceService.playAudio(res.audioBase64);
            } catch (playErr) {
              console.warn('[VOICE CALL] Playback error:', playErr);
            }
          }

          // Return to listening for next turn
          this.isProcessingTurn = false;
          if (!this.isMuted()) {
            this.startListeningTurn();
          } else {
            this.callState.set('muted');
          }
        },
        error: (err) => {
          console.error('[VOICE CALL] Turn execution error:', err);
          this.isProcessingTurn = false;
          this.errorMessage.set(
            err.error?.error?.message || err.error?.message || 'Could not understand audio. Please try again.'
          );
          this.callState.set('listening');
          this.startListeningTurn();
        },
      });
  }

  /**
   * Send fallback text message turn if user typed instead of speaking
   */
  sendFallbackText(): void {
    const text = this.textInputFallback().trim();
    if (!text || this.isProcessingTurn) return;

    this.isProcessingTurn = true;
    this.textInputFallback.set('');
    this.errorMessage.set(null);
    this.callState.set('thinking');
    this.userTranscript.set(text);

    this.voiceService
      .sendVoiceTurn({
        text,
        characterId: this.character ? this.character.id : undefined,
        conversationId: this.conversationId || undefined,
        mindHandle: this.mind ? this.mind.handle : undefined,
        mindId: this.mind ? this.mind.id : undefined,
      })
      .subscribe({
        next: async (res) => {
          this.assistantReply.set(res.replyText);

          this.messageAdded.emit({
            userMessage: res.userMessage,
            assistantMessage: res.assistantMessage,
          });

          if (res.audioBase64) {
            this.callState.set('speaking');
            try {
              await this.voiceService.playAudio(res.audioBase64);
            } catch (playErr) {
              console.warn('[VOICE CALL] Playback error:', playErr);
            }
          }

          this.isProcessingTurn = false;
          this.callState.set('listening');
          if (!this.isMuted()) {
            this.startListeningTurn();
          }
        },
        error: (err) => {
          this.isProcessingTurn = false;
          this.errorMessage.set(err.error?.error?.message || 'Failed to process turn.');
          this.callState.set('listening');
        },
      });
  }

  toggleMute(): void {
    if (this.isMuted()) {
      this.isMuted.set(false);
      if (this.callState() === 'muted') {
        this.startListeningTurn();
      }
    } else {
      this.isMuted.set(true);
      this.voiceService.cancelRecording();
      if (this.callState() === 'listening') {
        this.callState.set('muted');
      }
    }
  }

  toggleTextInput(): void {
    this.showTextInput.update((v) => !v);
  }

  endCall(): void {
    this.cleanupSession();
    this.closeCall.emit();
  }

  private cleanupSession(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.waveAnimationInterval) {
      clearInterval(this.waveAnimationInterval);
      this.waveAnimationInterval = null;
    }
    this.voiceService.stopAudio();
    this.voiceService.cancelRecording();
  }
}
