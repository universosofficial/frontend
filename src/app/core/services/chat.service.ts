import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Conversation, Message, Character, ChatTurnResponse } from '../models/character.model';
import { ApiResponse } from '../models/user.model';
import { API_BASE_URL } from '../constants/api.constants';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private readonly API_URL = `${API_BASE_URL}/chat`;

  readonly activeConversation = signal<Conversation | null>(null);
  readonly activeCharacter = signal<Character | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly isSending = signal<boolean>(false);
  readonly isLoadingMessages = signal<boolean>(false);
  readonly lastMessageMap = signal<Map<string, { content: string; sender_type: string; created_at: string }>>(new Map());

  /**
   * Update the latest message for a character in real time
   */
  updateLastMessage(
    characterIdOrHandle: number | string,
    content: string,
    senderType: 'user' | 'assistant' = 'user'
  ): void {
    if (!characterIdOrHandle) return;
    const key = String(characterIdOrHandle).replace(/^@/, '');
    this.lastMessageMap.update((prev) => {
      const next = new Map(prev);
      next.set(key, {
        content,
        sender_type: senderType,
        created_at: new Date().toISOString(),
      });
      return next;
    });
  }

  /**
   * Start or resume a conversation with a companion
   */
  startConversation(characterId: number): Observable<ApiResponse<{ conversation: Conversation; character: Character; messages: Message[]; isNew: boolean }>> {
    this.isLoadingMessages.set(true);
    return this.http.post<ApiResponse<{ conversation: Conversation; character: Character; messages: Message[]; isNew: boolean }>>(
      `${this.API_URL}/conversations`,
      { characterId }
    ).pipe(
      tap((res) => {
        this.isLoadingMessages.set(false);
        if (res.data) {
          this.activeConversation.set(res.data.conversation);
          this.activeCharacter.set(res.data.character);
          const msgs = res.data.messages || [];
          this.messages.set(msgs);
          if (msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            this.updateLastMessage(characterId, last.content, (last.sender_type as any) || 'assistant');
          }
        }
      }),
      catchError((err) => {
        this.isLoadingMessages.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Load messages history for an active conversation
   */
  loadMessages(conversationId: number): Observable<ApiResponse<Message[]>> {
    this.isLoadingMessages.set(true);
    return this.http.get<ApiResponse<Message[]>>(`${this.API_URL}/conversations/${conversationId}/messages`).pipe(
      tap((res) => {
        this.isLoadingMessages.set(false);
        if (res.data) {
          this.messages.set(res.data);
          const char = this.activeCharacter();
          if (char && res.data.length > 0) {
            const last = res.data[res.data.length - 1];
            this.updateLastMessage(char.handle || char.id, last.content, (last.sender_type as any) || 'assistant');
          }
        }
      }),
      catchError((err) => {
        this.isLoadingMessages.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Send a user message and receive the companion's response
   */
  sendMessage(conversationId: number, characterId: number, content: string): Observable<ApiResponse<ChatTurnResponse>> {
    this.isSending.set(true);
    this.updateLastMessage(characterId, content, 'user');

    // Optimistically append user message to local message stream
    const tempUserMessage: Message = {
      id: Date.now(),
      conversation_id: conversationId,
      sender_type: 'user',
      content,
      token_count: Math.ceil(content.length / 4),
      created_at: new Date().toISOString(),
    };
    this.messages.update((prev) => [...prev, tempUserMessage]);

    return this.http.post<ApiResponse<ChatTurnResponse>>(`${this.API_URL}/message`, {
      conversationId,
      characterId,
      content,
    }).pipe(
      tap((res) => {
        this.isSending.set(false);
        if (res.data) {
          // Replace optimistic message and append assistant response
          this.messages.update((prev) => {
            const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
            return [...filtered, res.data!.userMessage, res.data!.assistantMessage];
          });
          this.updateLastMessage(characterId, res.data.assistantMessage.content, 'assistant');
        }
      }),
      catchError((err) => {
        this.isSending.set(false);
        // Remove optimistic message if failure occurs
        this.messages.update((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
        return throwError(() => err);
      })
    );
  }

  /**
   * Edit a user message's content
   */
  editMessage(messageId: number, content: string): Observable<ApiResponse<Message>> {
    return this.http.patch<ApiResponse<Message>>(`${this.API_URL}/messages/${messageId}`, { content }).pipe(
      tap((res) => {
        if (res.data) {
          const updated = res.data;
          this.messages.update((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, ...updated, is_edited: true } : m))
          );
        }
      })
    );
  }

  /**
   * Delete a message by ID from conversation
   */
  deleteMessage(messageId: number): Observable<ApiResponse<{ id: number; conversationId: number; deleted: boolean }>> {
    return this.http.delete<ApiResponse<{ id: number; conversationId: number; deleted: boolean }>>(
      `${this.API_URL}/messages/${messageId}`
    ).pipe(
      tap((res) => {
        if (res.data?.deleted) {
          this.messages.update((prev) => prev.filter((m) => m.id !== messageId));
        }
      })
    );
  }

  /**
   * Reset active chat state
   */
  clearChat(): void {
    this.activeConversation.set(null);
    this.activeCharacter.set(null);
    this.messages.set([]);
  }
}
