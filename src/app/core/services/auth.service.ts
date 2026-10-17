import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { User, AuthResponse, AuthInitResponse, ApiResponse } from '../models/user.model';
import { API_BASE_URL } from '../constants/api.constants';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Angular Signals for reactive state management
  readonly currentUser = signal<User | null>(null);
  readonly token = signal<string | null>(this.getStoredToken());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isLoading = signal<boolean>(false);

  private readonly API_PREFIX = `${API_BASE_URL}/auth`;

  constructor() {
    // If token exists on app initialization, automatically hydrate the user session
    if (this.token()) {
      this.restoreSession();
    }
  }

  /**
   * Register a new user account (initiates Resend OTP email verification)
   */
  register(credentials: { email: string; password: string }): Observable<ApiResponse<AuthInitResponse>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<AuthInitResponse>>(`${this.API_PREFIX}/register`, credentials).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.data?.accessToken && res.data?.user) {
          this.setSession(res.data as AuthResponse);
        }
      }),
      catchError((err) => {
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Verify registration email with 6-digit OTP code
   */
  verifyEmail(payload: { email: string; code: string }): Observable<ApiResponse<AuthResponse>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_PREFIX}/verify-email`, payload).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.data?.accessToken && res.data?.user) {
          this.setSession(res.data);
        }
      }),
      catchError((err) => {
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Resend account registration verification code
   */
  resendVerification(email: string): Observable<ApiResponse<{ email: string }>> {
    return this.http.post<ApiResponse<{ email: string }>>(`${this.API_PREFIX}/resend-verification`, { email });
  }

  /**
   * Log in with existing credentials (sends 2FA login verification code if verified)
   */
  login(credentials: { email: string; password: string }): Observable<ApiResponse<AuthInitResponse>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<AuthInitResponse>>(`${this.API_PREFIX}/login`, credentials).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.data?.accessToken && res.data?.user) {
          this.setSession(res.data as AuthResponse);
        }
      }),
      catchError((err) => {
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Verify 2FA login code
   */
  verifyLoginCode(payload: { email: string; code: string }): Observable<ApiResponse<AuthResponse>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_PREFIX}/verify-login-code`, payload).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.data?.accessToken && res.data?.user) {
          this.setSession(res.data);
        }
      }),
      catchError((err) => {
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Resend 2FA login code
   */
  resendLoginCode(email: string): Observable<ApiResponse<{ email: string }>> {
    return this.http.post<ApiResponse<{ email: string }>>(`${this.API_PREFIX}/resend-login-code`, { email });
  }

  /**
   * Initiate password recovery (sends reset OTP code via Resend)
   */
  forgotPassword(email: string): Observable<ApiResponse<{ email: string; expiresInMinutes?: number }>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<{ email: string; expiresInMinutes?: number }>>(`${this.API_PREFIX}/forgot-password`, { email }).pipe(
      tap(() => this.isLoading.set(false)),
      catchError((err) => {
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Reset password with verification code and new password
   */
  resetPassword(payload: { email: string; code: string; newPassword: string }): Observable<ApiResponse<any>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<any>>(`${this.API_PREFIX}/reset-password`, payload).pipe(
      tap(() => this.isLoading.set(false)),
      catchError((err) => {
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Fetch current authenticated user profile
   */
  getMe(): Observable<ApiResponse<{ user: User }>> {
    return this.http.get<ApiResponse<{ user: User }>>(`${this.API_PREFIX}/me`).pipe(
      tap((res) => {
        if (res.data?.user) {
          this.currentUser.set(res.data.user);
        }
      })
    );
  }

  /**
   * Update profile information (display_name, avatar_url, bio, phone, location)
   */
  updateProfile(profileData: {
    display_name?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    phone?: string | null;
    location?: string | null;
  }): Observable<ApiResponse<{ user: User }>> {
    return this.http.put<ApiResponse<{ user: User }>>(`${this.API_PREFIX}/profile`, profileData).pipe(
      tap((res) => {
        if (res.data?.user) {
          this.currentUser.set(res.data.user);
        }
      })
    );
  }

  /**
   * Change account password
   */
  changePassword(passwords: { currentPassword: string; newPassword: string }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_PREFIX}/change-password`, passwords);
  }

  /**
   * Upload user avatar
   */
  uploadAvatar(file: File): Observable<ApiResponse<{ url: string; user?: User }>> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<ApiResponse<{ url: string; user?: User }>>(`${API_BASE_URL}/upload/user-avatar`, formData).pipe(
      tap((res) => {
        if (res.data?.user) {
          this.currentUser.set(res.data.user);
        } else if (res.data?.url && this.currentUser()) {
          this.currentUser.set({
            ...this.currentUser()!,
            avatar_url: res.data.url,
          });
        }
      })
    );
  }

  /**
   * Refresh the access token using the stored refresh token
   */
  refreshToken(): Observable<ApiResponse<{ accessToken: string }>> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<ApiResponse<{ accessToken: string }>>(`${this.API_PREFIX}/refresh`, { refreshToken }).pipe(
      tap((res) => {
        if (res.data?.accessToken) {
          localStorage.setItem('access_token', res.data.accessToken);
          this.token.set(res.data.accessToken);
        }
      }),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  /**
   * Terminate session and navigate to login
   */
  logout(): void {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      this.http.post(`${this.API_PREFIX}/logout`, { refreshToken }).subscribe({
        error: () => {}, // silent fail on server logout notification
      });
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  /**
   * Helper: save tokens and set reactive state
   */
  public setSession(authData: AuthResponse): void {
    localStorage.setItem('access_token', authData.accessToken);
    localStorage.setItem('refresh_token', authData.refreshToken);
    this.token.set(authData.accessToken);
    this.currentUser.set(authData.user);
  }

  /**
   * Helper: retrieve token safely from localStorage
   */
  private getStoredToken(): string | null {
    try {
      return localStorage.getItem('access_token');
    } catch {
      return null;
    }
  }

  /**
   * Hydrate user session from stored access token
   */
  private restoreSession(): void {
    this.isLoading.set(true);
    this.getMe().subscribe({
      next: () => this.isLoading.set(false),
      error: () => {
        // If current token is expired, attempt refresh
        this.refreshToken().subscribe({
          next: () => {
            this.getMe().subscribe({
              complete: () => this.isLoading.set(false),
            });
          },
          error: () => {
            this.logout();
            this.isLoading.set(false);
          },
        });
      },
    });
  }
}
