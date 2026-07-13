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

export type PushDiagnosticSeverity = 'success' | 'info' | 'warning' | 'error';

export interface PushDiagnosticReport {
  code: string;
  severity: PushDiagnosticSeverity;
  title: string;
  message: string;
  recommendation: string;
  checkedAt: string;
  isIOS: boolean;
  iosVersion: string | null;
  standalone: boolean;
  secureContext: boolean;
  permission: NotificationStatus;
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
  serviceWorkerControlled: boolean;
  serviceWorkerState: string;
  serviceWorkerScope: string | null;
  serviceWorkerScriptURL: string | null;
  pushManagerAvailable: boolean;
  subscriptionPresent: boolean;
  subscriptionMatchesVapid: boolean | null;
  vapidConfigured: boolean;
  vapidValid: boolean;
  serverRegistrationKnown: boolean;
  lastFailureReason: PushFailureReason;
  lastFailureMessage: string | null;
  lastFailureAt: string | null;
  inspectionError: string | null;
}

export const PUSH_SUBSCRIPTION_CHANGED_EVENT = 'profit:push-subscription-changed';

const SERVICE_WORKER_URL = '/sw.js';
const SERVICE_WORKER_SCOPE = '/';
const SERVICE_WORKER_READY_TIMEOUT_MS = 15_000;
const PROMPT_DISMISSED_KEY = 'profit_push_prompt_dismissed_at_v3';
const PREVIOUS_PROMPT_DISMISSED_KEY = 'profit_push_prompt_dismissed_at_v2';
const OLDER_PROMPT_DISMISSED_KEY = 'profit_push_prompt_dismissed_at';
const LEGACY_PROMPT_DISMISSED_KEY = 'notification_prompt_dismissed';
const PUSH_USER_KEY = 'profit_push_user_id';

class NotificationService {
  private readonly vapidKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();
  private registrationPromise: Promise<ServiceWorkerRegistration> | null = null;
  private activeRegistration: ServiceWorkerRegistration | null = null;
  private currentSubscription: PushSubscription | null = null;
  private lastFailureReason: PushFailureReason = null;
  private lastFailureMessage: string | null = null;
  private lastFailureAt: string | null = null;
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

  /** Snapshot used by the Home header to explain why Web Push is not available. */
  async getDiagnosticReport(): Promise<PushDiagnosticReport> {
    const isIOS = this.isIOS();
    const iosVersion = this.getIOSVersion();
    const standalone = this.isStandalone();
    const secureContext = window.isSecureContext;
    const serviceWorkerSupported = 'serviceWorker' in navigator;
    const notificationSupported = 'Notification' in window;
    const permission = notificationSupported
      ? (Notification.permission as NotificationStatus)
      : 'unsupported';
    const vapidConfigured = this.vapidKey.length > 0;
    const vapidValid = vapidConfigured && this.isValidVapidKey(this.vapidKey);

    let registration: ServiceWorkerRegistration | undefined;
    let subscription: PushSubscription | null = null;
    let inspectionError: string | null = null;

    if (serviceWorkerSupported) {
      try {
        registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
        if (registration?.pushManager) {
          subscription = await registration.pushManager.getSubscription();
        }
      } catch (error) {
        inspectionError = this.errorToMessage(error);
      }
    }

    const worker = registration?.active || registration?.waiting || registration?.installing || null;
    const serviceWorkerState = worker?.state || (registration ? 'registered-without-worker' : 'not-registered');
    const pushManagerAvailable = !!registration?.pushManager && typeof registration.pushManager.subscribe === 'function';
    const subscriptionMatchesVapid = subscription && vapidValid
      ? this.subscriptionUsesCurrentVapidKey(subscription)
      : null;
    const currentUserId = this.getCurrentUserId();
    const serverRegistrationKnown = !!subscription && !!currentUserId && localStorage.getItem(PUSH_USER_KEY) === currentUserId;
    const iosParts = iosVersion?.split('.').map(Number) || [];
    const unsupportedIOSVersion = isIOS && iosParts.length > 0 && (
      iosParts[0] < 16 || (iosParts[0] === 16 && (iosParts[1] || 0) < 4)
    );

    let summary: Pick<PushDiagnosticReport, 'code' | 'severity' | 'title' | 'message' | 'recommendation'>;

    if (!secureContext) {
      summary = {
        code: 'insecure-context',
        severity: 'error',
        title: 'A página não está em HTTPS',
        message: 'O iOS bloqueia Service Worker e Web Push fora de uma ligação HTTPS segura.',
        recommendation: 'Abra o ProFit pelo endereço HTTPS oficial.',
      };
    } else if (isIOS && !standalone) {
      summary = {
        code: 'ios-install-required',
        severity: 'error',
        title: 'O ProFit não foi aberto como app',
        message: 'No iOS, Web Push só fica disponível ao abrir o ProFit pelo ícone instalado no Ecrã Inicial.',
        recommendation: 'No navegador, use Partilhar > Adicionar ao Ecrã Inicial e abra pelo novo ícone.',
      };
    } else if (unsupportedIOSVersion) {
      summary = {
        code: 'ios-version-unsupported',
        severity: 'error',
        title: `iOS ${iosVersion} sem suporte a Web Push`,
        message: 'Apps web no Ecrã Inicial precisam do iOS 16.4 ou mais recente para receber notificações.',
        recommendation: 'Atualize o iOS e volte a abrir o ProFit pelo ícone do Ecrã Inicial.',
      };
    } else if (!serviceWorkerSupported || !notificationSupported) {
      summary = {
        code: 'missing-browser-api',
        severity: 'error',
        title: 'O navegador não expôs as APIs necessárias',
        message: `Service Worker: ${serviceWorkerSupported ? 'disponível' : 'indisponível'}; Notificações: ${notificationSupported ? 'disponível' : 'indisponível'}.`,
        recommendation: 'Atualize o iOS/navegador e confirme que o app foi aberto pelo Ecrã Inicial.',
      };
    } else if (!vapidValid) {
      summary = {
        code: 'invalid-vapid-key',
        severity: 'error',
        title: 'Chave pública de notificações inválida',
        message: vapidConfigured ? 'A chave VAPID configurada no frontend tem um formato inválido.' : 'A chave VAPID não foi incluída no build do frontend.',
        recommendation: 'Confira VITE_VAPID_PUBLIC_KEY no ambiente usado para gerar o frontend.',
      };
    } else if (inspectionError) {
      summary = {
        code: 'service-worker-inspection-failed',
        severity: 'error',
        title: 'O iOS não permitiu inspecionar o Service Worker',
        message: inspectionError,
        recommendation: 'Feche o app, abra novamente pelo Ecrã Inicial e toque em “Verificar novamente”.',
      };
    } else if (permission === 'denied') {
      summary = {
        code: 'permission-denied',
        severity: 'error',
        title: 'Notificações bloqueadas nas Definições',
        message: 'O iOS já marcou a permissão como negada e não exibirá novamente o popup do sistema.',
        recommendation: 'Abra Definições > Notificações > ProFit e permita as notificações.',
      };
    } else if (!registration) {
      summary = {
        code: 'service-worker-not-registered',
        severity: 'error',
        title: 'Service Worker não registrado',
        message: 'O iOS ainda não criou o registro de /sw.js para este app.',
        recommendation: 'Toque em “Verificar novamente”. Se persistir, confirme que /sw.js abre sem redirecionamento ou erro no domínio publicado.',
      };
    } else if (serviceWorkerState === 'redundant') {
      summary = {
        code: 'service-worker-redundant',
        severity: 'error',
        title: 'O iOS descartou o Service Worker',
        message: 'O worker chegou a ser carregado, mas terminou no estado “redundant”, normalmente após falha de instalação ou execução.',
        recommendation: 'Verifique a resposta e a sintaxe de /sw.js no ambiente publicado e consulte o erro técnico abaixo.',
      };
    } else if (!registration.active || serviceWorkerState !== 'activated') {
      summary = {
        code: 'service-worker-not-active',
        severity: 'warning',
        title: `Service Worker ainda não está ativo (${serviceWorkerState})`,
        message: 'O registro existe, mas o iOS não concluiu a ativação necessária para criar a subscrição push.',
        recommendation: 'Aguarde alguns segundos e toque em “Verificar novamente”. O estado abaixo será atualizado.',
      };
    } else if (!pushManagerAvailable) {
      summary = {
        code: 'push-manager-missing',
        severity: 'error',
        title: 'PushManager não está disponível no registro',
        message: 'O Service Worker está ativo, mas o iOS não forneceu a API usada para criar a subscrição push.',
        recommendation: 'Confirme iOS 16.4+, instalação no Ecrã Inicial e abertura pelo ícone instalado.',
      };
    } else if (this.lastFailureReason === 'api-registration-failed') {
      summary = {
        code: 'api-registration-failed',
        severity: 'error',
        title: 'Permissão concedida, mas o dispositivo não foi registrado',
        message: this.lastFailureMessage || 'A subscrição foi criada no iOS, mas a API do ProFit recusou ou não recebeu o dispositivo.',
        recommendation: 'Verifique a ligação e o endpoint de registro de dispositivos no servidor.',
      };
    } else if (this.lastFailureReason === 'subscription-failed' || this.lastFailureReason === 'permission-not-granted') {
      summary = {
        code: this.lastFailureReason,
        severity: 'error',
        title: 'O iOS falhou ao criar a subscrição',
        message: this.lastFailureMessage || 'A chamada de pushManager.subscribe() não foi concluída.',
        recommendation: 'Use os detalhes técnicos abaixo para identificar o nome e a mensagem exata do erro do WebKit.',
      };
    } else if (permission === 'granted' && !subscription) {
      summary = {
        code: 'subscription-missing',
        severity: 'warning',
        title: 'Permissão concedida, mas sem subscrição push',
        message: 'O iOS permite notificações, porém este Service Worker ainda não possui um endpoint push.',
        recommendation: 'Toque novamente em Ativar Notificações para criar e registrar a subscrição.',
      };
    } else if (subscription && subscriptionMatchesVapid === false) {
      summary = {
        code: 'vapid-key-mismatch',
        severity: 'warning',
        title: 'A subscrição usa uma chave antiga',
        message: 'O endpoint salvo no iOS foi criado com uma chave VAPID diferente da versão atual do frontend.',
        recommendation: 'Desative e ative novamente as notificações para renovar a subscrição.',
      };
    } else if (permission === 'granted' && subscription && !serverRegistrationKnown) {
      summary = {
        code: 'server-registration-unknown',
        severity: 'warning',
        title: 'Subscrição criada, sincronização pendente',
        message: 'O iOS já possui um endpoint push, mas este navegador ainda não confirmou o registro para a conta atual.',
        recommendation: 'Toque em Ativar Notificações novamente para sincronizar o dispositivo com a conta.',
      };
    } else if (permission === 'granted' && subscription) {
      summary = {
        code: 'active',
        severity: 'success',
        title: 'Notificações funcionando neste dispositivo',
        message: 'Service Worker ativo, permissão concedida e subscrição push registrada.',
        recommendation: 'Nenhuma ação necessária.',
      };
    } else {
      summary = {
        code: 'ready-for-user-gesture',
        severity: 'info',
        title: 'Tudo pronto para pedir a permissão',
        message: 'O Service Worker e o PushManager estão ativos. O popup do iOS só será chamado depois do toque em Ativar Notificações.',
        recommendation: 'Toque em Ativar Notificações no popup do ProFit.',
      };
    }

    return {
      ...summary,
      checkedAt: new Date().toISOString(),
      isIOS,
      iosVersion,
      standalone,
      secureContext,
      permission,
      serviceWorkerSupported,
      serviceWorkerRegistered: !!registration,
      serviceWorkerControlled: !!navigator.serviceWorker?.controller,
      serviceWorkerState,
      serviceWorkerScope: registration?.scope || null,
      serviceWorkerScriptURL: worker?.scriptURL || null,
      pushManagerAvailable,
      subscriptionPresent: !!subscription,
      subscriptionMatchesVapid,
      vapidConfigured,
      vapidValid,
      serverRegistrationKnown,
      lastFailureReason: this.lastFailureReason,
      lastFailureMessage: this.lastFailureMessage,
      lastFailureAt: this.lastFailureAt,
      inspectionError,
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
        this.recordFailure('service-worker-not-ready', error);
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
      this.recordFailure(unsupportedReason);
      return false;
    }

    try {
      const registration = await this.ensureServiceWorker();
      if (!registration.pushManager || typeof registration.pushManager.subscribe !== 'function') {
        this.recordFailure('missing-api', new Error('The active service worker registration has no PushManager.'));
        return false;
      }
      this.activeRegistration = registration;
      this.currentSubscription = await registration.pushManager.getSubscription();
      if (
        this.lastFailureReason === 'service-worker-not-ready' ||
        this.lastFailureReason === 'missing-api'
      ) {
        this.clearFailure();
      }
      return true;
    } catch (error) {
      this.recordFailure('service-worker-not-ready', error);
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
    this.clearFailure();
    const unsupportedReason = this.getUnsupportedReason();
    if (unsupportedReason) {
      this.recordFailure(unsupportedReason);
      return false;
    }
    if (Notification.permission === 'denied') {
      this.recordFailure('permission-denied');
      return false;
    }

    const registration = this.activeRegistration;
    if (!registration?.active) {
      this.recordFailure('service-worker-not-ready', new Error('No active service worker was cached when the user tapped the activation button.'));
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
      const reason: Exclude<PushFailureReason, null> = permissionAfterRequest === 'denied'
        ? 'permission-denied'
        : permissionAfterRequest === 'default'
          ? 'permission-not-granted'
          : 'subscription-failed';
      this.recordFailure(reason, error);
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
    this.clearFailure();
    const unsupportedReason = this.getUnsupportedReason();
    if (unsupportedReason) {
      this.recordFailure(unsupportedReason);
      console.warn('[Push] Unsupported:', unsupportedReason);
      return false;
    }
    if (Notification.permission !== 'granted') {
      this.recordFailure(Notification.permission === 'denied'
        ? 'permission-denied'
        : 'permission-not-granted');
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
      this.recordFailure('subscription-failed', error);
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
    localStorage.removeItem(PREVIOUS_PROMPT_DISMISSED_KEY);
    localStorage.removeItem(OLDER_PROMPT_DISMISSED_KEY);
    localStorage.removeItem(LEGACY_PROMPT_DISMISSED_KEY);
  }

  clearPromptDismissal(): void {
    localStorage.removeItem(PROMPT_DISMISSED_KEY);
    localStorage.removeItem(PREVIOUS_PROMPT_DISMISSED_KEY);
    localStorage.removeItem(OLDER_PROMPT_DISMISSED_KEY);
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
          const activeRegistration = registration.active?.state === 'activated'
            ? registration
            : await this.waitForActiveServiceWorker(registration);

          if (!activeRegistration.pushManager) {
            throw new Error('Service worker activated without PushManager.');
          }

          this.activeRegistration = activeRegistration;
          this.currentSubscription = await activeRegistration.pushManager.getSubscription();
          return activeRegistration;
        })
        .catch((error) => {
          this.registrationPromise = null;
          this.recordFailure('service-worker-not-ready', error);
          throw error;
        });
    }

    return this.registrationPromise;
  }

  private waitForActiveServiceWorker(
    registration: ServiceWorkerRegistration,
  ): Promise<ServiceWorkerRegistration> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const workerListeners = new Map<ServiceWorker, () => void>();

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        registration.removeEventListener('updatefound', handleUpdateFound);
        navigator.serviceWorker.removeEventListener('controllerchange', checkState);
        workerListeners.forEach((listener, worker) => {
          worker.removeEventListener('statechange', listener);
        });
      };

      const finish = (activeRegistration: ServiceWorkerRegistration) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(activeRegistration);
      };

      const observeWorker = (worker: ServiceWorker | null) => {
        if (!worker || workerListeners.has(worker)) return;
        const listener = () => checkState();
        workerListeners.set(worker, listener);
        worker.addEventListener('statechange', listener);
      };

      function checkState() {
        observeWorker(registration.installing);
        observeWorker(registration.waiting);
        observeWorker(registration.active);
        if (registration.active?.state === 'activated') finish(registration);
      }

      function handleUpdateFound() {
        checkState();
      }

      const timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        const states = [
          `installing=${registration.installing?.state || 'none'}`,
          `waiting=${registration.waiting?.state || 'none'}`,
          `active=${registration.active?.state || 'none'}`,
          `controller=${navigator.serviceWorker.controller ? 'yes' : 'no'}`,
        ].join(', ');
        reject(new Error(`Service worker activation timed out after ${SERVICE_WORKER_READY_TIMEOUT_MS}ms (${states}).`));
      }, SERVICE_WORKER_READY_TIMEOUT_MS);

      registration.addEventListener('updatefound', handleUpdateFound);
      navigator.serviceWorker.addEventListener('controllerchange', checkState);
      navigator.serviceWorker.ready.then(finish).catch((error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      });
      checkState();
    });
  }

  private async registerSubscriptionWithApi(
    subscription: PushSubscription,
    currentUserId: string | null,
  ): Promise<boolean> {
    try {
      await api.notifications.registerDevice(subscription.toJSON(), this.getDeviceType());
      if (currentUserId) localStorage.setItem(PUSH_USER_KEY, currentUserId);
      this.clearPromptDismissal();
      this.clearFailure();
      console.info('[Push] Subscription synchronized.');
      return true;
    } catch (error) {
      this.recordFailure('api-registration-failed', error);
      console.error('[Push] Browser permission granted, but API registration failed.', error);
      return false;
    }
  }

  private getDeviceType(): string {
    if (this.isIOS()) return 'web-ios-pwa';
    if (/Android/i.test(navigator.userAgent)) return 'web-android';
    return 'web-desktop';
  }

  private getIOSVersion(): string | null {
    if (!this.isIOS()) return null;
    const match = navigator.userAgent.match(/(?:CPU (?:iPhone )?OS|iPhone OS) (\d+)[._](\d+)(?:[._](\d+))?/i);
    if (!match) return null;
    return [match[1], match[2], match[3]].filter(Boolean).join('.');
  }

  private recordFailure(reason: Exclude<PushFailureReason, null>, error?: unknown): void {
    this.lastFailureReason = reason;
    this.lastFailureMessage = error === undefined ? null : this.errorToMessage(error);
    this.lastFailureAt = new Date().toISOString();
  }

  private clearFailure(): void {
    this.lastFailureReason = null;
    this.lastFailureMessage = null;
    this.lastFailureAt = null;
  }

  private errorToMessage(error: unknown): string {
    if (error instanceof DOMException) return `${error.name}: ${error.message}`;
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
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
