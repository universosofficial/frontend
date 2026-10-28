export type RelationshipType = 'father' | 'mother' | 'spouse' | 'partner' | 'friend' | 'mentor' | 'sibling' | 'teacher' | 'tutor' | 'educator' | 'custom';

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
  is_mind?: boolean;
  total_subscribers?: number;
  handle?: string | null;
  headline?: string | null;
  website_url?: string | null;
  philosophy_statement?: string | null;
  decision_frameworks?: string[];
  mental_models?: string[];
  tags?: string[];
  total_interactions?: number;
  is_sports_analyst?: boolean;
  analysis_style?: 'quant_expected_value' | 'tactical_pundit' | 'conservative_grinder';
  primary_leagues?: string[];
  risk_tier?: 'conservative_eighth_kelly' | 'balanced_quarter_kelly' | 'fixed_one_percent';
  allow_proactive_checkins?: boolean;
  proactive_frequency?: '6h' | '12h' | '24h' | '48h' | 'weekly' | string;
  proactive_preferred_time?: 'morning' | 'afternoon' | 'evening' | 'anytime' | string;
  proactive_channels?: {
    push?: boolean;
    email?: boolean;
    [key: string]: any;
  } | null;
  last_message?: string | null;
  last_message_at?: string | null;
  last_message_sender?: 'user' | 'assistant' | null;
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
  is_sports_analyst?: boolean;
  analysis_style?: string;
  primary_leagues?: string[];
  risk_tier?: string;
  allow_proactive_checkins?: boolean;
  proactive_frequency?: string;
  proactive_preferred_time?: string;
  proactive_channels?: {
    push?: boolean;
    email?: boolean;
    [key: string]: any;
  } | null;
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
  sports_intel?: any;
  is_edited?: boolean;
  edited_at?: string | null;
  created_at: string;
}

export interface SportsBankrollSettings {
  id?: number;
  user_id?: number;
  total_bankroll: number;
  currency: string;
  staking_model: 'quarter_kelly' | 'eighth_kelly' | 'fixed_unit';
  max_unit_limit_percent: number;
  daily_stop_loss_percent: number;
}

export interface SportsTelemetry {
  consecutive_losses: number;
  daily_pnl: number;
  circuit_breaker_active: boolean;
  lockout_until?: string | null;
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
