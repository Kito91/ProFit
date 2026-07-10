import { api } from './api';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

class NotificationService {
  private readonly VAPID_KEY =
    import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

  // ── Platform detection ──────────────────────────────────────

  isIOS(): boolean {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }

  /** iOS requires Add to Home Screen for Web Push — return true when blocked */
  isIOSNotPWA(): boolean {
    return this.isIOS() && !this.isStandalone();
  }

  /**
   * Full capability check.
   * iOS requires PWA mode (Add to Home Screen) for Web Push.
   * All other platforms just need Notification + serviceWorker APIs.
   */
  isSupported(): boolean {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (!('Notification' in window)) return false;
    if (this.isIOS() && !this.isStandalone()) return false;
    return true;
  }

  getPermissionStatus(): NotificationStatus {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission as NotificationStatus;
  }

  // ── Subscribe ───────────────────────────────────────────────

  async subscribe(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('[Push] Not supported on this platform/browser.');
      return false;
    }

    if (!this.VAPID_KEY) {
      console.error('[Push] VITE_VAPID_PUBLIC_KEY is not set.');
      return false;
    }

    // 1. Request permission (must be triggered by user gesture on iOS)
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      console.warn('[Push] Permission not granted:', permission);
      return false;
    }

    try {
      // 2. Register SW if not yet registered, then wait for it to be ACTIVE.
      //    We use navigator.serviceWorker.ready (not the getRegistration result)
      //    because on mobile the SW may still be in 'installing' state.
      const existing = await navigator.serviceWorker.getRegistration('/');
      if (!existing) {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }
      const reg = await navigator.serviceWorker.ready;

      // 3. Get existing push subscription
      let subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        const existingKey = subscription.options?.applicationServerKey;
        const newKey = this.urlBase64ToUint8Array(this.VAPID_KEY);
        if (existingKey && this.uint8ArraysEqual(new Uint8Array(existingKey), newKey)) {
          // Same VAPID key — re-register with backend (no new sub needed)
          await api.notifications.registerDevice(subscription.toJSON());
          return true;
        }
        // Different VAPID key — drop old subscription
        await subscription.unsubscribe();
      }

      // 4. Create new push subscription
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_KEY),
      });

      // 5. toJSON() extracts endpoint + keys.p256dh + keys.auth properly
      await api.notifications.registerDevice(subscription.toJSON());
      await api.user.updateNotificationSettings(true);

      console.log('[Push] Subscription successful.');
      return true;
    } catch (err: any) {
      console.error('[Push] Subscribe failed:', err?.name, err?.message, err);
      return false;
    }
  }

  // ── Unsubscribe ─────────────────────────────────────────────

  async unsubscribe(): Promise<void> {
    try {
      let endpoint: string | undefined;
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          endpoint = sub.endpoint;
          await sub.unsubscribe();
        }
      }
      if (endpoint) {
        await api.notifications.removeDevice({ endpoint });
      }
      await api.user.updateNotificationSettings(false);
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────

  /** Convert URL-safe base64 VAPID key to Uint8Array (required by pushManager.subscribe) */
  private urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }

  private uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }
}

export const notificationService = new NotificationService();
