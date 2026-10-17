import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { VoicePreset, ClonedVoiceResult, VoiceTurnResponse } from '../models/voice.model';
import { API_BASE_URL, SERVER_ORIGIN } from '../constants/api.constants';

@Injectable({
  providedIn: 'root',
})
export class VoiceService {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE_URL}/voice`;

  // Playback state signals
  public isAudioPlaying = signal<boolean>(false);
  public currentPlayingVoiceId = signal<string | null>(null);

  // Dedicated Message Voice Note Playback State
  public currentPlayingMessageId = signal<number | null>(null);
  public currentPlaybackTime = signal<number>(0);
  public currentPlaybackDuration = signal<number>(0);
  public currentPlaybackProgress = signal<number>(0);
  private messageAudio: HTMLAudioElement | null = null;

  // Active audio element for preview playback
  private currentAudio: HTMLAudioElement | null = null;

  // Web Audio Recording state (16kHz WAV capture)
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private mediaSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private pcmBuffers: Float32Array[] = [];
  private recordingSampleRate: number = 44100;
  private isRecordingActive = false;

  /**
   * Fetch all curated voice presets.
   */
  getPresets(): Observable<VoicePreset[]> {
    return this.http.get<{ success: boolean; data: VoicePreset[] }>(`${this.apiUrl}/presets`).pipe(
      map((res) => res.data)
    );
  }

  /**
   * Clone a voice from an uploaded or recorded audio sample.
   */
  cloneVoice(file: Blob, name: string, description?: string): Observable<ClonedVoiceResult> {
    const formData = new FormData();
    let filename = 'sample.mp3';
    if (file instanceof File && file.name) {
      filename = file.name;
    } else if (file.type) {
      if (file.type.includes('webm')) filename = 'sample.webm';
      else if (file.type.includes('wav')) filename = 'sample.wav';
      else if (file.type.includes('m4a')) filename = 'sample.m4a';
      else if (file.type.includes('ogg')) filename = 'sample.ogg';
    }
    formData.append('sample', file, filename);
    formData.append('name', name);
    if (description) {
      formData.append('description', description);
    }

    return this.http
      .post<{ success: boolean; data: ClonedVoiceResult }>(`${this.apiUrl}/clone`, formData)
      .pipe(map((res) => res.data));
  }

  /**
   * Request text synthesis preview.
   */
  previewVoice(
    text: string,
    voiceId: string,
    voiceSampleUrl?: string | null,
    voiceSettings?: any
  ): Observable<{ audioBase64: string; mimeType: string }> {
    return this.http
      .post<{ success: boolean; data: { audioBase64: string; mimeType: string } }>(
        `${this.apiUrl}/speak`,
        {
          text,
          voiceId,
          voiceSampleUrl: voiceSampleUrl || undefined,
          refAudioUrl: voiceSampleUrl || undefined,
          voiceSettings: voiceSettings || undefined,
          format: 'base64',
        }
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Execute end-to-end voice turn (mic audio in -> STT -> LLM turn -> TTS audio out).
   */
  sendVoiceTurn(params: {
    audioBlob?: Blob;
    text?: string;
    characterId?: number;
    conversationId?: number;
    mindHandle?: string;
    mindId?: number;
  }): Observable<VoiceTurnResponse> {
    const formData = new FormData();

    if (params.audioBlob) {
      const isWav = params.audioBlob.type?.includes('wav');
      const filename = isWav ? 'turn.wav' : (params.audioBlob.type?.includes('mp4') ? 'turn.m4a' : 'turn.webm');
      formData.append('audio', params.audioBlob, filename);
    }
    if (params.text) {
      formData.append('text', params.text);
    }
    if (params.characterId) {
      formData.append('characterId', String(params.characterId));
    }
    if (params.conversationId) {
      formData.append('conversationId', String(params.conversationId));
    }
    if (params.mindHandle) {
      formData.append('mindHandle', params.mindHandle);
    }
    if (params.mindId) {
      formData.append('mindId', String(params.mindId));
    }

    return this.http
      .post<{ success: boolean; data: VoiceTurnResponse }>(`${this.apiUrl}/turn`, formData)
      .pipe(map((res) => res.data));
  }

  /**
   * Play base64 or URL audio with reactive state updates.
   */
  playAudio(source: string, voiceId?: string): Promise<void> {
    this.stopAudio();

    return new Promise((resolve, reject) => {
      try {
        const audioSrc = source.startsWith('data:') || source.startsWith('http')
          ? source
          : `data:audio/mpeg;base64,${source}`;

        const audio = new Audio(audioSrc);
        this.currentAudio = audio;
        this.isAudioPlaying.set(true);
        this.currentPlayingVoiceId.set(voiceId || null);

        audio.onended = () => {
          this.isAudioPlaying.set(false);
          this.currentPlayingVoiceId.set(null);
          this.currentAudio = null;
          resolve();
        };

        audio.onerror = (e) => {
          this.isAudioPlaying.set(false);
          this.currentPlayingVoiceId.set(null);
          this.currentAudio = null;
          reject(e);
        };

        audio.play().catch((err) => {
          this.isAudioPlaying.set(false);
          this.currentPlayingVoiceId.set(null);
          this.currentAudio = null;
          reject(err);
        });
      } catch (err) {
        this.isAudioPlaying.set(false);
        this.currentPlayingVoiceId.set(null);
        reject(err);
      }
    });
  }

  /**
   * Stop currently playing speech audio immediately.
   */
  stopAudio(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (_) {}
      this.currentAudio = null;
    }
    this.stopMessageAudio();
    this.isAudioPlaying.set(false);
    this.currentPlayingVoiceId.set(null);
  }

  /**
   * Format audio source URL for playback.
   */
  resolveAudioUrl(source: string): string {
    if (!source) return '';
    if (source.startsWith('data:') || source.startsWith('blob:')) return source;
    if (source.startsWith('http://') || source.startsWith('https://')) return source;
    if (source.startsWith('/uploads/')) return `${SERVER_ORIGIN}${source}`;
    return `data:audio/mpeg;base64,${source}`;
  }

  /**
   * Toggle play / pause for a specific voice note message.
   */
  async togglePlayPauseMessage(messageId: number, rawSource: string): Promise<void> {
    const isSameMessage = this.currentPlayingMessageId() === messageId;

    if (isSameMessage && this.messageAudio) {
      if (!this.messageAudio.paused) {
        this.messageAudio.pause();
        this.isAudioPlaying.set(false);
        return;
      } else {
        try {
          await this.messageAudio.play();
          this.isAudioPlaying.set(true);
        } catch (_) {}
        return;
      }
    }

    // Stop existing audio
    this.stopAudio();
    this.stopMessageAudio();

    const audioUrl = this.resolveAudioUrl(rawSource);
    if (!audioUrl) return;

    this.currentPlayingMessageId.set(messageId);
    this.currentPlaybackTime.set(0);
    this.currentPlaybackProgress.set(0);

    const audio = new Audio(audioUrl);
    this.messageAudio = audio;

    audio.ontimeupdate = () => {
      this.currentPlaybackTime.set(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        this.currentPlaybackDuration.set(audio.duration);
        this.currentPlaybackProgress.set((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        this.currentPlaybackDuration.set(audio.duration);
      }
    };

    audio.onended = () => {
      this.currentPlayingMessageId.set(null);
      this.isAudioPlaying.set(false);
      this.currentPlaybackTime.set(0);
      this.currentPlaybackProgress.set(0);
      this.messageAudio = null;
    };

    audio.onerror = () => {
      this.currentPlayingMessageId.set(null);
      this.isAudioPlaying.set(false);
      this.messageAudio = null;
    };

    try {
      await audio.play();
      this.isAudioPlaying.set(true);
    } catch (err) {
      this.currentPlayingMessageId.set(null);
      this.isAudioPlaying.set(false);
      this.messageAudio = null;
      console.warn('Audio play prevented or failed:', err);
    }
  }

  /**
   * Seek inside the current playing message audio (percent 0-100).
   */
  seekMessageAudio(percent: number): void {
    if (this.messageAudio && this.messageAudio.duration && !isNaN(this.messageAudio.duration)) {
      const targetTime = (percent / 100) * this.messageAudio.duration;
      this.messageAudio.currentTime = targetTime;
      this.currentPlaybackTime.set(targetTime);
      this.currentPlaybackProgress.set(percent);
    }
  }

  /**
   * Stop message audio playback.
   */
  stopMessageAudio(): void {
    if (this.messageAudio) {
      try {
        this.messageAudio.pause();
        this.messageAudio.currentTime = 0;
      } catch (_) {}
      this.messageAudio = null;
    }
    this.currentPlayingMessageId.set(null);
    this.currentPlaybackTime.set(0);
    this.currentPlaybackProgress.set(0);
  }

  /**
   * Start recording user microphone input via Web Audio API.
   */
  async startRecording(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone audio capture is not supported in this browser.');
    }

    this.pcmBuffers = [];
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      this.audioContext = new AudioCtx();
      this.recordingSampleRate = this.audioContext.sampleRate || 44100;
      this.mediaSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isRecordingActive) return;
        const inputData = event.inputBuffer.getChannelData(0);
        this.pcmBuffers.push(new Float32Array(inputData));
      };

      this.mediaSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      this.isRecordingActive = true;
    }
  }

  /**
   * Stop recording user microphone input and return standard 16kHz WAV Blob.
   */
  async stopRecording(): Promise<Blob> {
    this.isRecordingActive = false;

    if (this.scriptProcessor && this.mediaSource && this.audioContext) {
      try {
        this.scriptProcessor.disconnect();
        this.mediaSource.disconnect();
      } catch (_) {}

      this.cleanUpMediaStream();

      if (this.audioContext.state !== 'closed') {
        try {
          await this.audioContext.close();
        } catch (_) {}
      }
      this.audioContext = null;

      // Concatenate Float32 chunks
      let totalLength = 0;
      for (const chunk of this.pcmBuffers) {
        totalLength += chunk.length;
      }

      if (totalLength === 0) {
        return new Blob([], { type: 'audio/wav' });
      }

      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of this.pcmBuffers) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      this.pcmBuffers = [];

      // Downsample to 16,000 Hz (Whisper native sample rate)
      const targetRate = 16000;
      const resampled = this.downsampleBuffer(merged, this.recordingSampleRate, targetRate);
      return this.encodeWAV(resampled, targetRate);
    }

    this.cleanUpMediaStream();
    return new Blob([], { type: 'audio/wav' });
  }

  /**
   * Cancel ongoing recording and release microphone hardware.
   */
  cancelRecording(): void {
    this.isRecordingActive = false;
    if (this.scriptProcessor && this.mediaSource) {
      try { this.scriptProcessor.disconnect(); } catch (_) {}
      try { this.mediaSource.disconnect(); } catch (_) {}
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (_) {}
    }
    this.audioContext = null;
    this.cleanUpMediaStream();
    this.pcmBuffers = [];
  }

  private cleanUpMediaStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  /**
   * Downsample audio Float32 buffer to target rate.
   */
  private downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number = 16000): Float32Array {
    if (inputRate === outputRate || buffer.length === 0) {
      return buffer;
    }
    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }

  /**
   * Encode 16-bit PCM WAV Blob from Float32 samples.
   */
  private encodeWAV(samples: Float32Array, sampleRate: number = 16000): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // 16-bit
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
