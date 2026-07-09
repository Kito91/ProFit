import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Clock, MessageCircle, LogOut, ArrowRight, Zap, Brain, Dumbbell, BarChart2, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const FREE_TRIAL_DAYS = 3;

const BENEFITS = [
  { icon: Brain,     label: 'Plano alimentar com IA'         },
  { icon: Dumbbell,  label: 'Treinos personalizados com IA'  },
  { icon: BarChart2, label: 'Histórico de evolução completo' },
  { icon: Bell,      label: 'Lembretes inteligentes diários' },
];

const RenovarPlano = () => {
  const navigate = useNavigate();
  const { logout, user, refreshUser } = useAuth();

  const { daysUsed, isExpiredSubscription } = useMemo(() => {
    const createdAt = user?.created_at ? new Date(user.created_at) : null;
    const daysUsed = createdAt
      ? Math.floor((Date.now() - createdAt.getTime()) / 86400000)
      : FREE_TRIAL_DAYS;
    const subExpired = !!(user?.end_date && new Date(user.end_date) < new Date());
    const hadSub = !!user?.end_date;
    return { daysUsed, isExpiredSubscription: hadSub && subExpired };
  }, [user]);

  // Redirect if subscription becomes active
  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        const s = await api.subscription.validate();
        if (s?.is_active) { navigate('/home', { replace: true }); return; }
      } catch (_) {}
      // Fallback: check local user state
      const subExpired = user?.end_date && new Date(user.end_date) < new Date();
      const isActive = user?.subscription_status === 'ativo' && !subExpired;
      if (isActive) navigate('/home', { replace: true });
    };

    checkAndRedirect();
    const interval = setInterval(() => { refreshUser(); checkAndRedirect(); }, 10000);
    return () => clearInterval(interval);
  }, [user, navigate, refreshUser]);

  const isWaiting = user?.subscription_status === 'pending' || user?.subscription_status === 'processing';

  const title = isWaiting
    ? 'A verificar pagamento…'
    : isExpiredSubscription
    ? 'Assinatura expirada'
    : 'Trial gratuito terminado';

  const subtitle = isWaiting
    ? 'Aguardando confirmação do seu pagamento. Isto pode levar alguns minutos.'
    : isExpiredSubscription
    ? 'A tua assinatura Pro expirou. Renova para continuar a evoluir.'
    : `Usaste os teus ${FREE_TRIAL_DAYS} dias gratuitos. Assina o Pro para continuar.`;

  return (
    <div className="min-h-screen bg-[#0A0F14] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-[#22C55E]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-[#22C55E]/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[400px] relative z-10"
      >

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-[#22C55E]/20 rounded-[28px] blur-2xl animate-pulse" />
            <div className="w-20 h-20 bg-white/[0.04] border border-white/10 rounded-[28px] flex items-center justify-center relative shadow-inner">
              {isWaiting
                ? <Clock className="w-10 h-10 text-amber-400" />
                : <Crown className="w-10 h-10 text-[#22C55E]" />
              }
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-[24px] font-black text-white leading-tight mb-2">{title}</h1>
          <p className="text-[14px] text-slate-400 leading-relaxed px-2">{subtitle}</p>
        </div>

        {/* Trial progress (only for trial expiry) */}
        {!isExpiredSubscription && !isWaiting && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-4 mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[12px] text-slate-500">Dias de trial usados</span>
              <span className="text-[12px] font-bold text-white">{Math.min(daysUsed, FREE_TRIAL_DAYS)}/{FREE_TRIAL_DAYS}</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-red-400 rounded-full w-full" />
            </div>
            <p className="text-[11px] text-red-400 mt-2 text-center font-medium">Trial expirado</p>
          </div>
        )}

        {/* Waiting state */}
        {isWaiting && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-amber-400">Pagamento em processamento</p>
              <p className="text-[11px] text-slate-500">A verificar automaticamente a cada 10 segundos</p>
            </div>
          </div>
        )}

        {/* Benefits */}
        {!isWaiting && (
          <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-4 mb-5">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Com o Pro tens acesso a</p>
            <div className="space-y-2.5">
              {BENEFITS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl bg-[#22C55E]/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-[#22C55E]" />
                  </div>
                  <span className="text-[13px] text-slate-300">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price note */}
        {!isWaiting && (
          <div className="flex items-center justify-center gap-2 mb-5">
            <Zap className="w-4 h-4 text-[#22C55E]" />
            <span className="text-[12px] text-slate-500">
              <strong className="text-white">299 MZN/mês</strong> · ~10 MZN por dia
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {!isWaiting && (
            <button
              onClick={() => navigate(`/checkout?email=${encodeURIComponent(user?.email || '')}`)}
              className="btn-primary"
            >
              <Crown className="w-5 h-5" />
              Assinar Plano Pro
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              const msg = encodeURIComponent(`Olá, quero assinar o ProFit Pro. Email: ${user?.email}`);
              window.open(`https://wa.me/258842152862?text=${msg}`, '_blank');
            }}
            className="w-full h-[52px] rounded-[var(--radius-xl)] font-bold text-[15px] text-white border border-white/10 flex items-center justify-center gap-2 hover:bg-white/[0.03] transition-all active:scale-95"
          >
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            Suporte via WhatsApp
          </button>

          <div className="flex justify-center pt-2">
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair da conta
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default RenovarPlano;
