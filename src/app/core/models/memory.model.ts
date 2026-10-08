export type MemoryCategory = 'preference' | 'fact' | 'relationship' | 'goal' | 'event';
export type MemoryType = 'persona_anchor' | 'user_fact' | 'shared_event' | 'emotional_state';

export interface Memory {
  id: number;
  user_id: number;
  character_id: number | null;
  conversation_id?: number | null;
  category: MemoryCategory;
  memory_type?: MemoryType;
  content: string;
  importance_score: number;
  occurred_at?: string;
  conversation_date?: string;
  temporal_anchor?: string;
  relative_time?: string;
  last_recalled_at: string | null;
  created_at: string;
}
