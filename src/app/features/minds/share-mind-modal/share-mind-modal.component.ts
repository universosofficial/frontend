import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-share-mind-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="share-overlay" (click)="onBackdropClick($event)">
        <div class="share-modal-card">
          <!-- Modal Header -->
          <div class="share-header">
            <div class="share-title-wrap">
              <div class="share-icon-disc">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div>
                <h2 class="share-title">Share AI Mind</h2>
                <p class="share-subtitle">Invite friends and followers to consult this AI Mind</p>
              </div>
            </div>
            <button type="button" class="btn-close" (click)="close.emit()" title="Close">
              &times;
            </button>
          </div>

          <!-- Social Card Preview -->
          <div class="share-preview-card">
            <div class="preview-avatar">
              @if (avatarUrl) {
                <img [src]="avatarUrl" [alt]="mindName" class="avatar-img" />
              } @else {
                <div class="avatar-fallback">{{ (mindName || 'M').charAt(0).toUpperCase() }}</div>
              }
            </div>
            <div class="preview-info">
              <div class="preview-name-row">
                <span class="preview-name">{{ mindName || 'AI Mind' }}</span>
                <span class="preview-handle">&#64;{{ cleanHandle }}</span>
              </div>
              <p class="preview-headline">{{ headline || 'Virtual Human AI Profile' }}</p>
              <div class="preview-badge">
                <span class="pulse-dot"></span>
                <span>Active AI Companion</span>
              </div>
            </div>
          </div>

          <!-- Link Copy Field -->
          <div class="share-link-group">
            <label class="share-label">Public AI Link</label>
            <div class="link-input-row">
              <input type="text" [value]="shareUrl" readonly class="share-link-input" #linkInput />
              <button
                type="button"
                class="btn-copy"
                [class.copied]="isCopied()"
                (click)="copyLink(linkInput)"
              >
                @if (isCopied()) {
                  <svg viewBox="0 0 20 20" fill="currentColor" class="check-icon">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <span>Copied!</span>
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                }
              </button>
            </div>
          </div>

          <!-- Direct Social Channels -->
          <div class="social-channels-group">
            <label class="share-label">Share to Social Media</label>
            <div class="social-grid">
              <!-- X / Twitter -->
              <a [href]="twitterShareUrl" target="_blank" rel="noopener noreferrer" class="social-btn btn-twitter" title="Share on X / Twitter">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>X / Twitter</span>
              </a>

              <!-- WhatsApp -->
              <a [href]="whatsappShareUrl" target="_blank" rel="noopener noreferrer" class="social-btn btn-whatsapp" title="Share on WhatsApp">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 2C6.516 2 2.031 6.484 2.031 12c0 2.219.72 4.27 1.938 5.922L2 22l4.203-1.922C7.812 21.28 9.875 22 12.031 22c5.516 0 10-4.484 10-10s-4.484-10-10-10zm0 18.281c-1.859 0-3.625-.594-5.078-1.64l-.36-.266-2.5 1.14.703-2.422-.266-.375a8.216 8.216 0 01-1.469-4.718c0-4.578 3.703-8.281 8.281-8.281 4.578 0 8.281 3.703 8.281 8.281s-3.703 8.281-8.281 8.281zm4.547-6.203c-.25-.125-1.484-.734-1.718-.813-.234-.094-.406-.14-.578.125-.172.25-.672.813-.828.984-.156.172-.313.188-.563.063-.25-.125-1.062-.39-2.016-1.25-.75-.672-1.25-1.5-1.406-1.75-.156-.25-.016-.39.11-.516.11-.11.25-.281.375-.422.125-.14.172-.234.25-.39.078-.156.047-.313-.016-.438s-.578-1.39-.797-1.906c-.203-.5-.422-.438-.578-.438h-.5c-.172 0-.453.063-.688.313-.234.25-.906.89-906 2.156s.922 2.5 1.047 2.656c.125.156 1.813 2.766 4.391 3.875.61.266 1.094.422 1.469.547.625.203 1.188.172 1.64.109.5-.078 1.484-.609 1.703-1.203.219-.594.219-1.094.156-1.203-.063-.11-.234-.172-.484-.297z"/>
                </svg>
                <span>WhatsApp</span>
              </a>

              <!-- LinkedIn -->
              <a [href]="linkedinShareUrl" target="_blank" rel="noopener noreferrer" class="social-btn btn-linkedin" title="Share on LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
                <span>LinkedIn</span>
              </a>

              <!-- Telegram -->
              <a [href]="telegramShareUrl" target="_blank" rel="noopener noreferrer" class="social-btn btn-telegram" title="Share on Telegram">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                <span>Telegram</span>
              </a>

              <!-- Facebook -->
              <a [href]="facebookShareUrl" target="_blank" rel="noopener noreferrer" class="social-btn btn-facebook" title="Share on Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95C18.05 21.45 22 17.19 22 12z"/>
                </svg>
                <span>Facebook</span>
              </a>

              <!-- Reddit -->
              <a [href]="redditShareUrl" target="_blank" rel="noopener noreferrer" class="social-btn btn-reddit" title="Share on Reddit">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm5.91 10.63c.06.27.09.56.09.87 0 2.45-2.69 4.45-6 4.45s-6-2-6-4.45c0-.31.03-.6.09-.87-.41-.33-.69-.83-.69-1.4 0-1 0.81-1.81 1.81-1.81.56 0 1.05.25 1.38.65 1.01-.69 2.37-1.14 3.88-1.2l.66-3.11 2.15.46c.07-.53.53-.94 1.08-.94.6 0 1.09.49 1.09 1.09s-.49 1.09-1.09 1.09c-.55 0-1.01-.41-1.08-.94l-1.7-.36-.54 2.54c1.54.06 2.92.51 3.94 1.21.33-.4.82-.65 1.38-.65 1 0 1.81.81 1.81 1.81 0 .57-.28 1.07-.69 1.4zm-8.41-.63c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm5 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-4.71 3.7c.39.39 1.15.58 2.21.58 1.06 0 1.82-.19 2.21-.58.15-.15.15-.39 0-.54-.15-.15-.39-.15-.54 0-.27.27-.9.42-1.67.42-.77 0-1.4-.15-1.67-.42-.15-.15-.39-.15-.54 0-.15.15-.15.39 0 .54z"/>
                </svg>
                <span>Reddit</span>
              </a>
            </div>
          </div>

          <!-- Publication status note -->
          @if (!isPublished) {
            <div class="draft-warning-banner">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span>This AI profile is currently in <strong>Private</strong> mode. Turn on <strong>Make Public in Directory</strong> so your followers can chat with it without restrictions.</span>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .share-overlay {
      position: fixed;
      inset: 0;
      background: rgba(11, 20, 26, 0.75);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 16px;
      animation: fadeIn 0.18s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }

    .share-modal-card {
      background: #1f2c34;
      border: 1px solid rgba(134, 150, 160, 0.2);
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      padding: 24px;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: 20px;
      color: #e9edef;
    }

    .share-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .share-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .share-icon-disc {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(0, 168, 132, 0.15);
      border: 1px solid rgba(0, 168, 132, 0.3);
      color: #00a884;
      display: flex;
      align-items: center;
      justify-content: center;

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .share-title {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
      color: #e9edef;
    }

    .share-subtitle {
      font-size: 12.5px;
      color: #8696a0;
      margin: 2px 0 0;
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 26px;
      color: #8696a0;
      cursor: pointer;
      line-height: 1;
      padding: 4px 8px;
      border-radius: 8px;
      transition: all 0.15s ease;

      &:hover {
        color: #e9edef;
        background: rgba(255, 255, 255, 0.08);
      }
    }

    /* Social Card Preview */
    .share-preview-card {
      background: #111b21;
      border: 1px solid rgba(134, 150, 160, 0.2);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .preview-avatar {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      background: #2a3942;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-fallback {
      font-size: 22px;
      font-weight: 700;
      color: #00a884;
    }

    .preview-info {
      flex: 1;
      min-width: 0;
    }

    .preview-name-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .preview-name {
      font-size: 15px;
      font-weight: 700;
      color: #e9edef;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .preview-handle {
      font-size: 13px;
      color: #00a884;
      font-family: monospace;
    }

    .preview-headline {
      font-size: 12px;
      color: #8696a0;
      margin: 2px 0 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .preview-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #25d366;
      background: rgba(37, 211, 102, 0.1);
      padding: 2px 8px;
      border-radius: 12px;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #25d366;
      box-shadow: 0 0 6px #25d366;
    }

    /* Link Copy Input */
    .share-link-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .share-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #8696a0;
    }

    .link-input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #111b21;
      border: 1px solid rgba(134, 150, 160, 0.25);
      border-radius: 10px;
      padding: 4px 6px 4px 12px;
      transition: border-color 0.15s ease;

      &:focus-within {
        border-color: #00a884;
      }
    }

    .share-link-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #e9edef;
      font-size: 13px;
      font-family: monospace;
    }

    .btn-copy {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: #00a884;
      color: #111b21;
      font-weight: 600;
      font-size: 12.5px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: #02906f;
      }

      &.copied {
        background: #25d366;
        color: #111b21;
      }
    }

    /* Social Grid */
    .social-channels-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .social-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;

      @media (max-width: 480px) {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .social-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 12.5px;
      font-weight: 600;
      text-decoration: none;
      color: #ffffff;
      transition: transform 0.15s ease, filter 0.15s ease;

      svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      &:hover {
        transform: translateY(-2px);
        filter: brightness(1.1);
      }
    }

    .btn-twitter {
      background: #000000;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-whatsapp {
      background: #25d366;
      color: #0b141a;
    }

    .btn-linkedin {
      background: #0a66c2;
    }

    .btn-telegram {
      background: #229ed9;
    }

    .btn-facebook {
      background: #1877f2;
    }

    .btn-reddit {
      background: #ff4500;
    }

    .draft-warning-banner {
      background: rgba(255, 171, 0, 0.1);
      border: 1px solid rgba(255, 171, 0, 0.3);
      color: #ffab00;
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 12px;
      line-height: 1.4;

      svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        margin-top: 1px;
      }
    }
  `]
})
export class ShareMindModalComponent {
  @Input() isOpen = false;
  @Input() mindName = '';
  @Input() handle = '';
  @Input() headline = '';
  @Input() avatarUrl = '';
  @Input() isPublished = false;

  @Output() close = new EventEmitter<void>();

  isCopied = signal<boolean>(false);

  get cleanHandle(): string {
    return (this.handle || '').replace(/^@/, '').trim();
  }

  get shareUrl(): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
    return `${origin}/minds/@${this.cleanHandle}`;
  }

  get shareMessage(): string {
    const name = this.mindName || 'AI Profile';
    return `Chat with my personal AI (${name}) on Virtual Human:`;
  }

  get twitterShareUrl(): string {
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(this.shareMessage)}&url=${encodeURIComponent(this.shareUrl)}`;
  }

  get whatsappShareUrl(): string {
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(this.shareMessage + ' ' + this.shareUrl)}`;
  }

  get linkedinShareUrl(): string {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.shareUrl)}`;
  }

  get telegramShareUrl(): string {
    return `https://t.me/share/url?url=${encodeURIComponent(this.shareUrl)}&text=${encodeURIComponent(this.shareMessage)}`;
  }

  get facebookShareUrl(): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareUrl)}`;
  }

  get redditShareUrl(): string {
    return `https://reddit.com/submit?url=${encodeURIComponent(this.shareUrl)}&title=${encodeURIComponent('Chat with ' + (this.mindName || 'AI Profile') + ' on Virtual Human')}`;
  }

  copyLink(inputEl: HTMLInputElement): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.shareUrl).then(() => {
        this.isCopied.set(true);
        setTimeout(() => this.isCopied.set(false), 2500);
      });
    } else {
      inputEl.select();
      document.execCommand('copy');
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2500);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('share-overlay')) {
      this.close.emit();
    }
  }
}
