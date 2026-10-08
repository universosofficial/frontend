export type RelationshipType = 'father' | 'mother' | 'spouse' | 'partner' | 'friend' | 'mentor' | 'sibling' | 'custom';

export interface Character {
  id: number;
  user_id: number;
  name: string;
  relationship_type: RelationshipType;
  avatar_url: string | null;
  gender: string | null;
  personality: string;
  tone: string;
  humor: number;
  friendliness: number;
  creativity: number;
  style: string;
  nicknames_for_user: string[];
  catchphrases: string[];
  speech_quirks: string | null;
  shared_memories_seed: string | null;
  backstory?: string | null;
  interests?: string[];
  greeting?: string;
  voice_provider?: 'preset' | 'cloned' | 'none';
  voice_id?: string | null;
  voice_sample_url?: string | null;
  voice_settings?: any;
  is_system: boolean;
  is_public?: boolean;
  is_verified?: boolean;
  is_subscribed?: boolean;
  total_subscribers?: number;
  handle?: string | null;
  headline?: string | null;
  website_url?: string | null;
  philosophy_statement?: string | null;
  decision_frameworks?: string[];
  mental_models?: string[];
  tags?: string[];
  total_interactions?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCharacterDto {
  name: string;
  relationship_type?: RelationshipType;
  avatarUrl?: string | null;
  gender?: string | null;
  personality: string;
  tone: string;
  humor: number;
  friendliness: number;
  creativity: number;
  style: string;
  nicknames_for_user?: string[] | string;
  catchphrases?: string[] | string;
  speech_quirks?: string | null;
  shared_memories_seed?: string | null;
  backstory?: string | null;
  interests?: string[];
  greeting: string;
  voice_provider?: 'preset' | 'cloned' | 'none';
  voice_id?: string | null;
  voice_sample_url?: string | null;
  voice_settings?: any;
  is_public?: boolean;
  is_verified?: boolean;
  handle?: string | null;
  headline?: string | null;
  website_url?: string | null;
  philosophy_statement?: string | null;
  decision_frameworks?: string[];
  mental_models?: string[];
  tags?: string[];
}

export interface Conversation {
  id: number;
  user_id: number;
  character_id: number;
  title: string;
  is_pinned: boolean;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_type: 'user' | 'assistant' | 'system';
  content: string;
  token_count: number;
  message_type?: 'text' | 'voice';
  audio_url?: string | null;
  duration_seconds?: number | null;
  created_at: string;
}

export interface ChatTurnResponse {
  conversationId: number;
  character: {
    id: number;
    name: string;
    avatar_url: string | null;
    relationship_type?: RelationshipType;
  };
  userMessage: Message;
  assistantMessage: Message;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
