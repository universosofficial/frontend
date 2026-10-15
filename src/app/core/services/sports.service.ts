import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { SportsBankrollSettings, SportsTelemetry } from '../models/character.model';

@Injectable({
  providedIn: 'root',
})
export class SportsService {
  private http = inject(HttpClient);
  private apiUrl = 'https://aicompanion-production-12db.up.railway.app/api/sports';

  getBankroll(): Observable<{ bankroll: SportsBankrollSettings; telemetry: SportsTelemetry }> {
    return this.http.get<{ success: boolean; data: { bankroll: SportsBankrollSettings; telemetry: SportsTelemetry } }>(
      `${this.apiUrl}/bankroll`
    ).pipe(map((res) => res.data));
  }

  updateBankroll(settings: Partial<SportsBankrollSettings>): Observable<SportsBankrollSettings> {
    return this.http.put<{ success: boolean; data: SportsBankrollSettings }>(
      `${this.apiUrl}/bankroll`,
      settings
    ).pipe(map((res) => res.data));
  }

  resetTilt(): Observable<SportsTelemetry> {
    return this.http.post<{ success: boolean; data: SportsTelemetry }>(
      `${this.apiUrl}/reset-tilt`,
      {}
    ).pipe(map((res) => res.data));
  }

  simulateTilt(losses = 3): Observable<SportsTelemetry> {
    return this.http.post<{ success: boolean; data: SportsTelemetry }>(
      `${this.apiUrl}/simulate-tilt`,
      { losses }
    ).pipe(map((res) => res.data));
  }

  getLedger(limit = 20): Observable<any[]> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.apiUrl}/ledger?limit=${limit}`
    ).pipe(map((res) => res.data));
  }

  getUpcomingMatches(league = 'Premier League'): Observable<any[]> {
    return this.http.get<{ success: boolean; data: any[] }>(
      `${this.apiUrl}/upcoming-matches?league=${encodeURIComponent(league)}`
    ).pipe(map((res) => res.data || []));
  }

  previewFixture(homeTeam: string, awayTeam: string): Observable<any> {
    return this.http.post<{ success: boolean; data: any }>(
      `${this.apiUrl}/preview-fixture`,
      { homeTeam, awayTeam }
    ).pipe(map((res) => res.data));
  }
}
