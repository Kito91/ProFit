import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Crown, Check, Zap,
  Brain, Dumbbell, Flame, BarChart2, Bell, Star, Lock, Tag, Loader2
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
type PlanViewState = 'pro' | 'trial' | 'expired' | 'free';

const getProfilePlanState = (user: any): PlanViewState => {
  if (user?.role === 'admin' || user?.is_influencer) return 'pro';

  const plan = String(user?.plan || user?.plan_type || '').trim().toLowerCase();
  const subscriptionStatus = String(user?.subscription_status || user?.plan_status || '').trim().toLowerCase();
  const expirationValue = user?.end_date || user?.plan_expiration;
  const expirationDate = expirationValue ? new Date(expirationValue) : null;
  const hasValidExpiration = !!expirationDate && !Number.isNaN(expirationDate.getTime());
  const isExpired = hasValidExpiration && expirationDate.getTime() <= Date.now();
  const isActive = subscriptionStatus === 'ativo' || subscriptionStatus === 'active';
  const isFree = plan === 'free' || plan === 'gratuito';
  const isPaidPlan = ['pro', 'premium', 'monthly', 'annual', 'mensal', 'anual'].includes(plan);

  if (isExpired && (isPaidPlan || !!expirationValue)) return 'expired';
  if (isActive && !isExpired && !isFree) return 'pro';

  const createdAt = user?.created_at ? new Date(user.created_at) : null;
  const hasValidCreationDate = !!createdAt && !Number.isNaN(createdAt.getTime());
  const daysSinceCreation = hasValidCreationDate
    ? (Date.now() - createdAt.getTime()) / 86400000
    : FREE_TRIAL_DAYS;

  if (!isActive && daysSinceCreation < FREE_TRIAL_DAYS) return 'trial';
  return 'free';
};

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
  const [planState,      setPlanState]      = useState<PlanViewState>(() => getProfilePlanState(user));
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [couponCode,     setCouponCode]     = useState('');
  const [showCoupon,     setShowCoupon]     = useState(false);

  useEffect(() => {
    const profilePlanState = getProfilePlanState(user);
    setPlanState(profilePlanState);

    if (!user?.id) return;

    let isCancelled = false;
    if (user?.id) api.user.updateFunnelStep('PLAN_VIEWED').catch(() => {});

    api.subscription.getStatus().then((s: any) => {
      if (isCancelled) return;

      const trialDaysLeft = typeof s?.trial_days_left === 'number' ? s.trial_days_left : 0;

      if (s?.is_trial === true) {
        setPlanState(trialDaysLeft > 0 ? 'trial' : profilePlanState === 'expired' ? 'expired' : 'free');
        return;
      }

      if (s?.is_pro === true) {
        setPlanState('pro');
        return;
      }

      if (s?.is_pro === false) {
        setPlanState(profilePlanState === 'expired' ? 'expired' : 'free');
        return;
      }

      setPlanState(profilePlanState);
    }).catch(() => {
      if (!isCancelled) setPlanState(profilePlanState);
    });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const selectedPlan  = PLANS.find(p => p.id === selected)!;
  const isPro = planState === 'pro';
  const showPurchaseOptions = !isPro;
  const expirationValue = user?.end_date || user?.plan_expiration;
  const expirationDate = expirationValue ? new Date(expirationValue) : null;
  const formattedExpiration = expirationDate && !Number.isNaN(expirationDate.getTime())
    ? expirationDate.toLocaleDateString('pt-PT')
    : null;

  const handlePay = async () => {
    setError(null);
    setLoading(true);
    try {
      const body: { plan_type: 'monthly' | 'annual'; phone?: string; coupon_code?: string } = {
        plan_type: selected,
      };
      if (user?.phone) body.phone = user.phone;
      if (couponCode.trim()) body.coupon_code = couponCode.trim();

      const result = await api.payments.lojouCheckout(body);
      window.location.href = result.checkout_url;
    } catch (err: any) {
      setError(err?.message || 'Erro ao iniciar pagamento. Tenta novamente.');
    } finally {
      setLoading(false);
    }
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
                {formattedExpiration
                  ? `Válido até ${formattedExpiration}`
                  : 'Acesso ilimitado ativo'}
              </p>
            </div>
          </div>
        ) : planState === 'expired' ? (
          <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-red-400">Plano Pro expirado</p>
              <p className="text-[12px] text-slate-500">Escolha um plano para renovar o seu acesso</p>
            </div>
          </div>
        ) : planState === 'free' ? (
          <div className="rounded-2xl p-4 bg-slate-500/10 border border-slate-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-300">Plano Free</p>
              <p className="text-[12px] text-slate-500">Escolha um plano Pro para continuar usando o app</p>
            </div>
          </div>
        ) : null}

        {/* ── Seleção de Plano ── */}
        {showPurchaseOptions && (
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
      {showPurchaseOptions && (
        <div className="fixed bottom-0 left-0 right-0 z-40">
          <div className="max-w-md mx-auto px-5 pb-6 pt-4 bg-gradient-to-t from-[#0A0F14] via-[#0A0F14]/97 to-transparent space-y-3">

            {/* Coupon toggle */}
            <div>
              {!showCoupon ? (
                <button
                  onClick={() => setShowCoupon(true)}
                  className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-[#22C55E] transition-colors"
                >
                  <Tag className="w-3.5 h-3.5" />
                  Tenho um código de desconto
                </button>
              ) : (
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Código de desconto (opcional)"
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-[#22C55E]/50 focus:ring-1 focus:ring-[#22C55E]/20 transition-all"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <p className="text-[12px] text-red-400 font-medium px-1">{error}</p>
            )}

            {/* Plan summary */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[13px] text-slate-400">
                Plano <strong className="text-white">{selectedPlan.label}</strong>
              </span>
              <span className="text-[13px] font-bold text-white">
                {selectedPlan.priceLabel}<span className="text-slate-500 font-normal">{selectedPlan.period}</span>
              </span>
            </div>

            <button
              onClick={handlePay}
              disabled={loading}
              className="btn-primary shadow-xl shadow-[#22C55E]/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <Crown className="w-5 h-5" />
              }
              {loading ? 'A processar...' : 'Pagar Agora'}
            </button>

            <p className="text-center text-[11px] text-slate-600">
              Pagamento via M-Pesa ou e-Mola · Acesso imediato após confirmação
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
