import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { PublicMind, MindExploreResult, MindSource, MindPublishDto, UserMind } from '../models/mind.model';

export interface StreamConsultationParams {
  handle?: string;
  characterId?: number;
  mindId?: number;
  content: string;
  conversationId?: number;
  sessionId?: number;
  history?: Array<{ sender_type?: string; role?: string; content: string }>;
  onGrounded?: (data: { groundedChunksCount: number; groundedSources: any[] }) => void;
  onChunk: (chunk: string) => void;
  onDone: (result: any) => void;
  onError?: (error: any) => void;
  signal?: AbortSignal;
}

@Injectable({
  providedIn: 'root',
})
export class MindService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // ==========================================
  // 1. My AI Mind (1:1 Creator Management)
  // ==========================================

  /**
   * Fetch authenticated user's single AI Mind profile and active sources.
   */
  getMyMind(): Observable<UserMind> {
    return this.http
      .get<{ success: boolean; data: UserMind }>('https://aicompanion-production-12db.up.railway.app/api/my-mind')
      .pipe(map((res) => res.data));
  }

  /**
   * Update the user's AI Mind profile (handle, headline, bio, philosophy, frameworks, publish toggle).
   */
  updateMyMind(dto: Partial<UserMind>): Observable<UserMind> {
    return this.http
      .put<{ success: boolean; message: string; data: UserMind }>('https://aicompanion-production-12db.up.railway.app/api/my-mind', dto)
      .pipe(map((res) => res.data));
  }

  /**
   * Link personal website or article URL for background ingestion into user's Mind.
   */
  ingestMyMindUrl(url: string, title?: string, topic?: string): Observable<MindSource> {
    return this.http
      .post<{ success: boolean; data: { source: MindSource; chunksCreated: number } }>(
        'https://aicompanion-production-12db.up.railway.app/api/my-mind/sources/url',
        { url, title, topic }
      )
      .pipe(map((res) => res.data.source || (res.data as any)));
  }

  /**
   * Upload document file (.pdf, .txt, .md) for ingestion into user's Mind.
   */
  ingestMyMindFile(file: File, title?: string, topic?: string): Observable<MindSource> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (topic) formData.append('topic', topic);

    return this.http
      .post<{ success: boolean; data: { source: MindSource; chunksCreated: number } }>(
        'https://aicompanion-production-12db.up.railway.app/api/my-mind/sources/file',
        formData
      )
      .pipe(map((res) => res.data.source || (res.data as any)));
  }

  /**
   * Ingest raw text note / doctrine directly into user's Mind.
   */
  ingestMyMindText(title: string, content: string, topic?: string): Observable<MindSource> {
    return this.http
      .post<{ success: boolean; data: { source: MindSource; chunksCreated: number } }>(
        'https://aicompanion-production-12db.up.railway.app/api/my-mind/sources/text',
        { title, content, topic }
      )
      .pipe(map((res) => res.data.source || (res.data as any)));
  }

  /**
   * Delete an ingestion source and its indexed chunks from user's Mind.
   */
  deleteMyMindSource(sourceId: number): Observable<void> {
    return this.http
      .delete<{ success: boolean; message: string }>(`https://aicompanion-production-12db.up.railway.app/api/my-mind/sources/${sourceId}`)
      .pipe(map(() => void 0));
  }

  // ==========================================
  // 2. Public Minds Discovery & Exploration
  // ==========================================

  /**
   * Search and filter public minds in the Mind Discovery Hub.
   */
  exploreMinds(params: {
    query?: string;
    tag?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Observable<MindExploreResult> {
    let httpParams = new HttpParams();
    if (params.query) httpParams = httpParams.set('query', params.query);
    if (params.tag) httpParams = httpParams.set('tag', params.tag);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http
      .get<{ success: boolean; data: MindExploreResult }>('https://aicompanion-production-12db.up.railway.app/api/minds/explore', { params: httpParams })
      .pipe(map((res) => res.data));
  }

  /**
   * Fetch public mind profile by unique handle.
   */
  getMindByHandle(handle: string): Observable<PublicMind> {
    const cleanHandle = handle.replace(/^@/, '');
    return this.http
      .get<{ success: boolean; data: PublicMind }>(`https://aicompanion-production-12db.up.railway.app/api/minds/@${cleanHandle}`)
      .pipe(map((res) => res.data));
  }

  /**
   * Real-time streaming consultation turn with a Public AI Mind over SSE.
   */
  async streamConsultation({
    handle,
    characterId,
    mindId,
    content,
    conversationId,
    sessionId,
    history,
    onGrounded,
    onChunk,
    onDone,
    onError,
    signal,
  }: StreamConsultationParams): Promise<void> {
    const cleanHandle = handle ? handle.replace(/^@/, '') : null;
    const endpoint = cleanHandle
      ? `https://aicompanion-production-12db.up.railway.app/api/minds/@${cleanHandle}/consult`
      : `https://aicompanion-production-12db.up.railway.app/api/minds/${mindId || characterId}/consult`;

    const token = this.authService.token();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: content, sessionId: sessionId || conversationId, history }),
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
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const jsonStr = trimmed.replace(/^data:\s*/, '');
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.groundedChunksCount !== undefined && onGrounded) {
              onGrounded({
                groundedChunksCount: data.groundedChunksCount,
                groundedSources: data.groundedSources || [],
              });
            }

            if (data.token) {
              onChunk(data.token);
            } else if (data.chunk) {
              onChunk(data.chunk);
            }

            if (data.fullResponse !== undefined || data.done) {
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
        return;
      }
      if (onError) {
        onError(err);
      } else {
        console.error('[MIND STREAM ERROR]', err);
      }
    }
  }

  // Backward-compatibility stubs
  publishMind(characterId: number, dto: MindPublishDto): Observable<any> {
    return this.http.put<{ success: boolean; data: any }>(`https://aicompanion-production-12db.up.railway.app/api/characters/${characterId}`, dto).pipe(map((r) => r.data));
  }

  getSources(characterId: number): Observable<MindSource[]> {
    return this.getMyMind().pipe(map((m) => m.sources || []));
  }

  ingestDocument(characterId: number, file: File, title?: string): Observable<MindSource> {
    return this.ingestMyMindFile(file, title);
  }

  ingestText(characterId: number, title: string, content: string): Observable<MindSource> {
    return this.ingestMyMindText(title, content);
  }

  deleteSource(characterId: number, sourceId: number): Observable<void> {
    return this.deleteMyMindSource(sourceId);
  }

  ingestUrl(characterId: number, url: string, title?: string): Observable<MindSource> {
    return this.ingestMyMindUrl(url, title);
  }

  ingestFile(characterId: number, file: File, title?: string): Observable<MindSource> {
    return this.ingestMyMindFile(file, title);
  }

  subscribeMind(characterId: number) {
    return this.http.post<{ success: boolean; is_subscribed: boolean; message: string }>(
      `https://aicompanion-production-12db.up.railway.app/api/characters/${characterId}`,
      {}
    );
  }

  unsubscribeMind(characterId: number) {
    return this.http.delete<{ success: boolean; is_subscribed: boolean; message: string }>(
      `https://aicompanion-production-12db.up.railway.app/api/characters/${characterId}`,
      {}
    );
  }

  getSubscriptions() {
    return this.http.get<{ success: boolean; data: any }>('https://aicompanion-production-12db.up.railway.app/api/minds/explore').pipe(map((r) => r.data?.minds || []));
  }
}
