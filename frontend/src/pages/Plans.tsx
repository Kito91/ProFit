import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Crown, Check, Zap, Clock,
  Brain, Dumbbell, Flame, BarChart2, Bell, Star, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const FREE_TRIAL_DAYS = 3;

const PLANS = [
  {
    id: 'monthly',
    label: 'Mensal',
    price: 299,
    priceLabel: '299 MZN',
    period: '/mês',
    perDay: '~10 MZN/dia',
    badge: null,
    savings: null,
  },
  {
    id: 'annual',
    label: 'Anual',
    price: 2490,
    priceLabel: '2.490 MZN',
    period: '/ano',
    perDay: '~7 MZN/dia',
    badge: 'Melhor valor',
    savings: 'Poupa 30%',
  },
] as const;

type PlanId = typeof PLANS[number]['id'];

const FEATURES = [
  { icon: Brain,     label: 'Plano alimentar com IA'            },
  { icon: Dumbbell,  label: 'Treinos personalizados com IA'     },
  { icon: Flame,     label: 'Análise de refeições em tempo real'},
  { icon: BarChart2, label: 'Histórico completo de evolução'    },
  { icon: Bell,      label: 'Lembretes inteligentes diários'    },
  { icon: Star,      label: 'Consultoria IA prioritária 24/7'   },
  { icon: Zap,       label: 'Atualizações exclusivas'           },
];

export const Plans = () => {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [selected,       setSelected]       = useState<PlanId>('monthly');
  const [daysUsed,       setDaysUsed]       = useState(FREE_TRIAL_DAYS);
  const [daysLeft,       setDaysLeft]       = useState(0);
  const [isTrialActive,  setIsTrialActive]  = useState(false);
  const [isPro,          setIsPro]          = useState(false);

  useEffect(() => {
    if (user?.id) api.user.updateFunnelStep('PLAN_VIEWED').catch(() => {});

    api.subscription.getStatus().then((s: any) => {
      const isTrial = s?.is_trial ?? false;
      const left    = typeof s?.trial_days_left === 'number' ? s.trial_days_left : 0;
      const paid    = (s?.is_pro ?? false) && !isTrial;
      const used    = Math.max(0, FREE_TRIAL_DAYS - left);
      setDaysUsed(used);
      setDaysLeft(left);
      setIsPro(paid);
      setIsTrialActive(isTrial && left > 0);
    }).catch(() => {
      const createdAt = user?.created_at ? new Date(user.created_at) : null;
      const used = createdAt
        ? Math.floor((Date.now() - createdAt.getTime()) / 86400000)
        : FREE_TRIAL_DAYS;
      const left = Math.max(0, FREE_TRIAL_DAYS - used);
      const pro  = user?.subscription_status === 'ativo';
      setDaysUsed(used);
      setDaysLeft(left);
      setIsPro(pro);
      setIsTrialActive(left > 0 && !pro);
    });
  }, [user?.id]);

  const selectedPlan = PLANS.find(p => p.id === selected)!;
  const trialBarWidth = Math.min(100, (daysUsed / FREE_TRIAL_DAYS) * 100);

  const handlePay = () => {
    const params = new URLSearchParams({
      email: user?.email || '',
      name:  user?.name  || '',
      plan:  selected,
    });
    navigate(`/checkout?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#0A0F14] text-white pb-36 font-sans">

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-[#0A0F14]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-md mx-auto px-5 h-[60px] flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-[17px] font-bold">Planos ProFit</h1>
            <p className="text-[12px] text-slate-500">Escolha e pague</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-6 space-y-5">

        {/* ── Status banner ── */}
        {isPro ? (
          <div className="rounded-2xl p-4 bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/20 flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-[#22C55E]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#22C55E]">Plano Pro Ativo</p>
              <p className="text-[12px] text-slate-500">
                {user?.end_date
                  ? `Válido até ${new Date(user.end_date).toLocaleDateString('pt-PT')}`
                  : 'Acesso ilimitado ativo'}
              </p>
            </div>
          </div>
        ) : isTrialActive ? (
          <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-amber-400">
                  Free Trial — {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}
                </p>
                <p className="text-[12px] text-slate-500">Assine antes de terminar para manter o acesso</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${trialBarWidth}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-amber-400 rounded-full"
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-600">Dia 1</span>
              <span className="text-[10px] text-slate-600">Dia {FREE_TRIAL_DAYS}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-red-400">Trial expirado</p>
              <p className="text-[12px] text-slate-500">Assine o Pro para continuar usando o app</p>
            </div>
          </div>
        )}

        {/* ── Seleção de Plano ── */}
        {!isPro && (
          <>
            <p className="section-label">Escolha o período</p>
            <div className="grid grid-cols-2 gap-3">
              {PLANS.map(plan => {
                const isActive = selected === plan.id;
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelected(plan.id)}
                    className={`relative rounded-2xl p-4 text-left transition-all active:scale-95 border-2 ${
                      isActive
                        ? 'bg-[#22C55E]/10 border-[#22C55E]/60 shadow-lg shadow-[#22C55E]/10'
                        : 'bg-white/[0.03] border-white/10'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#22C55E] text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap">
                        {plan.badge}
                      </span>
                    )}

                    {/* Radio indicator */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'text-[#22C55E]' : 'text-slate-500'}`}>
                        {plan.label}
                      </span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        isActive ? 'border-[#22C55E]' : 'border-white/20'
                      }`}>
                        {isActive && <div className="w-2 h-2 rounded-full bg-[#22C55E]" />}
                      </div>
                    </div>

                    <div className="mb-0.5">
                      <span className="text-[24px] font-black leading-none">{plan.priceLabel}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{plan.period}</p>

                    {plan.savings && (
                      <div className="mt-2 inline-block bg-[#22C55E]/15 text-[#22C55E] text-[10px] font-bold px-2 py-0.5 rounded-lg">
                        {plan.savings}
                      </div>
                    )}
                    <p className={`text-[10px] mt-1 ${isActive ? 'text-slate-400' : 'text-slate-600'}`}>
                      {plan.perDay}
                    </p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Benefícios incluídos ── */}
        <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
          <p className="section-label mb-4">Tudo incluído no Pro</p>
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#22C55E]/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#22C55E]" />
                </div>
                <span className="text-[13px] font-medium text-slate-200">{label}</span>
                <Check className="w-4 h-4 text-[#22C55E] ml-auto flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Botão Pagar ── */}
      {!isPro && (
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <div className="max-w-md mx-auto px-5 pb-6 pt-3 bg-gradient-to-t from-[#0A0F14] via-[#0A0F14]/95 to-transparent">

            {/* Resumo do plano selecionado */}
            <div className="flex items-center justify-between px-1 mb-3">
              <span className="text-[13px] text-slate-400">
                Plano <strong className="text-white">{selectedPlan.label}</strong>
              </span>
              <span className="text-[13px] font-bold text-white">
                {selectedPlan.priceLabel}<span className="text-slate-500 font-normal">{selectedPlan.period}</span>
              </span>
            </div>

            <button
              onClick={handlePay}
              className="btn-primary shadow-xl shadow-[#22C55E]/20"
            >
              <Crown className="w-5 h-5" />
              Pagar Agora
            </button>

            <p className="text-center text-[11px] text-slate-600 mt-2">
              Pagamento via M-Pesa ou e-Mola · Acesso imediato após confirmação
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
