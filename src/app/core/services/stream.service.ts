import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../constants/api.constants';

export interface StreamChatParams {
  conversationId: number;
  characterId: number;
  content: string;
  conversationMode?: string;
  onChunk: (chunk: string) => void;
  onDone: (result: any) => void;
  onError?: (error: any) => void;
  signal?: AbortSignal;
}

@Injectable({
  providedIn: 'root',
})
export class StreamService {
  private authService = inject(AuthService);

  /**
   * Connect to Server-Sent Events (SSE) chat stream and read chunks incrementally.
   */
  async streamChat({
    conversationId,
    characterId,
    content,
    conversationMode,
    onChunk,
    onDone,
    onError,
    signal,
  }: StreamChatParams): Promise<void> {
    const token = this.authService.token();

    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          conversationId,
          characterId,
          content,
          conversationMode: conversationMode || 'default',
        }),
        signal,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || `HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body reader is unavailable.');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Retain the last incomplete chunk in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.replace(/^data:\s*/, '');
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.error) {
              if (onError) onError(data.error);
              return;
            }

            if (data.chunk) {
              onChunk(data.chunk);
            }

            if (data.done) {
              onDone(data);
              return;
            }
          } catch (parseError) {
            console.warn('[SSE PARSE ERROR]', parseError, jsonStr);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[SSE STREAM ABORTED BY USER]');
        return;
      }
      if (onError) {
        onError(err);
      } else {
        console.error('[SSE STREAM ERROR]', err);
      }
    }
  }
}
