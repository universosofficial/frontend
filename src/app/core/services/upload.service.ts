import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

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
      .post<{ success: boolean; data: UploadResult }>('https://aicompanion-production-12db.up.railway.app/api/upload/image', formData)
      .pipe(map((res) => res.data));
  }

  /**
   * Upload dedicated avatar image for user's AI Mind.
   */
  uploadMindAvatar(file: File): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http
      .post<{ success: boolean; data: UploadResult }>('https://aicompanion-production-12db.up.railway.app/api/upload/mind-avatar', formData)
      .pipe(map((res) => res.data));
  }

  /**
   * Upload avatar image for a private character persona.
   */
  uploadCharacterAvatar(characterId: number, file: File): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http
      .post<{ success: boolean; data: UploadResult }>(`https://aicompanion-production-12db.up.railway.app/api/upload/character-avatar/${characterId}`, formData)
      .pipe(map((res) => res.data));
  }
}
