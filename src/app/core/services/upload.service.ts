import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';

export interface UploadResult {
  url: string;
  public_id?: string;
  provider?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private http = inject(HttpClient);

  /**
   * Generic image upload (returns Cloudinary secure_url).
   */
  uploadImage(file: File): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http
      .post<{ success: boolean; data: UploadResult }>(`${API_BASE_URL}/upload/image`, formData)
      .pipe(map((res) => res.data));
  }

  /**
   * Upload dedicated avatar image for user's AI Mind.
   */
  uploadMindAvatar(file: File): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http
      .post<{ success: boolean; data: UploadResult }>(`${API_BASE_URL}/upload/mind-avatar`, formData)
      .pipe(map((res) => res.data));
  }

  /**
   * Upload avatar image for a private character persona.
   */
  uploadCharacterAvatar(characterId: number, file: File): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http
      .post<{ success: boolean; data: UploadResult }>(`${API_BASE_URL}/upload/character-avatar/${characterId}`, formData)
      .pipe(map((res) => res.data));
  }
}
