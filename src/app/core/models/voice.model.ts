export type VoiceProvider = 'preset' | 'cloned' | 'none';

export interface VoicePreset {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  accent: string;
  recommendedFor: string;
  description: string;
  provider: VoiceProvider;
  previewText: string;
}

export interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  speed?: number;
  mappedPreset?: string;
  ref_text?: string;
  voiceSampleUrl?: string | null;
  sampleUrl?: string | null;
  estimatedPitchHz?: number;
}

export interface ClonedVoiceResult {
  voiceId: string;
  voiceSampleUrl: string | null;
  voiceProvider: VoiceProvider;
  refText?: string;
  transcript?: string;
  voiceSettings: VoiceSettings;
}

export interface VoiceTurnResponse {
  userTranscript: string;
  replyText: string;
  audioBase64: string;
  mimeType: string;
  audioUrl?: string;
  durationSeconds?: number;
  character?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
    voiceId?: string;
  };
  mind?: {
    id: number;
    handle: string;
    displayName: string;
    avatarUrl?: string | null;
    voiceId?: string;
  };
  conversationId?: number;
  sessionId?: number;
  userMessage?: any;
  assistantMessage?: any;
}
