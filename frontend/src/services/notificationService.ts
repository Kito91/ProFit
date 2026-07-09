import { api } from './api';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

class NotificationService {
  private PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || (import.meta.env as any).VITE_VAPID_CHAVE_PUBLICA || (import.meta.env as any)['VITE_VAPID_CHAVE_PÚBLICA'] || '';

  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
  }

  /** iOS requires the app to be installed (Add to Home Screen) for push to work */
  isIOSNotPWA(): boolean {
    return this.isIOS() && !this.isStandalone();
  }

  /**
   * Check real browser permission status
   */
  getPermissionStatus(): NotificationStatus {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return 'unsupported';
    }
    return Notification.permission as NotificationStatus;
  }

  async requestSystemPermission(): Promise<NotificationStatus> {
    const status = this.getPermissionStatus();

    if (status === 'unsupported' || status === 'granted' || status === 'denied') {
      return status;
    }

    return await Notification.requestPermission() as NotificationStatus;
  }

  /**
   * Subscribe to push notifications using Web Push
   */
  async subscribe(): Promise<boolean> {
    // iOS Safari only supports push in standalone/PWA mode
    if (this.isIOSNotPWA()) {
      console.warn('[Notifications] iOS requires the app to be installed (Add to Home Screen)');
      return false;
    }

    const status = this.getPermissionStatus();
    if (status === 'unsupported') {
      console.warn('[Notifications] Not supported in this browser');
      return false;
    }

    if (status === 'denied') {
      console.warn('[Notifications] Permission denied by user');
      return false;
    }

    try {
      const permission = await this.requestSystemPermission();
      if (permission !== 'granted') return false;

      if (!this.PUBLIC_VAPID_KEY) {
        console.error('[Notifications] VAPID Public Key not configured');
        return false;
      }

      // Unregister any existing SW to ensure fresh start
      const existingRegistrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of existingRegistrations) {
        if (reg.active?.scriptURL.includes('firebase-messaging-sw.js')) {
          await reg.unregister();
        }
      }

      await navigator.serviceWorker.register('/sw.js');
      
      // Wait for SW to be ready
      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // If subscription exists, check if keys match (optional but good)
        // For simplicity, we'll just re-subscribe if needed
        await subscription.unsubscribe();
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.PUBLIC_VAPID_KEY).buffer as ArrayBuffer,
      });

      // Send subscription to backend
      await api.notifications.registerDevice(subscription);
      
      // Mark user as notifications_enabled
      await api.user.updateNotificationSettings(true);

      console.log('[Notifications] Web Push subscription successful');
      return true;
    } catch (error) {
      console.error('[Notifications] Subscribe error:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await subscription.unsubscribe();
      }
      // Update backend
      await api.user.updateNotificationSettings(false);
    } catch (error) {
      console.error('[Notifications] Unsubscribe error:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const notificationService = new NotificationService();
