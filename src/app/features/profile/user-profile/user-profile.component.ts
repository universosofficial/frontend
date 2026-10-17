import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { MindService } from '../../../core/services/mind.service';
import { CharacterService } from '../../../core/services/character.service';
import { User } from '../../../core/models/user.model';
import { UserMind } from '../../../core/models/mind.model';
import { TOKEN_NAME, TOKEN_SYMBOL, formatTokens } from '../../../core/constants/token.constants';

export interface AvatarPreset {
  name: string;
  url: string;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
})
export class UserProfileComponent implements OnInit {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  private mindService = inject(MindService);
  private characterService = inject(CharacterService);
  private router = inject(Router);

  // Active Tab
  activeTab = signal<'personal' | 'security' | 'wallet' | 'mind' | 'preferences'>('personal');

  // Personal Info Form State
  displayName = signal<string>('');
  bio = signal<string>('');
  phone = signal<string>('');
  location = signal<string>('');
  avatarUrl = signal<string | null>(null);

  // Password Change Form State
  currentPassword = signal<string>('');
  newPassword = signal<string>('');
  confirmPassword = signal<string>('');
  showCurrentPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);

  // Status & Feedback Signals
  isSavingProfile = signal<boolean>(false);
  profileSuccess = signal<string | null>(null);
  profileError = signal<string | null>(null);

  isChangingPassword = signal<boolean>(false);
  passwordSuccess = signal<string | null>(null);
  passwordError = signal<string | null>(null);

  isUploadingAvatar = signal<boolean>(false);

  // Connected Mind & Companions
  myMind = signal<UserMind | null>(null);
  isLoadingMind = signal<boolean>(false);
  companionsCount = signal<number>(0);

  // Constants
  readonly tokenName = TOKEN_NAME;
  readonly tokenSymbol = TOKEN_SYMBOL;

  // Curated Avatar Presets
  readonly avatarPresets: AvatarPreset[] = [
    { name: 'Alex', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Alex&backgroundColor=b6e3f4' },
    { name: 'Jordan', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Jordan&backgroundColor=ffd5dc' },
    { name: 'Taylor', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Taylor&backgroundColor=c0aede' },
    { name: 'Morgan', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Morgan&backgroundColor=d1d4f9' },
    { name: 'Casey', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Casey&backgroundColor=ffdfbf' },
    { name: 'Riley', url: 'https://api.dicebear.com/9.x/notionists/svg?seed=Riley&backgroundColor=c5f2c7' },
  ];

  // Computed User Presentation
  userInitials = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return 'U';
    if (user.display_name) {
      const parts = user.display_name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.display_name.slice(0, 2).toUpperCase();
    }
    return (user.email?.charAt(0) || 'U').toUpperCase();
  });

  memberSince = computed(() => {
    const user = this.authService.currentUser();
    if (!user?.created_at) return '2026';
    try {
      const date = new Date(user.created_at);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return '2026';
    }
  });

  ngOnInit(): void {
    this.hydrateFromCurrentUser();
    this.loadConnectedMind();
    this.loadCompanionsCount();
  }

  /**
   * Populate local signals from current authenticated user
   */
  private hydrateFromCurrentUser(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.displayName.set(user.display_name || '');
      this.bio.set(user.bio || '');
      this.phone.set(user.phone || '');
      this.location.set(user.location || '');
      this.avatarUrl.set(user.avatar_url || null);
    }
  }

  /**
   * Fetch connected AI Mind
   */
  private loadConnectedMind(): void {
    this.isLoadingMind.set(true);
    this.mindService.getMyMind().subscribe({
      next: (mind) => {
        this.myMind.set(mind);
        this.isLoadingMind.set(false);
      },
      error: () => {
        this.isLoadingMind.set(false);
      },
    });
  }

  /**
   * Fetch count of private companions
   */
  private loadCompanionsCount(): void {
    this.characterService.getCharacters().subscribe({
      next: (res) => {
        this.companionsCount.set(res.data?.length || 0);
      },
      error: () => {},
    });
  }

  /**
   * Select active tab
   */
  setTab(tab: 'personal' | 'security' | 'wallet' | 'mind' | 'preferences'): void {
    this.activeTab.set(tab);
    this.profileSuccess.set(null);
    this.profileError.set(null);
    this.passwordSuccess.set(null);
    this.passwordError.set(null);
  }

  /**
   * Choose an avatar preset
   */
  selectAvatarPreset(presetUrl: string): void {
    this.avatarUrl.set(presetUrl);
  }

  /**
   * Handle avatar file upload
   */
  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.profileError.set('Please select an image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.profileError.set('Image file exceeds the 10 MB limit.');
      return;
    }

    this.isUploadingAvatar.set(true);
    this.profileError.set(null);
    this.profileSuccess.set(null);

    this.authService.uploadAvatar(file).subscribe({
      next: (res) => {
        this.isUploadingAvatar.set(false);
        if (res.data?.url) {
          this.avatarUrl.set(res.data.url);
          this.profileSuccess.set('Avatar updated successfully!');
          setTimeout(() => this.profileSuccess.set(null), 3500);
        }
      },
      error: (err) => {
        this.isUploadingAvatar.set(false);
        this.profileError.set(err?.error?.error?.message || 'Failed to upload avatar image.');
      },
    });
  }

  /**
   * Save Personal Profile Changes
   */
  saveProfile(): void {
    this.isSavingProfile.set(true);
    this.profileSuccess.set(null);
    this.profileError.set(null);

    this.authService
      .updateProfile({
        display_name: this.displayName().trim() || null,
        bio: this.bio().trim() || null,
        phone: this.phone().trim() || null,
        location: this.location().trim() || null,
        avatar_url: this.avatarUrl() || null,
      })
      .subscribe({
        next: () => {
          this.isSavingProfile.set(false);
          this.profileSuccess.set('Your profile has been saved successfully.');
          setTimeout(() => this.profileSuccess.set(null), 4000);
        },
        error: (err) => {
          this.isSavingProfile.set(false);
          this.profileError.set(err?.error?.error?.message || 'Could not save profile changes.');
        },
      });
  }

  /**
   * Change Account Password
   */
  changePassword(): void {
    this.passwordSuccess.set(null);
    this.passwordError.set(null);

    const current = this.currentPassword().trim();
    const next = this.newPassword().trim();
    const confirm = this.confirmPassword().trim();

    if (!current) {
      this.passwordError.set('Please enter your current password.');
      return;
    }

    if (!next || next.length < 8) {
      this.passwordError.set('New password must be at least 8 characters in length.');
      return;
    }

    if (next !== confirm) {
      this.passwordError.set('New passwords do not match.');
      return;
    }

    this.isChangingPassword.set(true);

    this.authService
      .changePassword({
        currentPassword: current,
        newPassword: next,
      })
      .subscribe({
        next: (res) => {
          this.isChangingPassword.set(false);
          this.passwordSuccess.set(res.message || 'Password updated successfully!');
          this.currentPassword.set('');
          this.newPassword.set('');
          this.confirmPassword.set('');
          setTimeout(() => this.passwordSuccess.set(null), 4500);
        },
        error: (err) => {
          this.isChangingPassword.set(false);
          this.passwordError.set(err?.error?.error?.message || 'Failed to update password.');
        },
      });
  }

  /**
   * Format tokens for display
   */
  formatTokens(amount: number | string | undefined | null): string {
    return formatTokens(amount);
  }

  /**
   * Sign out
   */
  logout(): void {
    this.authService.logout();
  }
}
