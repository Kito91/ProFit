import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, MessageSquare, Globe, Zap, Shield, Cpu, BarChart2,
  Save, RotateCcw, ChevronRight, AlertTriangle, CheckCircle, Info
} from 'lucide-react';

const TABS = [
  { id: 'prompt',       label: 'Prompt Principal', icon: MessageSquare },
  { id: 'personality',  label: 'Personalidade',    icon: Brain         },
  { id: 'language',     label: 'Idioma',            icon: Globe         },
  { id: 'limits',       label: 'Limites',           icon: Zap           },
  { id: 'rules',        label: 'Regras',            icon: Shield        },
  { id: 'models',       label: 'Modelos',           icon: Cpu           },
  { id: 'tokens',       label: 'Tokens',            icon: BarChart2     },
] as const;

type TabId = typeof TABS[number]['id'];

const DEFAULT_CONFIG = {
  system_prompt: `Você é o assistente de fitness e nutrição do ProFit, um app dedicado a ajudar os utilizadores a atingir os seus objetivos de saúde e bem-estar. Responda sempre em português de Moçambique, de forma amigável, motivadora e profissional.

Ao criar planos alimentares e de treino, tenha em conta:
- Objetivos do utilizador (perder peso, ganhar massa muscular, manter)
- Nível de atividade física
- Restrições alimentares e preferências
- Condição física atual

Nunca forneça diagnósticos médicos. Encaminhe para profissionais de saúde quando necessário.`,
  personality_tone: 'motivador',
  personality_style: 'amigavel',
  personality_formality: 'informal',
  language: 'pt-MZ',
  fallback_language: 'pt-PT',
  max_tokens_per_reply: 1000,
  max_requests_per_day: 20,
  max_requests_per_user: 5,
  response_timeout: 30,
  banned_topics: 'política, religião, conteúdo adulto, medicamentos sem prescrição',
  content_filter: true,
  safe_mode: true,
  require_fitness_context: true,
  model_primary: 'claude-sonnet-4-6',
  model_fallback: 'claude-haiku-4-5-20251001',
  temperature: 0.7,
  top_p: 0.95,
};

const PERSONALITY_OPTIONS = {
  tone: ['motivador', 'calmo', 'energético', 'profissional', 'amigável'],
  style: ['amigavel', 'direto', 'detalhado', 'conciso', 'empático'],
  formality: ['informal', 'semi-formal', 'formal'],
};

const MODEL_OPTIONS = [
  { id: 'claude-opus-4-7',           label: 'Claude Opus 4.7',   desc: 'Mais poderoso — custo alto',  badge: 'Avançado' },
  { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6', desc: 'Balanceado — recomendado',     badge: 'Recomendado' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',  desc: 'Mais rápido — custo baixo',   badge: 'Económico' },
];

const TOKEN_STATS = [
  { label: 'Tokens Hoje',    value: '48.230',  delta: '+12%', color: 'text-blue-400'   },
  { label: 'Tokens Semana',  value: '312.890', delta: '+8%',  color: 'text-purple-400' },
  { label: 'Tokens Mês',     value: '1.2M',    delta: '+22%', color: 'text-amber-400'  },
  { label: 'Custo Estimado', value: '$18.40',  delta: '+22%', color: 'text-rose-400'   },
];

export const AdminAIConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('prompt');
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG });
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (key: string, val: any) => {
    setConfig(prev => ({ ...prev, [key]: val }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_CONFIG });
    setDirty(false);
    setSaved(false);
  };

  const cardCls = 'bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E6EAF0] dark:border-[#334155] p-6';
  const labelCls = 'block text-[12px] font-bold text-[#718096] dark:text-slate-400 uppercase tracking-widest mb-2';
  const inputCls = 'w-full bg-[#F7F9FC] dark:bg-[#0F172A] border border-[#E6EAF0] dark:border-[#334155] rounded-xl px-4 py-3 text-[14px] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/40 transition-all';
  const textareaCls = `${inputCls} resize-none`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-[#1A202C] dark:text-white tracking-tight">Configuração da IA</h1>
          <p className="text-[14px] text-[#718096] dark:text-slate-400 mt-0.5">Personalize o comportamento do assistente ProFit.</p>
        </div>
        <div className="flex gap-3">
          {dirty && (
            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E6EAF0] dark:border-[#334155] text-[13px] font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-[#334155] transition-all">
              <RotateCcw size={14} /> Repor
            </button>
          )}
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
              saved
                ? 'bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/30'
                : 'bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-lg shadow-[#22C55E]/20'
            }`}
          >
            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? 'Guardado!' : 'Guardar'}
          </button>
        </div>
      </div>

      {dirty && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-[13px]">
          <AlertTriangle size={14} />
          Existem alterações por guardar.
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar Tabs */}
        <aside className="w-[220px] flex-shrink-0">
          <div className={`${cardCls} p-3 space-y-1`}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-semibold transition-all ${
                    isActive
                      ? 'bg-[#22C55E]/10 text-[#22C55E]'
                      : 'text-[#718096] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#334155] hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <tab.icon size={16} className={isActive ? 'text-[#22C55E]' : ''} />
                  {tab.label}
                  {isActive && <ChevronRight size={14} className="ml-auto" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >

              {activeTab === 'prompt' && (
                <div className={`${cardCls} space-y-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={18} className="text-[#22C55E]" />
                    <h2 className="text-[17px] font-bold text-slate-800 dark:text-white">Prompt do Sistema</h2>
                  </div>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">Este é o prompt base enviado ao modelo em cada conversa. Define o comportamento geral da IA.</p>
                  <div>
                    <label className={labelCls}>Prompt Principal</label>
                    <textarea
                      rows={12}
                      value={config.system_prompt}
                      onChange={e => update('system_prompt', e.target.value)}
                      className={textareaCls}
                      placeholder="Escreva o prompt do sistema..."
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">{config.system_prompt.length} caracteres</p>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-blue-300">Use <code className="bg-blue-900/30 px-1 rounded">{'{{nome}}'}</code>, <code className="bg-blue-900/30 px-1 rounded">{'{{objetivo}}'}</code> e <code className="bg-blue-900/30 px-1 rounded">{'{{calorias}}'}</code> como variáveis dinâmicas do perfil do utilizador.</p>
                  </div>
                </div>
              )}

              {activeTab === 'personality' && (
                <div className={`${cardCls} space-y-6`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Brain size={18} className="text-[#22C55E]" />
                    <h2 className="text-[17px] font-bold text-slate-800 dark:text-white">Personalidade</h2>
                  </div>
                  {(['tone', 'style', 'formality'] as const).map(field => (
                    <div key={field}>
                      <label className={labelCls}>
                        {field === 'tone' ? 'Tom de Voz' : field === 'style' ? 'Estilo de Resposta' : 'Formalidade'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {PERSONALITY_OPTIONS[field].map(opt => (
                          <button
                            key={opt}
                            onClick={() => update(`personality_${field}`, opt)}
                            className={`px-4 py-2 rounded-full text-[13px] font-semibold capitalize transition-all border ${
                              config[`personality_${field}` as keyof typeof config] === opt
                                ? 'bg-[#22C55E]/15 border-[#22C55E]/60 text-[#22C55E]'
                                : 'border-[#E6EAF0] dark:border-[#334155] text-slate-500 dark:text-slate-400 hover:border-[#22C55E]/30'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'language' && (
                <div className={`${cardCls} space-y-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe size={18} className="text-[#22C55E]" />
                    <h2 className="text-[17px] font-bold text-slate-800 dark:text-white">Idioma</h2>
                  </div>
                  <div>
                    <label className={labelCls}>Idioma Principal</label>
                    <select value={config.language} onChange={e => update('language', e.target.value)} className={inputCls}>
                      <option value="pt-MZ">Português (Moçambique)</option>
                      <option value="pt-PT">Português (Portugal)</option>
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en">Inglês</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Idioma de Fallback</label>
                    <select value={config.fallback_language} onChange={e => update('fallback_language', e.target.value)} className={inputCls}>
                      <option value="pt-PT">Português (Portugal)</option>
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en">Inglês</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'limits' && (
                <div className={`${cardCls} space-y-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={18} className="text-[#22C55E]" />
                    <h2 className="text-[17px] font-bold text-slate-800 dark:text-white">Limites de Uso</h2>
                  </div>
                  {[
                    { key: 'max_tokens_per_reply',  label: 'Máx. Tokens por Resposta', min: 100,  max: 4000, step: 100 },
                    { key: 'max_requests_per_day',  label: 'Máx. Pedidos por Dia (Global)', min: 1, max: 500, step: 1 },
                    { key: 'max_requests_per_user', label: 'Máx. Pedidos por Utilizador/Dia', min: 1, max: 50, step: 1 },
                    { key: 'response_timeout',      label: 'Timeout de Resposta (seg)',  min: 5,  max: 120, step: 5 },
                  ].map(({ key, label, min, max, step }) => (
                    <div key={key}>
                      <label className={labelCls}>{label}</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={step}
                          value={config[key as keyof typeof config] as number}
                          onChange={e => update(key, Number(e.target.value))}
                          className="flex-1 accent-[#22C55E]"
                        />
                        <span className="text-[15px] font-black text-slate-800 dark:text-white w-16 text-right">
                          {config[key as keyof typeof config]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'rules' && (
                <div className={`${cardCls} space-y-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={18} className="text-[#22C55E]" />
                    <h2 className="text-[17px] font-bold text-slate-800 dark:text-white">Regras e Filtros</h2>
                  </div>
                  <div>
                    <label className={labelCls}>Tópicos Proibidos</label>
                    <textarea
                      rows={4}
                      value={config.banned_topics}
                      onChange={e => update('banned_topics', e.target.value)}
                      className={textareaCls}
                      placeholder="Separados por vírgulas..."
                    />
                  </div>
                  {[
                    { key: 'content_filter',          label: 'Filtro de Conteúdo Ativo',            desc: 'Bloqueia respostas impróprias automaticamente' },
                    { key: 'safe_mode',                label: 'Modo Seguro',                         desc: 'Adiciona avisos de segurança a conselhos de saúde' },
                    { key: 'require_fitness_context',  label: 'Exigir Contexto de Fitness',          desc: 'Só responde a perguntas relacionadas com saúde/fitness' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-[#E6EAF0] dark:border-[#334155] last:border-0">
                      <div>
                        <p className="text-[14px] font-semibold text-slate-800 dark:text-white">{label}</p>
                        <p className="text-[12px] text-slate-400">{desc}</p>
                      </div>
                      <button
                        onClick={() => update(key, !config[key as keyof typeof config])}
                        className={`relative w-12 h-6 rounded-full transition-all ${config[key as keyof typeof config] ? 'bg-[#22C55E]' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${config[key as keyof typeof config] ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'models' && (
                <div className={`${cardCls} space-y-5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu size={18} className="text-[#22C55E]" />
                    <h2 className="text-[17px] font-bold text-slate-800 dark:text-white">Modelos</h2>
                  </div>
                  <div>
                    <label className={labelCls}>Modelo Principal</label>
                    <div className="space-y-2">
                      {MODEL_OPTIONS.map(m => (
                        <button
                          key={m.id}
                          onClick={() => update('model_primary', m.id)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                            config.model_primary === m.id
                              ? 'border-[#22C55E] bg-[#22C55E]/5'
                              : 'border-[#E6EAF0] dark:border-[#334155] hover:border-[#22C55E]/30'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${config.model_primary === m.id ? 'border-[#22C55E]' : 'border-slate-300 dark:border-slate-600'}`}>
                            {config.model_primary === m.id && <div className="w-2 h-2 rounded-full bg-[#22C55E]" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-[14px] font-bold text-slate-800 dark:text-white">{m.label}</p>
                            <p className="text-[12px] text-slate-400">{m.desc}</p>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            m.badge === 'Recomendado' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                            m.badge === 'Avançado'   ? 'bg-purple-500/15 text-purple-400' :
                                                       'bg-amber-500/15 text-amber-400'
                          }`}>{m.badge}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Temperatura ({config.temperature})</label>
                    <input type="range" min={0} max={1} step={0.05} value={config.temperature}
                      onChange={e => update('temperature', parseFloat(e.target.value))}
                      className="w-full accent-[#22C55E]" />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Mais preciso</span><span>Mais criativo</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tokens' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    {TOKEN_STATS.map((stat, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className={`${cardCls}`}>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">{stat.label}</p>
                        <p className={`text-[28px] font-black ${stat.color}`}>{stat.value}</p>
                        <p className="text-[12px] text-[#22C55E] font-bold mt-1">{stat.delta} vs período anterior</p>
                      </motion.div>
                    ))}
                  </div>
                  <div className={cardCls}>
                    <h3 className="text-[15px] font-bold text-slate-800 dark:text-white mb-4">Uso por Funcionalidade</h3>
                    {[
                      { label: 'Plano Alimentar',  pct: 45, color: 'bg-[#22C55E]' },
                      { label: 'Treinos',          pct: 30, color: 'bg-blue-500'  },
                      { label: 'Chat Geral',       pct: 15, color: 'bg-purple-500'},
                      { label: 'Análise de Scan',  pct: 10, color: 'bg-amber-500' },
                    ].map(item => (
                      <div key={item.label} className="mb-4 last:mb-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                          <span className="text-[12px] font-bold text-slate-500">{item.pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-[#334155] rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full ${item.color} rounded-full`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AdminAIConfig;
