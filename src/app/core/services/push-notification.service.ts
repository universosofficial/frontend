import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, map } from 'rxjs';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private http = inject(HttpClient);
  private apiUrl = 'https://aicompanion-production-12db.up.railway.app/api/notifications';

  isSupported = signal<boolean>(false);
  permission = signal<NotificationPermission>('default');
  isSubscribed = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    this.checkSupport();
  }

  private checkSupport(): void {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      this.isSupported.set(true);
      this.permission.set(Notification.permission);
      this.checkExistingSubscription();
    } else {
      this.isSupported.set(false);
    }
  }

  private async checkExistingSubscription(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          this.isSubscribed.set(Boolean(subscription));
        }
      }
    } catch (err) {
      console.warn('[PUSH SERVICE] Error checking subscription:', err);
    }
  }

  getVapidPublicKey(): Observable<string> {
    return this.http.get<{ success: boolean; data: { publicKey: string } }>(`${this.apiUrl}/vapid-key`).pipe(
      map((res) => res.data?.publicKey || '')
    );
  }

  async requestPermissionAndSubscribe(): Promise<boolean> {
    if (!this.isSupported()) {
      this.errorMessage.set('Push notifications are not supported in this browser.');
      return false;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      // 1. Request Browser Permission
      const permission = await Notification.requestPermission();
      this.permission.set(permission);

      if (permission !== 'granted') {
        this.isLoading.set(false);
        this.errorMessage.set('Push notification permission was not granted.');
        return false;
      }

      // 2. Fetch VAPID Public Key from backend
      const vapidKeyRes = await fetch(`${this.apiUrl}/vapid-key`).then((r) => r.json());
      const publicKey = vapidKeyRes?.data?.publicKey;

      if (!publicKey) {
        throw new Error('VAPID public key not configured on server.');
      }

      // 3. Register or get Service Worker
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/custom-service-worker.js', {
          scope: '/',
        });
      }
      await navigator.serviceWorker.ready;

      // 4. Subscribe with PushManager
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // 5. Send Subscription to Backend
      const token = localStorage.getItem('access_token');
      await fetch(`${this.apiUrl}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      this.isSubscribed.set(true);
      this.isLoading.set(false);
      return true;
    } catch (err: any) {
      console.error('[PUSH SERVICE] Subscription failed:', err);
      this.errorMessage.set(err.message || 'Failed to register push subscription.');
      this.isLoading.set(false);
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    this.isLoading.set(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        const token = localStorage.getItem('access_token');
        await fetch(`${this.apiUrl}/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ endpoint }),
        });
      }

      this.isSubscribed.set(false);
      this.isLoading.set(false);
      return true;
    } catch (err: any) {
      console.error('[PUSH SERVICE] Unsubscribe failed:', err);
      this.isLoading.set(false);
      return false;
    }
  }

  sendTestNotification(characterId?: number, body?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/test`, { characterId, body });
  }

  triggerEvaluation(characterId?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/trigger-evaluation`, { characterId });
  }

  createOpenThread(characterId: number, topicSummary: string, triggerAfter?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/threads`, {
      characterId,
      topicSummary,
      triggerAfter,
    });
  }

  toggleCharacterProactive(characterId: number, allowProactive: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/characters/${characterId}/proactive-toggle`, {
      allowProactive,
    });
  }
}
