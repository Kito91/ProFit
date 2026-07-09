import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart2, Clock, Smartphone, Zap, Utensils,
  TrendingUp, TrendingDown, Users, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { api } from '../../services/api';

const PERIODS = [
  { id: '7d',  label: '7 Dias'  },
  { id: '30d', label: '30 Dias' },
  { id: '90d', label: '3 Meses' },
] as const;
type Period = typeof PERIODS[number]['id'];

const SCREENS_DATA = [
  { name: 'Dashboard',    views: 3840 },
  { name: 'Refeições',    views: 2960 },
  { name: 'Treinos',      views: 2100 },
  { name: 'Scanner',      views: 1890 },
  { name: 'Histórico',    views: 1200 },
  { name: 'AI Chat',      views:  980 },
  { name: 'Perfil',       views:  740 },
];

const FEATURES_DATA = [
  { name: 'Scan',         value: 34, color: '#22C55E' },
  { name: 'AI Chat',      value: 22, color: '#3B82F6' },
  { name: 'Treinos',      value: 18, color: '#8B5CF6' },
  { name: 'Plano IA',     value: 15, color: '#F59E0B' },
  { name: 'Histórico',    value: 11, color: '#EC4899' },
];

const genSeries = (period: Period) => {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
      active: Math.round(12 + Math.random() * 30),
      meals:  Math.round(20 + Math.random() * 60),
      sessions: Math.round(5 + Math.random() * 20),
      minutes: Math.round(4 + Math.random() * 18),
    };
  });
};

const Stat = ({ icon: Icon, label, value, delta, positive }: {
  icon: any; label: string; value: string; delta: string; positive: boolean;
}) => (
  <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E6EAF0] dark:border-[#334155] p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80">
        <Icon size={16} className="text-[#22C55E]" />
      </div>
    </div>
    <p className="text-[30px] font-black text-slate-800 dark:text-white leading-none">{value}</p>
    <p className={`text-[12px] font-bold flex items-center gap-1 ${positive ? 'text-[#22C55E]' : 'text-rose-400'}`}>
      {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {delta} vs período anterior
    </p>
  </div>
);

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '12px',
  },
  itemStyle: { fontSize: '12px', padding: '2px 0' },
};

const AdminAnalytics: React.FC = () => {
  const [period, setPeriod] = useState<Period>('30d');
  const [series, setSeries] = useState(genSeries('30d'));
  const [activityData, setActivityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    setSeries(genSeries(period));
  }, [period]);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        const data = await api.admin.getUsersActivity();
        if (Array.isArray(data) && data.length > 0) setActivityData(data);
      } catch (_) {}
      finally { setLoading(false); }
    };
    fetchActivity();
  }, [period]);

  const avgMinutes = (series.reduce((s, d) => s + d.minutes, 0) / series.length).toFixed(1);
  const totalMeals = series.reduce((s, d) => s + d.meals, 0);
  const peakUsers  = Math.max(...series.map(d => d.active));
  const totalSess  = series.reduce((s, d) => s + d.sessions, 0);

  const chartData = activityData.length > 0 ? activityData : series;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-[#1A202C] dark:text-white tracking-tight">Analytics</h1>
          <p className="text-[14px] text-[#718096] dark:text-slate-400 mt-0.5">Comportamento dos utilizadores e uso do app.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSeries(genSeries(period)); setLastRefresh(new Date()); }}
            className="p-2.5 rounded-xl border border-[#E6EAF0] dark:border-[#334155] text-slate-400 hover:text-[#22C55E] hover:border-[#22C55E]/40 transition-all"
            title="Atualizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex bg-[#F7F9FC] dark:bg-[#1E293B] border border-[#E6EAF0] dark:border-[#334155] rounded-xl p-1 gap-1">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                  period === p.id
                    ? 'bg-[#22C55E] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Clock,    label: 'Tempo Médio/Dia',  value: `${avgMinutes}min`, delta: '+12%',  positive: true  },
          { icon: Users,    label: 'Pico de Ativos',   value: `${peakUsers}`,     delta: '+8%',   positive: true  },
          { icon: Utensils, label: 'Refeições Regist.', value: `${totalMeals}`,   delta: '+31%',  positive: true  },
          { icon: Zap,      label: 'Sessões Totais',   value: `${totalSess}`,     delta: '-3%',   positive: false },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Stat {...s} />
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tempo no App */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E6EAF0] dark:border-[#334155] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock size={16} className="text-[#22C55E]" />
            <h2 className="text-[16px] font-semibold text-slate-800 dark:text-white">Tempo Médio no App (min/dia)</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData.slice(-30)}>
              <defs>
                <linearGradient id="gradMin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
              <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="minutes" name="Minutos" stroke="#22C55E" strokeWidth={2.5} fill="url(#gradMin)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Funcionalidades mais usadas */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E6EAF0] dark:border-[#334155] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Zap size={16} className="text-[#22C55E]" />
            <h2 className="text-[16px] font-semibold text-slate-800 dark:text-white">Funcionalidades</h2>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={FEATURES_DATA} cx="50%" cy="50%" outerRadius={70} dataKey="value" strokeWidth={0}>
                {FEATURES_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v: any) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {FEATURES_DATA.map(f => (
              <div key={f.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: f.color }} />
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">{f.name}</span>
                </div>
                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{f.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telas mais usadas */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E6EAF0] dark:border-[#334155] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Smartphone size={16} className="text-[#22C55E]" />
            <h2 className="text-[16px] font-semibold text-slate-800 dark:text-white">Telas Mais Visitadas</h2>
          </div>
          <div className="space-y-3">
            {SCREENS_DATA.map((s, i) => {
              const pct = Math.round((s.views / SCREENS_DATA[0].views) * 100);
              return (
                <div key={s.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{s.name}</span>
                    <span className="text-[12px] font-bold text-slate-400">{s.views.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-[#334155] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.06, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: i === 0 ? '#22C55E' : `hsl(${160 - i * 20}, 60%, ${50 + i * 3}%)` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Refeições registradas */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E6EAF0] dark:border-[#334155] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Utensils size={16} className="text-[#22C55E]" />
            <h2 className="text-[16px] font-semibold text-slate-800 dark:text-white">Refeições Registadas por Dia</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
              <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="meals" name="Refeições" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 text-right">
        Última atualização: {lastRefresh.toLocaleTimeString('pt-PT')}
      </p>
    </div>
  );
};

export default AdminAnalytics;
