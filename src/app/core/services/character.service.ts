import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Character, CreateCharacterDto } from '../models/character.model';
import { ApiResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class CharacterService {
  private http = inject(HttpClient);
  private readonly API_URL = 'https://aicompanion-production-12db.up.railway.app/api/characters';

  readonly characters = signal<Character[]>([]);
  readonly selectedCharacter = signal<Character | null>(null);
  readonly isLoading = signal<boolean>(false);

  /**
   * Fetch all characters accessible to current user
   */
  getCharacters(): Observable<ApiResponse<Character[]>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<Character[]>>(this.API_URL).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.data) {
          this.characters.set(res.data);
        }
      })
    );
  }

  /**
   * Fetch a single character by ID
   */
  getCharacterById(id: number): Observable<ApiResponse<Character>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<Character>>(`${this.API_URL}/${id}`).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.data) {
          this.selectedCharacter.set(res.data);
        }
      })
    );
  }

  /**
   * Create a new custom character persona
   */
  createCharacter(dto: CreateCharacterDto): Observable<ApiResponse<Character>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<Character>>(this.API_URL, dto).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.data) {
          this.characters.update((prev) => [res.data!, ...prev]);
        }
      })
    );
  }

  /**
   * Update an existing character persona
   */
  updateCharacter(id: number, dto: Partial<CreateCharacterDto>): Observable<ApiResponse<Character>> {
    this.isLoading.set(true);
    return this.http.put<ApiResponse<Character>>(`${this.API_URL}/${id}`, dto).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.data) {
          this.characters.update((prev) =>
            prev.map((c) => (c.id === id ? res.data! : c))
          );
          if (this.selectedCharacter()?.id === id) {
            this.selectedCharacter.set(res.data);
          }
        }
      })
    );
  }

  /**
   * Delete a custom character persona
   */
  deleteCharacter(id: number): Observable<ApiResponse<void>> {
    this.isLoading.set(true);
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`).pipe(
      tap(() => {
        this.isLoading.set(false);
        this.characters.update((prev) => prev.filter((c) => c.id !== id));
        if (this.selectedCharacter()?.id === id) {
          this.selectedCharacter.set(null);
        }
      })
    );
  }
}
