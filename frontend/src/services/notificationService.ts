import { api } from './api';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';
export type PushUnsupportedReason =
  | 'insecure-context'
  | 'ios-install-required'
  | 'missing-api'
  | 'missing-vapid-key'
  | null;
export type PushFailureReason =
  | Exclude<PushUnsupportedReason, null>
  | 'permission-denied'
  | 'permission-not-granted'
  | 'service-worker-not-ready'
  | 'subscription-failed'
  | 'api-registration-failed'
  | null;

export interface PushState {
  supported: boolean;
  permission: NotificationStatus;
  subscribed: boolean;
  requiresInstall: boolean;
  reason: PushUnsupportedReason;
}

export const PUSH_SUBSCRIPTION_CHANGED_EVENT = 'profit:push-subscription-changed';

const SERVICE_WORKER_URL = '/sw.js';
const SERVICE_WORKER_SCOPE = '/';
const SERVICE_WORKER_READY_TIMEOUT_MS = 15_000;
const PROMPT_DISMISSED_KEY = 'profit_push_prompt_dismissed_at';
const LEGACY_PROMPT_DISMISSED_KEY = 'notification_prompt_dismissed';
const PUSH_USER_KEY = 'profit_push_user_id';

class NotificationService {
  private readonly vapidKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();
  private registrationPromise: Promise<ServiceWorkerRegistration> | null = null;
  private activeRegistration: ServiceWorkerRegistration | null = null;
  private currentSubscription: PushSubscription | null = null;
  private lastFailureReason: PushFailureReason = null;
  private initialized = false;

  isIOS(): boolean {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  }

  /** iPhone/iPad only expose Web Push to a web app opened from the Home Screen. */
  isIOSNotPWA(): boolean {
    return this.isIOS() && !this.isStandalone();
  }

  getUnsupportedReason(): PushUnsupportedReason {
    if (!window.isSecureContext) return 'insecure-context';
    if (this.isIOSNotPWA()) return 'ios-install-required';
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      return 'missing-api';
    }
    if (!this.vapidKey || !this.isValidVapidKey(this.vapidKey)) return 'missing-vapid-key';
    return null;
  }

  isSupported(): boolean {
    return this.getUnsupportedReason() === null;
  }

  getPermissionStatus(): NotificationStatus {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission as NotificationStatus;
  }

  async getState(): Promise<PushState> {
    const reason = this.getUnsupportedReason();
    const permission = reason ? 'unsupported' : (Notification.permission as NotificationStatus);
    let subscribed = false;

    if (!reason) {
      try {
        const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
        const subscription = await registration?.pushManager.getSubscription();
        if (registration?.active) this.activeRegistration = registration;
        this.currentSubscription = subscription || null;
        subscribed = permission === 'granted' && !!subscription && this.subscriptionUsesCurrentVapidKey(subscription);
      } catch (error) {
        console.warn('[Push] Could not inspect the current subscription.', error);
      }
    }

    return {
      supported: reason === null,
      permission,
      subscribed,
      requiresInstall: reason === 'ios-install-required',
      reason,
    };
  }

  /** Register the app service worker once and listen for subscription rotation. */
  initialize(): void {
    if (this.initialized || !('serviceWorker' in navigator) || !window.isSecureContext) return;
    this.initialized = true;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
        window.dispatchEvent(new CustomEvent(PUSH_SUBSCRIPTION_CHANGED_EVENT));
      }
    });

    const register = () => {
      this.ensureServiceWorker().catch((error) => {
        console.error('[Push] Service worker registration failed.', error);
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }

  /** Prepare the active registration before rendering a permission button on iOS. */
  async prepareForPermissionPrompt(): Promise<boolean> {
    const unsupportedReason = this.getUnsupportedReason();
    if (unsupportedReason) {
      this.lastFailureReason = unsupportedReason;
      return false;
    }

    try {
      const registration = await this.ensureServiceWorker();
      this.activeRegistration = registration;
      this.currentSubscription = await registration.pushManager.getSubscription();
      this.lastFailureReason = null;
      return true;
    } catch (error) {
      this.lastFailureReason = 'service-worker-not-ready';
      console.error('[Push] Service worker is not ready for a permission request.', error);
      return false;
    }
  }

  getLastFailureReason(): PushFailureReason {
    return this.lastFailureReason;
  }

  /**
   * Call this directly from a click/tap. Safari expects pushManager.subscribe()
   * itself to run in the user-gesture call stack so it can open the system prompt.
   */
  async subscribeFromUserGesture(registerWithApi = true): Promise<boolean> {
    this.lastFailureReason = null;
    const unsupportedReason = this.getUnsupportedReason();
    if (unsupportedReason) {
      this.lastFailureReason = unsupportedReason;
      return false;
    }
    if (Notification.permission === 'denied') {
      this.lastFailureReason = 'permission-denied';
      return false;
    }

    const registration = this.activeRegistration;
    if (!registration?.active) {
      this.lastFailureReason = 'service-worker-not-ready';
      void this.prepareForPermissionPrompt();
      return false;
    }

    let subscription = this.currentSubscription;
    const currentUserId = this.getCurrentUserId();
    const subscriptionUserId = localStorage.getItem(PUSH_USER_KEY);

    try {
      if (
        subscription &&
        currentUserId &&
        subscriptionUserId &&
        currentUserId !== subscriptionUserId
      ) {
        await subscription.unsubscribe();
        subscription = null;
      }

      if (subscription && !this.subscriptionUsesCurrentVapidKey(subscription)) {
        await subscription.unsubscribe();
        subscription = null;
      }

      if (!subscription) {
        // Keep this call before the first await in the normal permission path.
        const subscriptionRequest = registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidKey),
        });
        subscription = await subscriptionRequest;
      }

      this.currentSubscription = subscription;
    } catch (error) {
      const permissionAfterRequest = String(Notification.permission);
      this.lastFailureReason = permissionAfterRequest === 'denied'
        ? 'permission-denied'
        : permissionAfterRequest === 'default'
          ? 'permission-not-granted'
          : 'subscription-failed';
      console.error('[Push] Browser subscription request failed.', error);
      return false;
    }

    if (!registerWithApi) return true;
    return this.registerSubscriptionWithApi(subscription, currentUserId);
  }

  /**
   * Create or reconcile the browser subscription and register it with the API.
   * Calling this again is safe and is required after login or a VAPID key rotation.
   */
  async subscribe(): Promise<boolean> {
    this.lastFailureReason = null;
    const unsupportedReason = this.getUnsupportedReason();
    if (unsupportedReason) {
      this.lastFailureReason = unsupportedReason;
      console.warn('[Push] Unsupported:', unsupportedReason);
      return false;
    }
    if (Notification.permission !== 'granted') {
      this.lastFailureReason = Notification.permission === 'denied'
        ? 'permission-denied'
        : 'permission-not-granted';
      return false;
    }

    try {
      const registration = await this.ensureServiceWorker();
      let subscription = await registration.pushManager.getSubscription();
      this.activeRegistration = registration;
      this.currentSubscription = subscription;
      const currentUserId = this.getCurrentUserId();
      const subscriptionUserId = localStorage.getItem(PUSH_USER_KEY);

      // Never reuse one browser endpoint across two accounts on a shared device.
      if (subscription && currentUserId && subscriptionUserId && currentUserId !== subscriptionUserId) {
        const previousEndpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await api.notifications.removeDevice({ endpoint: previousEndpoint }).catch(() => undefined);
        subscription = null;
        this.currentSubscription = null;
      }

      if (subscription && !this.subscriptionUsesCurrentVapidKey(subscription)) {
        const oldEndpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await api.notifications.removeDevice({ endpoint: oldEndpoint }).catch(() => undefined);
        subscription = null;
        this.currentSubscription = null;
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidKey),
        });
        this.currentSubscription = subscription;
      }

      return this.registerSubscriptionWithApi(subscription, currentUserId);
    } catch (error) {
      this.lastFailureReason = 'subscription-failed';
      console.error('[Push] Subscription failed.', error);
      return false;
    }
  }

  /** Re-register an already-authorized device without displaying a permission prompt. */
  async syncSubscription(): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') return false;
    return this.subscribe();
  }

  async unsubscribe(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return true;

    try {
      const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
      const subscription = await registration?.pushManager.getSubscription();

      if (!subscription) {
        localStorage.removeItem(PUSH_USER_KEY);
        return true;
      }

      const endpoint = subscription.endpoint;
      const unsubscribed = await subscription.unsubscribe();
      this.currentSubscription = null;

      // Removing one browser must not globally disable a user's other devices.
      await api.notifications.removeDevice({ endpoint }).catch((error) => {
        console.warn('[Push] Device was removed locally but the API cleanup failed.', error);
      });
      localStorage.removeItem(PUSH_USER_KEY);

      return unsubscribed;
    } catch (error) {
      console.error('[Push] Unsubscribe failed.', error);
      return false;
    }
  }

  isPromptDismissed(cooldownDays = 7): boolean {
    const value = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (!value) return false;

    const dismissedAt = Number(value);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < cooldownDays * 24 * 60 * 60 * 1000;
  }

  dismissPrompt(): void {
    localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()));
    localStorage.removeItem(LEGACY_PROMPT_DISMISSED_KEY);
  }

  clearPromptDismissal(): void {
    localStorage.removeItem(PROMPT_DISMISSED_KEY);
    localStorage.removeItem(LEGACY_PROMPT_DISMISSED_KEY);
    sessionStorage.removeItem('notification_registered');
  }

  private async ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker API is unavailable.');

    if (!this.registrationPromise) {
      this.registrationPromise = navigator.serviceWorker
        .register(SERVICE_WORKER_URL, {
          scope: SERVICE_WORKER_SCOPE,
          updateViaCache: 'none',
        })
        .then(async (registration) => {
          registration.update().catch(() => undefined);
          const activeRegistration = registration.active
            ? registration
            : await Promise.race([
                navigator.serviceWorker.ready,
                new Promise<never>((_, reject) => {
                  window.setTimeout(
                    () => reject(new Error('Service worker activation timed out.')),
                    SERVICE_WORKER_READY_TIMEOUT_MS,
                  );
                }),
              ]);

          this.activeRegistration = activeRegistration;
          this.currentSubscription = await activeRegistration.pushManager.getSubscription();
          return activeRegistration;
        })
        .catch((error) => {
          this.registrationPromise = null;
          throw error;
        });
    }

    return this.registrationPromise;
  }

  private async registerSubscriptionWithApi(
    subscription: PushSubscription,
    currentUserId: string | null,
  ): Promise<boolean> {
    try {
      await api.notifications.registerDevice(subscription.toJSON(), this.getDeviceType());
      if (currentUserId) localStorage.setItem(PUSH_USER_KEY, currentUserId);
      this.clearPromptDismissal();
      this.lastFailureReason = null;
      console.info('[Push] Subscription synchronized.');
      return true;
    } catch (error) {
      this.lastFailureReason = 'api-registration-failed';
      console.error('[Push] Browser permission granted, but API registration failed.', error);
      return false;
    }
  }

  private getDeviceType(): string {
    if (this.isIOS()) return 'web-ios-pwa';
    if (/Android/i.test(navigator.userAgent)) return 'web-android';
    return 'web-desktop';
  }

  private getCurrentUserId(): string | null {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      return user?.id ? String(user.id) : null;
    } catch {
      return null;
    }
  }

  private subscriptionUsesCurrentVapidKey(subscription: PushSubscription): boolean {
    const existingKey = subscription.options.applicationServerKey;
    if (!existingKey) return false;
    return this.uint8ArraysEqual(
      new Uint8Array(existingKey),
      this.urlBase64ToUint8Array(this.vapidKey),
    );
  }

  private isValidVapidKey(value: string): boolean {
    try {
      const key = this.urlBase64ToUint8Array(value);
      return key.byteLength === 65 && key[0] === 4;
    } catch {
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }

  private uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }
}

export const notificationService = new NotificationService();
