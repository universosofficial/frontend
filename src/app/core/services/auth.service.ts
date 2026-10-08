import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { User, AuthResponse, ApiResponse } from '../models/user.model';

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

  private readonly API_PREFIX = 'https://aicompanion-production-12db.up.railway.app/api/auth';

  constructor() {
    // If token exists on app initialization, automatically hydrate the user session
    if (this.token()) {
      this.restoreSession();
    }
  }

  /**
   * Register a new user account
   */
  register(credentials: { email: string; password: string }): Observable<ApiResponse<AuthResponse>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_PREFIX}/register`, credentials).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.data) {
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
   * Log in with existing credentials
   */
  login(credentials: { email: string; password: string }): Observable<ApiResponse<AuthResponse>> {
    this.isLoading.set(true);
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_PREFIX}/login`, credentials).pipe(
      tap((res) => {
        this.isLoading.set(false);
        if (res.data) {
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
  private setSession(authData: AuthResponse): void {
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
