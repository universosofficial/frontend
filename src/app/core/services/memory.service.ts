import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Memory } from '../models/memory.model';
import { ApiResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class MemoryService {
  private http = inject(HttpClient);
  private readonly API_URL = 'https://aicompanion-production-12db.up.railway.app/api/memories';

  readonly memories = signal<Memory[]>([]);
  readonly isLoading = signal<boolean>(false);

  /**
   * Fetch all memories associated with user and companion
   */
  getMemories(characterId: number): Observable<ApiResponse<Memory[]>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<Memory[]>>(`${this.API_URL}/${characterId}`).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.data) {
          this.memories.set(res.data);
        }
      })
    );
  }

  /**
   * Directly teach / add a memory item for a companion
   */
  createMemory(
    characterId: number,
    payload: { content: string; category?: string; memoryType?: string; importanceScore?: number }
  ): Observable<ApiResponse<Memory>> {
    return this.http.post<ApiResponse<Memory>>(`${this.API_URL}/${characterId}`, payload).pipe(
      tap((res) => {
        if (res.data) {
          this.memories.update((prev) => [res.data!, ...prev]);
        }
      })
    );
  }

  /**
   * Edit / update an existing memory item
   */
  updateMemory(
    id: number,
    payload: { content?: string; category?: string; importanceScore?: number }
  ): Observable<ApiResponse<Memory>> {
    return this.http.put<ApiResponse<Memory>>(`${this.API_URL}/${id}`, payload).pipe(
      tap((res) => {
        if (res.data) {
          this.memories.update((prev) => prev.map((m) => (m.id === id ? res.data! : m)));
        }
      })
    );
  }

  /**
   * Forget / delete a specific memory item
   */
  deleteMemory(id: number): Observable<ApiResponse<void>> {
    this.isLoading.set(true);
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`).pipe(
      tap(() => {
        this.isLoading.set(false);
        this.memories.update((prev) => prev.filter((m) => m.id !== id));
      })
    );
  }
}
