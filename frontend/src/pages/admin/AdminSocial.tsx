import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Share2, Scale, UtensilsCrossed, Dumbbell, Flame,
  Medal, Crown, Star, TrendingUp, TrendingDown, Users, Calendar,
  ChevronDown, Award, Target
} from 'lucide-react';

const TABS = [
  { id: 'ranking',   label: 'Ranking',            icon: Trophy         },
  { id: 'sharing',   label: 'Compartilhamento',   icon: Share2         },
  { id: 'weight',    label: 'Histórico de Peso',  icon: Scale          },
  { id: 'food',      label: 'Histórico Alimentar', icon: UtensilsCrossed },
  { id: 'workouts',  label: 'Histórico Treinos',  icon: Dumbbell       },
  { id: 'widget',    label: 'Widget Calorias',    icon: Flame          },
] as const;
type TabId = typeof TABS[number]['id'];

const MOCK_RANKING = [
  { rank: 1, name: 'Ana Macamo',    points: 4820, streak: 21, avatar: 'AM', goal: 'Perder peso',    badge: 'Diamante' },
  { rank: 2, name: 'Carlos Sitoe',  points: 4390, streak: 18, avatar: 'CS', goal: 'Ganhar massa',   badge: 'Ouro'     },
  { rank: 3, name: 'Fátima Nhaca',  points: 3910, streak: 15, avatar: 'FN', goal: 'Manutenção',     badge: 'Ouro'     },
  { rank: 4, name: 'Pedro Cossa',   points: 3450, streak: 12, avatar: 'PC', goal: 'Perder peso',    badge: 'Prata'    },
  { rank: 5, name: 'Maria Dzivaguru',points:3100, streak: 9,  avatar: 'MD', goal: 'Atividade física',badge: 'Prata'   },
  { rank: 6, name: 'João Tembe',    points: 2880, streak: 7,  avatar: 'JT', goal: 'Ganhar massa',   badge: 'Bronze'   },
  { rank: 7, name: 'Rosa Bila',     points: 2560, streak: 5,  avatar: 'RB', goal: 'Perder peso',    badge: 'Bronze'   },
];

const MOCK_SHARING = [
  { type: 'Progresso Semanal', count: 142, growth: '+24%', positive: true,  color: '#22C55E' },
  { type: 'Refeição Saudável', count:  98, growth: '+11%', positive: true,  color: '#3B82F6' },
  { type: 'Treino Concluído',  count:  76, growth: '+18%', positive: true,  color: '#8B5CF6' },
  { type: 'Meta Atingida',     count:  31, growth: '-5%',  positive: false, color: '#F59E0B' },
  { type: 'Widget Calorias',   count:  22, growth: '+40%', positive: true,  color: '#EC4899' },
];

const WEIGHT_HISTORY = [
  { user: 'Ana Macamo',    initial: 82, current: 74, target: 68, change: -8  },
  { user: 'Carlos Sitoe',  initial: 70, current: 76, target: 80, change: +6  },
  { user: 'Fátima Nhaca',  initial: 65, current: 65, target: 65, change: 0   },
  { user: 'Pedro Cossa',   initial: 95, current: 89, target: 82, change: -6  },
  { user: 'João Tembe',    initial: 68, current: 72, target: 78, change: +4  },
];

const FOOD_STATS = [
  { label: 'Refeições Hoje',       value: '284',  icon: UtensilsCrossed, color: 'text-[#22C55E]' },
  { label: 'Média Calorias/Dia',   value: '1.840', icon: Flame,           color: 'text-orange-400' },
  { label: 'Aderência ao Plano',   value: '72%',  icon: Target,          color: 'text-blue-400'  },
  { label: 'Utilizadores Ativos',  value: '38',   icon: Users,           color: 'text-purple-400' },
];

const WORKOUT_STATS = [
  { label: 'Sessões Esta Semana', value: '127', icon: Dumbbell, color: 'text-[#22C55E]' },
  { label: 'Tempo Médio (min)',   value: '42',  icon: Calendar, color: 'text-blue-400'  },
  { label: 'Streak Médio (dias)', value: '11',  icon: Award,    color: 'text-amber-400' },
  { label: 'Taxa de Conclusão',   value: '68%', icon: Target,   color: 'text-purple-400'},
];

const BADGE_COLORS: Record<string, string> = {
  Diamante: 'text-cyan-400 bg-cyan-400/15',
  Ouro:     'text-amber-400 bg-amber-400/15',
  Prata:    'text-slate-400 bg-slate-400/15',
  Bronze:   'text-orange-400 bg-orange-400/15',
};

const cardCls = 'bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E6EAF0] dark:border-[#334155] p-6';

const AdminSocial: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('ranking');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-[24px] font-semibold text-[#1A202C] dark:text-white tracking-tight">Recursos Sociais</h1>
        <p className="text-[14px] text-[#718096] dark:text-slate-400 mt-0.5">Engagement, ranking e histórico dos utilizadores.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all border ${
                isActive
                  ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-[#22C55E]'
                  : 'border-[#E6EAF0] dark:border-[#334155] text-slate-500 hover:text-slate-800 dark:hover:text-white hover:border-[#22C55E]/20'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >

          {/* Ranking */}
          {activeTab === 'ranking' && (
            <div className="space-y-5">
              {/* Top 3 podium */}
              <div className="grid grid-cols-3 gap-4">
                {[MOCK_RANKING[1], MOCK_RANKING[0], MOCK_RANKING[2]].map((u, i) => {
                  const rankMap = [2, 1, 3];
                  const rank = rankMap[i];
                  const heights = ['h-[120px]', 'h-[150px]', 'h-[100px]'];
                  const icons = [<Medal size={18} className="text-slate-400" />, <Crown size={18} className="text-amber-400" />, <Star size={18} className="text-orange-400" />];
                  return (
                    <motion.div key={u.rank} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      className={`${cardCls} flex flex-col items-center justify-end ${heights[i]} p-4 relative overflow-hidden`}>
                      <div className="absolute top-3 right-3">{icons[i]}</div>
                      <div className="w-12 h-12 rounded-full bg-[#22C55E]/15 flex items-center justify-center text-[#22C55E] font-black text-lg mb-2">
                        {u.avatar}
                      </div>
                      <p className="text-[13px] font-bold text-slate-800 dark:text-white text-center leading-tight">{u.name.split(' ')[0]}</p>
                      <p className="text-[11px] text-slate-400">{u.points.toLocaleString()} pts</p>
                      <span className={`mt-1.5 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${BADGE_COLORS[u.badge]}`}>{u.badge}</span>
                      <div className={`absolute bottom-0 left-0 right-0 h-1 ${rank === 1 ? 'bg-amber-400' : rank === 2 ? 'bg-slate-400' : 'bg-orange-400'}`} />
                    </motion.div>
                  );
                })}
              </div>

              {/* Full list */}
              <div className={cardCls}>
                <h3 className="text-[15px] font-bold text-slate-800 dark:text-white mb-4">Classificação Completa</h3>
                <div className="space-y-2">
                  {MOCK_RANKING.map((u, i) => (
                    <motion.div key={u.rank} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#334155]/50 transition-colors">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black flex-shrink-0 ${
                        u.rank <= 3 ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-slate-100 dark:bg-[#334155] text-slate-400'
                      }`}>{u.rank}</span>
                      <div className="w-9 h-9 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] font-bold text-sm flex-shrink-0">
                        {u.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 dark:text-white truncate">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.goal} · {u.streak} dias de streak</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-black text-slate-800 dark:text-white">{u.points.toLocaleString()}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${BADGE_COLORS[u.badge]}`}>{u.badge}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Compartilhamento */}
          {activeTab === 'sharing' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_SHARING.map((s, i) => (
                  <motion.div key={s.type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className={`${cardCls}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}20` }}>
                      <Share2 size={18} style={{ color: s.color }} />
                    </div>
                    <p className="text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-1">{s.type}</p>
                    <p className="text-[30px] font-black text-slate-800 dark:text-white">{s.count}</p>
                    <p className={`text-[12px] font-bold flex items-center gap-1 mt-1 ${s.positive ? 'text-[#22C55E]' : 'text-rose-400'}`}>
                      {s.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {s.growth} este mês
                    </p>
                  </motion.div>
                ))}
              </div>
              <div className={cardCls}>
                <h3 className="text-[15px] font-bold text-slate-800 dark:text-white mb-4">Tipos de Partilha por Popularidade</h3>
                <div className="space-y-3">
                  {MOCK_SHARING.map((s, i) => {
                    const max = MOCK_SHARING[0].count;
                    const pct = Math.round((s.count / max) * 100);
                    return (
                      <div key={s.type}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{s.type}</span>
                          <span className="text-[12px] font-bold text-slate-400">{s.count} partilhas</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-[#334155] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: i * 0.07, ease: 'easeOut' }}
                            className="h-full rounded-full" style={{ background: s.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Histórico de Peso */}
          {activeTab === 'weight' && (
            <div className="space-y-5">
              <div className={`${cardCls}`}>
                <h3 className="text-[15px] font-bold text-slate-800 dark:text-white mb-5">Progresso de Peso por Utilizador</h3>
                <div className="space-y-4">
                  {WEIGHT_HISTORY.map((u, i) => {
                    const progressPct = Math.abs(u.change) / Math.abs(u.initial - u.target) * 100;
                    const isLoss = u.target < u.initial;
                    return (
                      <motion.div key={u.user} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                        className="p-4 bg-slate-50 dark:bg-[#0F172A]/50 rounded-xl border border-[#E6EAF0] dark:border-[#334155]">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[14px] font-bold text-slate-800 dark:text-white">{u.user}</p>
                          <span className={`text-[12px] font-black ${u.change === 0 ? 'text-slate-400' : isLoss ? 'text-[#22C55E]' : 'text-blue-400'}`}>
                            {u.change > 0 ? '+' : ''}{u.change} kg
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-2">
                          <span>Inicial: <strong className="text-slate-600 dark:text-slate-300">{u.initial} kg</strong></span>
                          <span>→</span>
                          <span>Atual: <strong className="text-slate-800 dark:text-white">{u.current} kg</strong></span>
                          <span>→</span>
                          <span>Meta: <strong className="text-[#22C55E]">{u.target} kg</strong></span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-[#334155] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, progressPct)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full bg-[#22C55E]" />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{Math.round(Math.min(100, progressPct))}% até à meta</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Histórico Alimentar */}
          {activeTab === 'food' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {FOOD_STATS.map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className={cardCls}>
                    <s.icon size={18} className={`${s.color} mb-3`} />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                    <p className={`text-[28px] font-black ${s.color}`}>{s.value}</p>
                  </motion.div>
                ))}
              </div>
              <div className={cardCls}>
                <h3 className="text-[15px] font-bold text-slate-800 dark:text-white mb-4">Distribuição de Macronutrientes (Média)</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Proteínas', pct: 28, color: '#22C55E',  grams: '142g' },
                    { label: 'Hidratos',  pct: 52, color: '#3B82F6',  grams: '268g' },
                    { label: 'Gorduras',  pct: 20, color: '#F59E0B',  grams: '41g'  },
                  ].map(m => (
                    <div key={m.label} className="text-center p-4 bg-slate-50 dark:bg-[#0F172A]/50 rounded-xl border border-[#E6EAF0] dark:border-[#334155]">
                      <div className="relative w-16 h-16 mx-auto mb-3">
                        <svg className="w-16 h-16 -rotate-90">
                          <circle cx="32" cy="32" r="28" fill="none" stroke="#334155" strokeWidth="6" />
                          <circle cx="32" cy="32" r="28" fill="none" stroke={m.color} strokeWidth="6"
                            strokeDasharray={`${2 * Math.PI * 28 * m.pct / 100} ${2 * Math.PI * 28}`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[13px] font-black text-slate-800 dark:text-white">{m.pct}%</span>
                      </div>
                      <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{m.label}</p>
                      <p className="text-[11px] text-slate-400">{m.grams}/dia</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Histórico de Treinos */}
          {activeTab === 'workouts' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {WORKOUT_STATS.map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className={cardCls}>
                    <s.icon size={18} className={`${s.color} mb-3`} />
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                    <p className={`text-[28px] font-black ${s.color}`}>{s.value}</p>
                  </motion.div>
                ))}
              </div>
              <div className={cardCls}>
                <h3 className="text-[15px] font-bold text-slate-800 dark:text-white mb-4">Treinos por Grupo Muscular</h3>
                <div className="space-y-3">
                  {[
                    { group: 'Peito',   sessions: 312, pct: 100 },
                    { group: 'Costas',  sessions: 289, pct: 92  },
                    { group: 'Pernas',  sessions: 265, pct: 85  },
                    { group: 'Ombros',  sessions: 198, pct: 63  },
                    { group: 'Core',    sessions: 176, pct: 56  },
                    { group: 'Bíceps',  sessions: 143, pct: 46  },
                    { group: 'Tríceps', sessions: 121, pct: 39  },
                  ].map((m, i) => (
                    <div key={m.group}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{m.group}</span>
                        <span className="text-[12px] font-bold text-slate-400">{m.sessions} sessões</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-[#334155] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ duration: 0.7, delay: i * 0.06, ease: 'easeOut' }}
                          className="h-full rounded-full bg-[#22C55E]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Widget Calorias */}
          {activeTab === 'widget' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={cardCls}>
                  <h3 className="text-[15px] font-bold text-slate-800 dark:text-white mb-5">Preview do Widget</h3>
                  <div className="bg-gradient-to-br from-[#0A0F14] to-[#111827] rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Hoje</p>
                        <p className="text-[13px] font-bold text-white mt-0.5">Calorias</p>
                      </div>
                      <Flame size={20} className="text-orange-400" />
                    </div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-[40px] font-black text-white leading-none">1.420</span>
                      <span className="text-[14px] text-slate-400">/ 1.840 kcal</span>
                    </div>
                    <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-gradient-to-r from-[#22C55E] to-[#A8E063] rounded-full" style={{ width: '77%' }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Proteína', value: '112g', color: '#22C55E' },
                        { label: 'Hidratos', value: '198g', color: '#3B82F6' },
                        { label: 'Gordura',  value: '38g',  color: '#F59E0B' },
                      ].map(m => (
                        <div key={m.label} className="bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/[0.06]">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">{m.label}</p>
                          <p className="text-[14px] font-black" style={{ color: m.color }}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={cardCls}>
                  <h3 className="text-[15px] font-bold text-slate-800 dark:text-white mb-4">Configurações do Widget</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Mostrar Macros',         defaultOn: true  },
                      { label: 'Barra de Progresso',     defaultOn: true  },
                      { label: 'Calorias Queimadas',     defaultOn: false },
                      { label: 'Meta Hídrica',           defaultOn: true  },
                      { label: 'Próxima Refeição',       defaultOn: false },
                      { label: 'Animações',              defaultOn: true  },
                    ].map(item => (
                      <WidgetToggle key={item.label} label={item.label} defaultOn={item.defaultOn} />
                    ))}
                  </div>
                  <div className="mt-5 p-3 bg-[#22C55E]/10 rounded-xl border border-[#22C55E]/20">
                    <p className="text-[12px] text-[#22C55E] font-bold">22 utilizadores com widget ativo</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">+40% vs. mês anterior</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const WidgetToggle = ({ label, defaultOn }: { label: string; defaultOn: boolean }) => {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <button onClick={() => setOn(!on)} className={`relative w-11 h-6 rounded-full transition-all ${on ? 'bg-[#22C55E]' : 'bg-slate-200 dark:bg-slate-700'}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
};

export default AdminSocial;
