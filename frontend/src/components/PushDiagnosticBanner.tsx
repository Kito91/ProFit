import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Info,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import {
  notificationService,
  type PushDiagnosticReport,
  type PushDiagnosticSeverity,
} from '../services/notificationService';

const severityStyles: Record<PushDiagnosticSeverity, {
  container: string;
  icon: string;
  badge: string;
}> = {
  success: {
    container: 'bg-emerald-500/10 border-emerald-500/25',
    icon: 'bg-emerald-500/15 text-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-600',
  },
  info: {
    container: 'bg-blue-500/10 border-blue-500/25',
    icon: 'bg-blue-500/15 text-blue-500',
    badge: 'bg-blue-500/15 text-blue-600',
  },
  warning: {
    container: 'bg-amber-500/10 border-amber-500/25',
    icon: 'bg-amber-500/15 text-amber-500',
    badge: 'bg-amber-500/15 text-amber-600',
  },
  error: {
    container: 'bg-rose-500/10 border-rose-500/25',
    icon: 'bg-rose-500/15 text-rose-500',
    badge: 'bg-rose-500/15 text-rose-600',
  },
};

const permissionLabel = (permission: PushDiagnosticReport['permission']) => ({
  default: 'ainda não solicitada',
  granted: 'permitida',
  denied: 'bloqueada',
  unsupported: 'indisponível',
}[permission]);

const workerStateLabel = (state: string) => ({
  parsed: 'carregado',
  installing: 'instalando',
  installed: 'instalado/aguardando',
  activating: 'ativando',
  activated: 'ativo',
  redundant: 'descartado (redundant)',
  'registered-without-worker': 'registrado sem worker',
  'not-registered': 'não registrado',
}[state] || state);

export const PushDiagnosticBanner = () => {
  const [report, setReport] = useState<PushDiagnosticReport | null>(null);
  const [checking, setChecking] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);

  const inspect = useCallback(async (prepare = false, showSpinner = false) => {
    if (showSpinner && mountedRef.current) setChecking(true);
    try {
      if (prepare) await notificationService.prepareForPermissionPrompt();
      const nextReport = await notificationService.getDiagnosticReport();
      if (mountedRef.current) setReport(nextReport);
    } catch (error) {
      console.error('[PushDiagnostic] Could not create diagnostic report.', error);
    } finally {
      if (showSpinner && mountedRef.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void inspect(false, false);

    // Preparation never requests permission; it only lets the report capture
    // the real registration/activation result from WebKit.
    const prepareTimer = window.setTimeout(() => void inspect(true, true), 250);
    const interval = window.setInterval(() => void inspect(false, false), 5000);
    const handleFocus = () => void inspect(false, false);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void inspect(false, false);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(prepareTimer);
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [inspect]);

  if (!report || report.code === 'active') return null;

  const style = severityStyles[report.severity];
  const StatusIcon = report.severity === 'error'
    ? ShieldAlert
    : report.severity === 'warning'
      ? AlertTriangle
      : report.severity === 'success'
        ? CheckCircle2
        : Info;

  const details = [
    ['Código', report.code],
    ['Dispositivo', report.isIOS ? `iOS ${report.iosVersion || 'versão não identificada'}` : 'não iOS'],
    ['Aberto como PWA', report.standalone ? 'sim' : 'não'],
    ['Contexto seguro', report.secureContext ? 'HTTPS/sim' : 'não'],
    ['Service Worker', `${report.serviceWorkerRegistered ? 'registrado' : 'não registrado'} · ${workerStateLabel(report.serviceWorkerState)}`],
    ['Página controlada', report.serviceWorkerControlled ? 'sim' : 'não'],
    ['PushManager', report.pushManagerAvailable ? 'disponível' : 'indisponível'],
    ['Permissão', permissionLabel(report.permission)],
    ['Subscrição push', report.subscriptionPresent ? 'presente' : 'ausente'],
    ['Chave VAPID', report.vapidValid ? 'válida' : report.vapidConfigured ? 'inválida' : 'ausente'],
    ['Registro da conta', report.serverRegistrationKnown ? 'confirmado neste navegador' : 'não confirmado'],
    ['Scope', report.serviceWorkerScope || 'indisponível'],
    ['Script', report.serviceWorkerScriptURL || '/sw.js ainda não associado'],
    ['Última falha', report.lastFailureReason || 'nenhuma'],
    ['Mensagem técnica', report.lastFailureMessage || report.inspectionError || 'nenhuma'],
    ['Verificado em', new Date(report.checkedAt).toLocaleString()],
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[PushDiagnostic] Could not copy report.', error);
    }
  };

  return (
    <section className={`mb-6 rounded-2xl border p-4 ${style.container}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${style.icon}`}>
          <StatusIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${style.badge}`}>
                Diagnóstico Web Push
              </span>
              <h2 className="text-sm font-black leading-tight text-[var(--text-main)]">{report.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => void inspect(true, true)}
              disabled={checking}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm transition-all active:scale-95 disabled:opacity-60"
              aria-label="Verificar notificações novamente"
              title="Verificar novamente"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="mt-2 text-xs font-medium leading-relaxed text-[var(--text-muted)]">{report.message}</p>
          <p className="mt-2 text-xs font-bold leading-relaxed text-[var(--text-main)]">
            Próximo passo: {report.recommendation}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setExpanded(value => !value)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[var(--text-main)] shadow-sm"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
            </button>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-card)] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[var(--text-main)] shadow-sm"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copiado' : 'Copiar relatório'}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-2 rounded-xl bg-[var(--bg-card)]/80 p-3">
          {details.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[108px_minmax(0,1fr)] gap-2 text-[10px] leading-relaxed">
              <span className="font-black uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
              <span className="break-words font-semibold text-[var(--text-main)]">{value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
