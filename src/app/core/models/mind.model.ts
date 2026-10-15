export interface MindSource {
  id: number;
  mind_id?: number;
  character_id?: number;
  source_type: 'url' | 'pdf' | 'document' | 'manual' | 'manual_text';
  sourceType?: 'url' | 'pdf' | 'document' | 'manual' | 'manual_text';
  title: string;
  source_uri?: string | null;
  sourceUri?: string | null;
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  chunk_count?: number;
  chunkCount?: number;
  error_message?: string | null;
  errorMessage?: string | null;
  created_at?: string;
  createdAt?: string;
  excerpt?: string;
}

export interface AudienceQuestion {
  id: number;
  session_id: number;
  question: string;
  ai_answer: string | null;
  asked_at: string;
  is_trained: boolean;
}

export interface CouncilPerspective {
  mind_id: number;
  handle: string;
  display_name: string;
  headline: string;
  avatar_url: string | null;
  perspective: string;
  sources: Array<{ title: string; excerpt?: string }>;
}

export interface CouncilResult {
  question: string;
  perspectives: CouncilPerspective[];
  synthesis: string;
}

export interface MindSessionMeta {
  id: number;
  chat_mode: 'ai' | 'human_direct';
  is_paid_unlocked: boolean;
  paid_amount: number;
  handoff_summary?: string | null;
  escalation_note?: string | null;
  escalated_at?: string | null;
}

export interface PaidHumanSession {
  id: number;
  mind_id: number;
  visitor_user_id: number;
  visitor_email: string;
  visitor_name: string;
  title: string;
  chat_mode: 'ai' | 'human_direct';
  is_paid_unlocked: boolean;
  paid_amount: number;
  handoff_summary: string | null;
  escalation_note: string | null;
  unread_for_creator: number;
  escalated_at: string;
  last_message_at: string;
  messages: Array<{
    id: number;
    session_id: number;
    sender_type: 'user' | 'mind' | 'creator' | 'system';
    message_type?: 'text' | 'voice';
    content: string;
    created_at: string;
  }>;
}

export interface UserMind {
  id: number;
  user_id: number;
  handle: string;
  display_name: string;
  headline: string | null;
  avatar_url: string | null;
  website_url: string | null;
  bio: string | null;
  philosophy_statement: string | null;
  decision_frameworks: string[];
  tags: string[];
  voice_provider?: 'preset' | 'cloned' | 'none';
  voice_id?: string | null;
  voice_sample_url?: string | null;
  voice_settings?: any;
  direct_chat_enabled?: boolean;
  direct_chat_price?: number;
  direct_chat_sla?: string;
  is_published: boolean;
  total_consultations: number;
  created_at: string;
  updated_at: string;
  sources?: MindSource[];
  audience_questions?: AudienceQuestion[];
  paid_sessions?: PaidHumanSession[];
}

export interface PublicMind {
  id: number;
  user_id: number;
  name?: string;
  display_name?: string;
  handle: string;
  headline: string;
  avatar_url: string | null;
  website_url: string | null;
  bio?: string | null;
  personality?: string;
  tone?: string;
  philosophy_statement: string;
  decision_frameworks?: string[];
  mental_models?: string[];
  tags: string[];
  voice_provider?: 'preset' | 'cloned' | 'none';
  voice_id?: string | null;
  voice_sample_url?: string | null;
  voice_settings?: any;
  direct_chat_enabled?: boolean;
  direct_chat_price?: number;
  direct_chat_sla?: string;
  greeting?: string;
  is_public?: boolean;
  is_published?: boolean;
  is_verified?: boolean;
  is_subscribed?: boolean;
  total_subscribers?: number;
  total_interactions?: number;
  total_consultations?: number;
  created_at: string;
  creator?: {
    id: number;
    name: string;
  };
  sources?: MindSource[];
  messages?: any[];
  session?: MindSessionMeta | null;
}

export interface MindExploreResult {
  minds: PublicMind[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface MindPublishDto {
  is_public?: boolean;
  isPublic?: boolean;
  is_published?: boolean;
  handle?: string;
  display_name?: string;
  headline?: string;
  website_url?: string;
  websiteUrl?: string;
  bio?: string;
  philosophy_statement?: string;
  philosophyStatement?: string;
  decision_frameworks?: string[];
  decisionFrameworks?: string[];
  mental_models?: string[];
  mentalModels?: string[];
  tags?: string[];
  voice_provider?: 'preset' | 'cloned' | 'none';
  voice_id?: string | null;
  voice_sample_url?: string | null;
  voice_settings?: any;
  direct_chat_enabled?: boolean;
  direct_chat_price?: number;
  direct_chat_sla?: string;
}
