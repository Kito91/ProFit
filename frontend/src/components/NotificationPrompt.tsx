import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, CheckCircle2, ShieldCheck, Loader2, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

export const NotificationPrompt = () => {
  const { user, isAuthenticated } = useAuth();
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'prompt' | 'loading' | 'success' | 'denied' | 'ios-guide'>('prompt');
  const [isManualAction, setIsManualAction] = useState(false);

  const handleEnable = useCallback(async (manualAction = false) => {
    if (!isAuthenticated) return;
    
    // Avoid redundant registration if already successful in this session
    if (sessionStorage.getItem('notification_registered') && notificationService.getPermissionStatus() === 'granted') {
      setStatus('success');
      setTimeout(() => setShow(false), 2000);
      return;
    }

    setStatus('loading');
    try {
      const success = await notificationService.subscribe();
      
      if (success) {
        setStatus('success');
        sessionStorage.setItem('notification_registered', 'true');
      } else {
        // If it's a manual click, we can show it's denied/failed
        // If it was auto-trigger, we just keep quiet
        if (manualAction || isManualAction) {
          setStatus('denied');
        } else {
          setShow(false);
        }
      }
      
      if (success) {
        // Removed client-side test notification to avoid duplication with backend welcome push
        setTimeout(() => setShow(false), 3000);
      } else {
        setShow(true);
      }
    } catch (err) {
      console.error('[NotificationPrompt] Subscription error:', err);
      setStatus('denied');
      setShow(true); 
    }
  }, [isAuthenticated, isManualAction]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // SUPPRESS on Quiz page - Don't annoy user during onboarding
    if (window.location.pathname.startsWith('/quiz')) return;

    // iOS non-PWA: show Add to Home Screen guide instead
    if (notificationService.isIOSNotPWA()) {
      const timer = setTimeout(() => {
        if (!localStorage.getItem('notification_prompt_dismissed')) {
          setStatus('ios-guide');
          setShow(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    const isStandalone = notificationService.isStandalone();
    const permission = Notification.permission;

    if (permission === 'granted') {
      if (sessionStorage.getItem('notification_registered')) {
        setShow(false);
        return;
      }
      handleEnable();
      return;
    }

    if (permission === 'default') {
      const delay = isStandalone ? 1500 : 4000;
      const timer = setTimeout(() => {
        if (!localStorage.getItem('notification_prompt_dismissed')) {
          setShow(true);
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, handleEnable]);

  // Auto-detect when user returns from settings after granting permission
  useEffect(() => {
    const handleFocus = () => {
      const permission = Notification.permission;
      if (permission === 'granted' && (status === 'denied' || status === 'prompt')) {
        console.log('[NotificationPrompt] Permission detected as granted on focus, activating...');
        handleEnable();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [status, handleEnable]);

  const handleDismiss = () => {
    localStorage.setItem('notification_prompt_dismissed', 'true');
    setShow(false);
  };

  // If user is not logged in, don't show the prompt at all
  if (!isAuthenticated) return null;

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-8 pointer-events-none">
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-sm pointer-events-auto"
          >
            {/* Card */}
            <div className="relative bg-[var(--bg-card)] rounded-[28px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-[var(--border-main)]">
              
              {/* Gradient header strip */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#56AB2F] via-[#A8E063] to-[#56AB2F]" />
              
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[var(--text-muted)] hover:bg-gray-200 hover:text-[var(--text-muted)] transition-all active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="p-6">
                {status === 'ios-guide' ? (
                  <div className="flex flex-col items-center text-center py-1">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 text-2xl">
                      📲
                    </div>
                    <h3 className="text-[17px] font-black text-[var(--text-main)] mb-1">Instale o app primeiro</h3>
                    <p className="text-[12px] text-[var(--text-muted)] mb-5 leading-relaxed">
                      No iOS, as notificações push só funcionam quando o app está instalado no ecrã inicial.
                    </p>
                    <div className="w-full space-y-2.5 text-left mb-5">
                      {[
                        { step: '1', icon: '⬆️', text: 'Toque no botão Partilhar na barra do Safari' },
                        { step: '2', icon: '➕', text: 'Selecione "Adicionar ao Ecrã Inicial"' },
                        { step: '3', icon: '🏠', text: 'Abra o ProFit pelo ícone no ecrã inicial' },
                        { step: '4', icon: '🔔', text: 'Active as notificações dentro do app' },
                      ].map(({ step, icon, text }) => (
                        <div key={step} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{step}</span>
                          <span className="text-base">{icon}</span>
                          <span className="text-[12px] text-[var(--text-muted)] font-medium leading-tight">{text}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleDismiss}
                      className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-[13px] active:scale-95 transition-all"
                    >
                      Entendi
                    </button>
                  </div>
                ) : status === 'success' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center py-2"
                  >
                    <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-7 h-7 text-green-600" />
                    </div>
                    <h3 className="text-lg font-black text-[var(--text-main)] mb-1">Notificações ativadas com sucesso 🔔</h3>
                    <p className="text-sm text-[var(--text-muted)] font-medium">Você agora receberá lembretes e atualizações do Profit.</p>
                  </motion.div>
                ) : status === 'denied' ? (
                  <div className="flex flex-col items-center text-center py-2">
                    <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mb-4">
                      <BellOff className="w-7 h-7 text-rose-500" />
                    </div>
                    <h3 className="text-lg font-black text-[var(--text-main)] mb-2">Acesso bloqueado</h3>
                    <div className="bg-rose-50 rounded-xl p-3 text-xs text-rose-600 font-medium leading-relaxed text-left mb-4">
                      Para ativar, clique no ícone de cadeado 🔒 na barra de endereços do navegador e altere <strong>Notificações</strong> para <strong>Permitir</strong>.
                    </div>
                    <button
                      onClick={() => handleEnable(true)}
                      className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verificar Novamente</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Icon Row */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#56AB2F] to-[#A8E063] rounded-[20px] flex items-center justify-center shadow-[0_8px_20px_rgba(86,171,47,0.3)]">
                        <Bell className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-[18px] font-black text-[var(--text-main)] leading-tight">Ativar notificações</h3>
                        <p className="text-[12px] text-[var(--text-muted)] font-semibold mt-0.5">Alertas inteligentes para você</p>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-2.5 mb-6">
                      {[
                        { emoji: '📊', text: 'Progresso da sua meta diária de calorias' },
                        { emoji: '🍽️', text: 'Lembretes personalizados de refeições' },
                        { emoji: '💡', text: 'Dicas e atualizações exclusivas do app' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                          <span className="text-base">{item.emoji}</span>
                          <span className="text-[13px] text-[var(--text-muted)] font-medium">{item.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => {
                        setIsManualAction(true);
                        handleEnable(true);
                      }}
                      disabled={status === 'loading'}
                      className="w-full py-4 bg-gradient-to-r from-[#56AB2F] to-[#A8E063] text-white rounded-[18px] font-black text-[14px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_8px_24px_rgba(86,171,47,0.35)] disabled:opacity-70"
                    >
                      {status === 'loading' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /><span>Ativando...</span></>
                      ) : (
                        <><ShieldCheck className="w-4 h-4" /><span>Ativar Notificações</span></>
                      )}
                    </button>

                    {/* Skip link */}
                    <button
                      onClick={handleDismiss}
                      className="w-full mt-3 py-2 text-[12px] text-[var(--text-muted)] font-semibold hover:text-[var(--text-muted)] transition-colors"
                    >
                      Agora não
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
