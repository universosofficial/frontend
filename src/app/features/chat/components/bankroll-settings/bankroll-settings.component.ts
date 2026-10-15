import { Component, inject, OnInit, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SportsService } from '../../../../core/services/sports.service';

@Component({
  selector: 'app-bankroll-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wa-bankroll-drawer-backdrop" (click)="close.emit()">
      <div class="wa-bankroll-drawer" (click)="$event.stopPropagation()">
        <!-- Drawer Header -->
        <div class="wa-bd-header">
          <div class="wa-bd-title-wrap">
            <span class="wa-bd-icon">⚽</span>
            <div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <h3 class="wa-bd-title">Match Forecaster &amp; Options Grill</h3>
                <span class="wa-live-feed-pill">🟢 LIVE FEED</span>
              </div>
              <p class="wa-bd-sub">Powered by live bookmaker odds &amp; current season form</p>
            </div>
          </div>
          <button type="button" class="wa-bd-close-btn" (click)="close.emit()" title="Close">
            &times;
          </button>
        </div>

        <div class="wa-bd-body">
          <!-- STEP 1: PICK A LIVE UPCOMING MATCH OR TYPE ANY MATCH -->
          <div class="wa-bd-card">
            <div class="wa-step-header-row">
              <span class="wa-step-tag">Step 1 • Pick a Live Upcoming Match</span>
              @if (isLoadingMatches()) {
                <span class="wa-mini-status">Fetching live odds...</span>
              }
            </div>

            <!-- League Filter Pills -->
            <div class="wa-league-tabs">
              @for (lg of leagues; track lg) {
                <button
                  type="button"
                  class="wa-league-tab"
                  [class.active]="selectedLeague() === lg"
                  (click)="onSelectLeague(lg)"
                >
                  {{ lg }}
                </button>
              }
            </div>

            <!-- Live Upcoming Matches List from The Odds API -->
            <div class="wa-live-matches-list">
              @for (m of liveMatches(); track m.fixture) {
                <button
                  type="button"
                  class="wa-live-fixture-btn"
                  [class.active]="homeTeam === m.homeTeam && awayTeam === m.awayTeam"
                  (click)="selectLiveFixture(m)"
                >
                  <div class="lf-top">
                    <span class="lf-teams">⚽ {{ m.fixture }}</span>
                    @if (m.day) {
                      <span class="lf-day">{{ m.day }}</span>
                    }
                  </div>
                  @if (m.odds) {
                    <div class="lf-odds">{{ m.odds }}</div>
                  }
                </button>
              }
            </div>

            <div class="wa-vs-inputs">
              <input
                type="text"
                [(ngModel)]="homeTeam"
                (blur)="refreshLivePreview()"
                placeholder="Home Team (e.g. Arsenal)"
                class="wa-bd-input"
              />
              <span class="wa-vs-badge">VS</span>
              <input
                type="text"
                [(ngModel)]="awayTeam"
                (blur)="refreshLivePreview()"
                placeholder="Away Team (e.g. Chelsea)"
                class="wa-bd-input"
              />
            </div>

            <!-- LIVE SNAPSHOT PREVIEW FOR SELECTED MATCH -->
            @if (liveSnapshot(); as snap) {
              <div class="wa-live-snapshot-box">
                <div class="snap-head">
                  <span class="snap-badge">🟢 {{ snap.intel?.liveSourceLabel || 'Live Match Data' }}</span>
                  @if (snap.intel?.homeManager && snap.intel?.awayManager) {
                    <span class="snap-coaches">👔 {{ snap.intel.homeManager }} vs {{ snap.intel.awayManager }}</span>
                  }
                </div>
                @if (snap.intel?.homeFormSummary || snap.intel?.awayFormSummary) {
                  <div class="snap-form-rows">
                    @if (snap.intel?.homeFormSummary) {
                      <div><strong>{{ snap.intel.homeTeam }}:</strong> {{ snap.intel.homeFormSummary }}</div>
                    }
                    @if (snap.intel?.awayFormSummary) {
                      <div><strong>{{ snap.intel.awayTeam }}:</strong> {{ snap.intel.awayFormSummary }}</div>
                    }
                  </div>
                }
                @if (snap.intel?.odds) {
                  <div class="snap-odds-bar">
                    <span>1: <strong>{{ snap.intel.odds.home }}</strong></span>
                    <span>X: <strong>{{ snap.intel.odds.draw }}</strong></span>
                    <span>2: <strong>{{ snap.intel.odds.away }}</strong></span>
                    @if (snap.intel.odds.over25) {
                      <span>O2.5: <strong>{{ snap.intel.odds.over25 }}</strong></span>
                    }
                  </div>
                }
                @if (snap.quant?.safeAccumulator?.selection || snap.quant?.bestValue?.selection) {
                  <div class="snap-angles">
                    @if (snap.quant?.safeAccumulator?.selection) {
                      <span class="snap-safe">🛡️ Safer: <strong>{{ snap.quant.safeAccumulator.selection }}</strong></span>
                    }
                    @if (snap.quant?.bestValue?.selection) {
                      <span class="snap-sweet">🎯 Sweet-Spot: <strong>{{ snap.quant.bestValue.selection }}</strong></span>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- STEP 2: SELECT OPTIONS TO GRILL -->
          <div class="wa-bd-card">
            <span class="wa-step-tag">Step 2 • Your Slip / Options</span>
            <h4 class="wa-card-subhead">What options are you considering?</h4>
            <p class="wa-card-hint">Tap one or more options below so we can grill them against live form &amp; odds:</p>

            <div class="wa-options-grid">
              @for (opt of bettingOptions; track opt) {
                <button
                  type="button"
                  class="wa-opt-chip"
                  [class.selected]="isOptionSelected(opt)"
                  (click)="toggleOption(opt)"
                >
                  {{ isOptionSelected(opt) ? '✅ ' : '' }}{{ opt }}
                </button>
              }
            </div>

            <input
              type="text"
              [(ngModel)]="customOptionNote"
              placeholder="Or type your own angle (e.g. 'Home Win + Over 1.5' or 'BTTS in 1st Half')..."
              class="wa-bd-input"
              style="margin-top: 8px;"
            />
          </div>

          <!-- STEP 3: PUT HEADS TOGETHER (ACTION BUTTONS) -->
          <div class="wa-bd-actions-col">
            <button
              type="button"
              class="wa-btn-grill"
              [disabled]="!hasValidMatch()"
              (click)="onGrillOptions()"
            >
              🔥 Grill My Options &amp; Find the Best Play
            </button>

            <button
              type="button"
              class="wa-btn-forecast"
              [disabled]="!hasValidMatch()"
              (click)="onForecastMatch()"
            >
              🔮 Forecast How This Match Plays Out
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wa-bankroll-drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
    }

    .wa-bankroll-drawer {
      width: 450px;
      max-width: 100vw;
      height: 100%;
      background: var(--wa-bg-panel);
      border-left: 1px solid var(--wa-border);
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 28px rgba(0, 0, 0, 0.28);
      animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .wa-bd-header {
      padding: 14px 18px;
      background: var(--wa-bg-header);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--wa-border);

      .wa-bd-title-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .wa-bd-icon {
        font-size: 22px;
      }

      .wa-bd-title {
        font-size: 14.5px;
        font-weight: 700;
        color: var(--wa-text-primary);
        margin: 0;
      }

      .wa-live-feed-pill {
        font-size: 9.5px;
        font-weight: 800;
        color: #10b981;
        background: rgba(16, 185, 129, 0.14);
        border: 1px solid rgba(16, 185, 129, 0.35);
        padding: 2px 6px;
        border-radius: 999px;
        letter-spacing: 0.3px;
      }

      .wa-bd-sub {
        font-size: 11px;
        color: var(--wa-text-secondary);
        margin: 2px 0 0 0;
      }

      .wa-bd-close-btn {
        background: transparent;
        border: none;
        color: var(--wa-text-secondary);
        font-size: 26px;
        cursor: pointer;
        line-height: 1;

        &:hover { color: var(--wa-text-primary); }
      }
    }

    .wa-bd-body {
      padding: 14px 18px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .wa-bd-card {
      background: var(--wa-bg-input);
      border: 1px solid var(--wa-border);
      border-radius: 14px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .wa-step-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .wa-step-tag {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--wa-teal);
    }

    .wa-mini-status {
      font-size: 10.5px;
      color: var(--wa-text-secondary);
    }

    .wa-league-tabs {
      display: flex;
      gap: 5px;
      overflow-x: auto;
      padding-bottom: 2px;
    }

    .wa-league-tab {
      background: var(--wa-bg-panel);
      border: 1px solid var(--wa-border);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      color: var(--wa-text-secondary);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;

      &.active, &:hover {
        border-color: var(--wa-teal);
        color: var(--wa-teal);
        background: rgba(16, 185, 129, 0.1);
      }
    }

    .wa-live-matches-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
      max-height: 165px;
      overflow-y: auto;
      padding-right: 2px;
    }

    .wa-live-fixture-btn {
      background: var(--wa-bg-panel);
      border: 1px solid var(--wa-border);
      border-radius: 9px;
      padding: 7px 10px;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      flex-direction: column;
      gap: 3px;

      &:hover, &.active {
        border-color: var(--wa-teal);
        background: rgba(16, 185, 129, 0.08);
      }

      .lf-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }

      .lf-teams {
        font-size: 12.5px;
        font-weight: 700;
        color: var(--wa-text-primary);
      }

      .lf-day {
        font-size: 10px;
        font-weight: 600;
        color: var(--wa-teal);
        background: rgba(16, 185, 129, 0.12);
        padding: 1px 6px;
        border-radius: 999px;
      }

      .lf-odds {
        font-size: 10.5px;
        color: var(--wa-text-secondary);
      }
    }

    .wa-live-snapshot-box {
      background: rgba(16, 185, 129, 0.06);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 10px;
      padding: 9px 11px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-top: 2px;

      .snap-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 4px;
      }

      .snap-badge {
        font-size: 10px;
        font-weight: 700;
        color: #10b981;
      }

      .snap-coaches {
        font-size: 10.5px;
        color: var(--wa-text-secondary);
      }

      .snap-form-rows {
        font-size: 11px;
        color: var(--wa-text-primary);
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .snap-odds-bar {
        display: flex;
        gap: 10px;
        font-size: 11px;
        color: var(--wa-text-secondary);
        background: var(--wa-bg-panel);
        padding: 4px 8px;
        border-radius: 6px;

        strong {
          color: var(--wa-text-primary);
        }
      }

      .snap-angles {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 11px;

        .snap-safe { color: #10b981; }
        .snap-sweet { color: #f59e0b; }
      }
    }

    .wa-card-subhead {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--wa-text-primary);
      margin: 0;
    }

    .wa-card-hint {
      font-size: 11.5px;
      color: var(--wa-text-secondary);
      margin: 0;
    }

    .wa-vs-inputs {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .wa-vs-badge {
      font-size: 11px;
      font-weight: 800;
      color: var(--wa-text-secondary);
      flex-shrink: 0;
    }

    .wa-bd-input {
      width: 100%;
      background: var(--wa-bg-panel);
      border: 1px solid var(--wa-border);
      border-radius: 8px;
      padding: 7px 10px;
      color: var(--wa-text-primary);
      font-size: 12.5px;
      outline: none;

      &:focus {
        border-color: var(--wa-teal);
      }
    }

    .wa-options-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .wa-opt-chip {
      background: var(--wa-bg-panel);
      border: 1px solid var(--wa-border);
      border-radius: 999px;
      padding: 5px 11px;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--wa-text-primary);
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--wa-teal);
      }

      &.selected {
        background: rgba(16, 185, 129, 0.15);
        border-color: var(--wa-teal);
        color: var(--wa-teal);
        font-weight: 600;
      }
    }

    .wa-bd-actions-col {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 2px;
    }

    .wa-btn-grill {
      width: 100%;
      padding: 11px 16px;
      background: var(--wa-teal);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        filter: brightness(1.06);
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .wa-btn-forecast {
      width: 100%;
      padding: 9px 16px;
      background: var(--wa-bg-input);
      color: var(--wa-text-primary);
      border: 1px solid var(--wa-border);
      border-radius: 10px;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        border-color: var(--wa-teal);
        color: var(--wa-teal);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  `]
})
export class BankrollSettingsComponent implements OnInit {
  private sportsService = inject(SportsService);

  @Output() close = new EventEmitter<void>();
  @Output() bankrollUpdated = new EventEmitter<any>();
  @Output() telemetryUpdated = new EventEmitter<any>();
  @Output() launchPrompt = new EventEmitter<string>();

  leagues = ['Premier League', 'Champions League', 'La Liga', 'Serie A', 'Bundesliga'];
  selectedLeague = signal<string>('Premier League');
  liveMatches = signal<any[]>([]);
  isLoadingMatches = signal<boolean>(false);
  liveSnapshot = signal<any | null>(null);

  homeTeam = 'Everton';
  awayTeam = 'Chelsea';
  customOptionNote = '';
  selectedOptions = signal<string[]>(['Away or Draw (X2)', 'Over 1.5 Goals']);

  bettingOptions = [
    'Home Win',
    'Draw',
    'Away Win',
    'Home or Draw (1X)',
    'Away or Draw (X2)',
    'Draw No Bet',
    'Over 1.5 Goals',
    'Over 2.5 Goals',
    'Under 2.5 Goals',
    'Both Teams to Score (BTTS)',
  ];

  ngOnInit(): void {
    this.loadLeagueMatches('Premier League');
  }

  onSelectLeague(league: string): void {
    this.selectedLeague.set(league);
    this.loadLeagueMatches(league);
  }

  loadLeagueMatches(league: string): void {
    this.isLoadingMatches.set(true);
    this.sportsService.getUpcomingMatches(league).subscribe({
      next: (matches) => {
        this.isLoadingMatches.set(false);
        this.liveMatches.set(matches || []);
        if (matches && matches.length > 0) {
          this.homeTeam = matches[0].homeTeam;
          this.awayTeam = matches[0].awayTeam;
          this.refreshLivePreview();
        }
      },
      error: () => {
        this.isLoadingMatches.set(false);
      },
    });
  }

  selectLiveFixture(m: any): void {
    this.homeTeam = m.homeTeam;
    this.awayTeam = m.awayTeam;
    this.refreshLivePreview();
  }

  refreshLivePreview(): void {
    if (!this.hasValidMatch()) return;
    this.sportsService.previewFixture(this.homeTeam.trim(), this.awayTeam.trim()).subscribe({
      next: (data) => {
        this.liveSnapshot.set(data);
      },
      error: () => {},
    });
  }

  isOptionSelected(opt: string): boolean {
    return this.selectedOptions().includes(opt);
  }

  toggleOption(opt: string): void {
    const current = this.selectedOptions();
    if (current.includes(opt)) {
      this.selectedOptions.set(current.filter((o) => o !== opt));
    } else {
      this.selectedOptions.set([...current, opt]);
    }
  }

  hasValidMatch(): boolean {
    return Boolean(this.homeTeam.trim() && this.awayTeam.trim());
  }

  onForecastMatch(): void {
    if (!this.hasValidMatch()) return;
    const matchStr = `${this.homeTeam.trim()} vs ${this.awayTeam.trim()}`;
    const prompt = `Let's forecast ${matchStr} using the latest form and live odds. How do you see the match playing out on the pitch, and what are the safest and smartest options for this game?`;
    this.launchPrompt.emit(prompt);
    this.close.emit();
  }

  onGrillOptions(): void {
    if (!this.hasValidMatch()) return;
    const matchStr = `${this.homeTeam.trim()} vs ${this.awayTeam.trim()}`;
    const chosen = [...this.selectedOptions()];
    if (this.customOptionNote.trim()) {
      chosen.push(this.customOptionNote.trim());
    }
    const optionsText = chosen.length > 0 ? chosen.join(' + ') : 'Win or Goals market';
    const prompt = `For ${matchStr}, I'm thinking of playing: [${optionsText}]. Let's put heads together and grill this option against the live odds and recent form—what could go wrong with it, and is there a safer or smarter way to play this match?`;
    this.launchPrompt.emit(prompt);
    this.close.emit();
  }
}
