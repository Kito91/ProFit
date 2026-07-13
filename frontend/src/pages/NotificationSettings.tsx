import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bell, BellOff, UtensilsCrossed, Droplets, Moon,
  Dumbbell, Mail, Clock, ChevronRight, CheckCircle2, AlertCircle,
  Coffee, Salad, Apple, Soup
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const PREFS_KEY = 'profit_notif_prefs';

interface NotifPrefs {
  breakfast: boolean;
  log_meals: boolean;
  lunch: boolean;
  water: boolean;
  snack: boolean;
  dinner: boolean;
  sleep: boolean;
  workout: boolean;
  email: boolean;
}

const defaultPrefs: NotifPrefs = {
  breakfast: true,
  log_meals: true,
  lunch: true,
  water: true,
  snack: true,
  dinner: true,
  sleep: true,
  workout: true,
  email: false,
};

const REMINDERS = [
  { key: 'breakfast', icon: Coffee,          label: 'Café da manhã',        time: '08:00', color: '#F59E0B' },
  { key: 'log_meals', icon: UtensilsCrossed, label: 'Registrar refeições',  time: '10:00', color: '#8B5CF6' },
  { key: 'lunch',     icon: Salad,           label: 'Almoço',               time: '12:00', color: '#22C55E' },
  { key: 'water',     icon: Droplets,        label: 'Beber água',           time: '13:00', color: '#3B82F6' },
  { key: 'snack',     icon: Apple,           label: 'Lanche',               time: '16:00', color: '#EF4444' },
  { key: 'dinner',    icon: Soup,            label: 'Jantar',               time: '19:00', color: '#F97316' },
  { key: 'sleep',     icon: Moon,            label: 'Hora de dormir',       time: '21:00', color: '#6366F1' },
] as const;

// ─── Toggle Component ────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${value ? 'bg-[#56AB2F]' : 'bg-white/10'}`}
  >
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md ${value ? 'left-[26px]' : 'left-0.5'}`}
    />
  </button>
);

// ─── Row Component ───────────────────────────────────────────────────────────
const PrefRow = ({
  icon: Icon, label, time, color, value, onChange, disabled = false,
}: {
  icon: React.ElementType; label: string; time?: string; color?: string;
  value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) => (
  <div className={`flex items-center gap-3 py-3.5 transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
    <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[14px] font-semibold text-white">{label}</p>
      {time && <p className="text-[12px] text-slate-500">{time}</p>}
    </div>
    <Toggle value={value} onChange={onChange} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
export const NotificationSettings: React.FC = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [pushStatus,    setPushStatus]    = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushRequiresInstall, setPushRequiresInstall] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [prefs,         setPrefs]         = useState<NotifPrefs>(defaultPrefs);
  const [workoutDays,   setWorkoutDays]   = useState<string[]>([]);
  const [workoutTime,   setWorkoutTime]   = useState<string | null>(null);

  const refreshPushState = async () => {
    const state = await notificationService.getState();
    setPushStatus(state.permission);
    setPushSubscribed(state.subscribed);
    setPushRequiresInstall(state.requiresInstall);
    return state;
  };

  // ── Load state ─────────────────────────────────────────────────────────────
  useEffect(() => {
    refreshPushState();

    // Load server settings (merge with local fallback)
    api.notifications.getSettings().then((s: any) => {
      if (s) {
        const merged: NotifPrefs = { ...defaultPrefs };
        if (typeof s.breakfast  === 'boolean') merged.breakfast  = s.breakfast;
        if (typeof s.log_meals  === 'boolean') merged.log_meals  = s.log_meals;
        if (typeof s.lunch      === 'boolean') merged.lunch      = s.lunch;
        if (typeof s.water      === 'boolean') merged.water      = s.water;
        if (typeof s.snack      === 'boolean') merged.snack      = s.snack;
        if (typeof s.dinner     === 'boolean') merged.dinner     = s.dinner;
        if (typeof s.sleep      === 'boolean') merged.sleep      = s.sleep;
        if (typeof s.workout    === 'boolean') merged.workout    = s.workout;
        setPrefs(merged);
        localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
        if (s.notification_time) setWorkoutTime(s.notification_time);
      }
    }).catch(() => {
      // Fallback to localStorage
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) { try { setPrefs({ ...defaultPrefs, ...JSON.parse(raw) }); } catch (_) {} }
    });

    // Load email preferences
    api.emailPreferences.get().then((ep: any) => {
      if (ep && typeof ep.email_notifications === 'boolean') {
        setPrefs(prev => ({ ...prev, email: ep.email_notifications }));
      }
    }).catch(() => {});

    // Load workout days from custom workouts
    api.customWorkouts.list().then((list: any[]) => {
      if (!Array.isArray(list) || list.length === 0) return;
      const w = list[0];
      if (Array.isArray(w.days) && w.days.length > 0) {
        const DAYS_SHORT_MAP = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
        setWorkoutDays(w.days.map((i: number) => DAYS_SHORT_MAP[i]).filter(Boolean));
      }
      if (w.workout_time) setWorkoutTime(w.workout_time);
    }).catch(() => {});
  }, []);

  // ── Persist prefs ──────────────────────────────────────────────────────────
  const updatePref = (key: keyof NotifPrefs, val: boolean) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    // Sync non-email keys to server notification settings
    if (key !== 'email') {
      api.notifications.updateSettings({ [key]: val }).catch(() => {});
    }
  };

  // ── Push toggle ────────────────────────────────────────────────────────────
  const handlePushToggle = async () => {
    if (pushRequiresInstall) {
      toast('No iPhone/iPad, adicione o ProFit ao Ecrã Inicial e abra-o pelo ícone para ativar notificações.', { icon: '📲' });
      return;
    }
    if (pushStatus === 'unsupported') {
      toast.error('Notificações não suportadas neste navegador');
      return;
    }
    if (pushStatus === 'denied') {
      toast('Ative as notificações nas configurações do seu navegador', { icon: 'ℹ️' });
      return;
    }

    if (pushStatus === 'granted' && pushSubscribed) {
      setIsSubscribing(true);
      try {
        const ok = await notificationService.unsubscribe();
        await refreshPushState();
        if (!ok) throw new Error('Local push unsubscribe failed.');
        toast.success('Notificações desativadas');
      } catch (_) {
        toast.error('Erro ao desativar notificações');
      } finally {
        setIsSubscribing(false);
      }
    } else {
      setIsSubscribing(true);
      try {
        const ok = await notificationService.subscribe();
        if (ok) {
          await refreshPushState();
          toast.success('Notificações ativadas! 🔔');
        } else {
          const state = await refreshPushState();
          if (state.permission !== 'denied') {
            toast.error('Não foi possível registrar este dispositivo');
            return;
          }
          toast.error('Permissão negada pelo navegador');
        }
      } catch (_) {
        toast.error('Erro ao ativar notificações');
      } finally {
        setIsSubscribing(false);
      }
    }
  };

  // ── Email toggle ───────────────────────────────────────────────────────────
  const handleEmailToggle = async (val: boolean) => {
    updatePref('email', val);
    try {
      await api.emailPreferences.update({ email_notifications: val });
    } catch (_) {}
    toast.success(val ? 'E-mails ativados' : 'E-mails desativados');
  };

  const isPushActive = pushStatus === 'granted' && pushSubscribed;
  const isPushDenied = pushStatus === 'denied';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0F14] text-white pb-28 font-sans">

      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0F14]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-md mx-auto px-5 h-[60px] flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-[17px] font-bold">Notificações</h1>
            <p className="text-[12px] text-slate-500">Configurar alertas</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-6 space-y-5">

        {/* ── Push Principal ── */}
        <div
          className={`rounded-3xl p-5 border transition-all ${
            isPushActive
              ? 'bg-[#56AB2F]/10 border-[#56AB2F]/20'
              : 'bg-white/[0.03] border-white/[0.06]'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isPushActive ? 'bg-[#56AB2F]/20' : 'bg-white/5'}`}>
              {isPushActive ? <Bell className="w-6 h-6 text-[#56AB2F]" /> : <BellOff className="w-6 h-6 text-slate-500" />}
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold">Notificações Push</p>
              <p className={`text-[12px] font-medium mt-0.5 ${isPushActive ? 'text-[#56AB2F]' : 'text-slate-500'}`}>
                {isPushActive ? 'Ativado' : isPushDenied ? 'Bloqueado pelo navegador' : 'Desativado'}
              </p>
            </div>
            {isPushDenied ? (
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
            ) : (
              <Toggle value={isPushActive} onChange={handlePushToggle} />
            )}
          </div>

          {isSubscribing && (
            <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-400">
              <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
              A processar...
            </div>
          )}

          {isPushDenied && (
            <div className="mt-3 p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
              <p className="text-[12px] text-red-300 leading-relaxed">
                As notificações estão bloqueadas. Aceda às configurações do seu navegador e ative as notificações para <strong>myprofittness.com</strong>.
              </p>
            </div>
          )}
        </div>

        {/* ── Lembretes Diários ── */}
        <div className="bg-white/[0.03] rounded-3xl border border-white/[0.06] px-5 py-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest py-3">Lembretes Diários</p>
          <div className="divide-y divide-white/[0.04]">
            {REMINDERS.map(({ key, icon, label, time, color }) => (
              <PrefRow
                key={key}
                icon={icon}
                label={label}
                time={time}
                color={color}
                value={prefs[key as keyof NotifPrefs]}
                onChange={v => updatePref(key as keyof NotifPrefs, v)}
                disabled={!isPushActive}
              />
            ))}
          </div>
        </div>

        {/* ── Treino ── */}
        <div className="bg-white/[0.03] rounded-3xl border border-white/[0.06] px-5 py-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest py-3">Treino</p>

          <PrefRow
            icon={Dumbbell}
            label="Lembrete de treino"
            color="#56AB2F"
            value={prefs.workout}
            onChange={v => updatePref('workout', v)}
            disabled={!isPushActive}
          />

          {(workoutDays.length > 0 || workoutTime) && (
            <div className="pb-3 pt-1">
              <div className="bg-[#56AB2F]/5 rounded-2xl p-3 border border-[#56AB2F]/15">
                {workoutDays.length > 0 && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex gap-1 flex-wrap">
                      {workoutDays.map(d => (
                        <span key={d} className="text-[11px] font-bold bg-[#56AB2F]/15 text-[#56AB2F] px-2 py-0.5 rounded-lg">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {workoutTime && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[12px] text-slate-400">Lembrete às <strong className="text-white">{workoutTime}</strong></span>
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate('/workout/manual')}
                className="mt-2 w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition-all"
              >
                <span className="text-[12px] text-slate-500">Alterar horário de treino</span>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}

          {workoutDays.length === 0 && (
            <div className="pb-3">
              <button
                onClick={() => navigate('/workout/manual')}
                className="w-full flex items-center justify-between p-3 bg-white/[0.02] rounded-2xl border border-dashed border-white/10 hover:border-[#56AB2F]/30 transition-all"
              >
                <span className="text-[13px] text-slate-500">Configurar dias de treino</span>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}
        </div>

        {/* ── E-mail ── */}
        <div className="bg-white/[0.03] rounded-3xl border border-white/[0.06] px-5 py-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest py-3">E-mail</p>

          <PrefRow
            icon={Mail}
            label="Notificações por e-mail"
            color="#3B82F6"
            value={prefs.email}
            onChange={handleEmailToggle}
          />

          {user?.email && (
            <div className="pb-3 pt-1">
              <div className="flex items-center gap-2 p-3 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
                <Mail className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                <span className="text-[12px] text-slate-400 truncate">{user.email}</span>
                {prefs.email && <CheckCircle2 className="w-3.5 h-3.5 text-[#56AB2F] flex-shrink-0 ml-auto" />}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
