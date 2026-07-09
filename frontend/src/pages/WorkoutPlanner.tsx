import React, { useState, useEffect } from 'react';
import { ArrowLeft, Dumbbell, Sparkles, Clock, ChevronRight, Loader2, Calendar, CheckCircle2, Trophy, Flame, AlertTriangle, Lock, X, Camera, Info, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Paywall } from '../components/Paywall';
import { formatMaputoDate, getMaputoDayName } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

const formatDate = (dateString: string) => {
  return formatMaputoDate(dateString);
};

export const WorkoutPlanner = () => {
  const { langData } = useLanguage();
  const { user, totalUsersCount } = useAuth();
  const navigate = useNavigate();

  const getDaysSinceCreation = () => {
    if (!user?.created_at) return 0;
    const date = new Date(user.created_at);
    if (isNaN(date.getTime())) return 0;
    return (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  };

  const isServerActive = user?.subscription_status === 'ativo' || user?.subscription_status === 'active';
  const isUnderLimit = totalUsersCount > 0 ? totalUsersCount <= 20 : true;
  const isPromoActive = isServerActive || isUnderLimit || user?.role === 'admin' || user?.is_influencer || user?.is_early_adopter;

  if (!isPromoActive) {
    return <Paywall feature={langData.wk_ia_title} />;
  }

  const [activePlan, setActivePlan] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const [confirmOptions, setConfirmOptions] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger' as 'danger' | 'warning' | 'info',
    confirmText: langData.wk_confirm,
    onConfirm: async () => {},
    showCancel: true
  });

  const closeConfirm = () => setConfirmOptions(prev => ({ ...prev, isOpen: false }));

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    goal: 'ganhar massa',
    level: 'iniciante',
    days_per_week: '5',
    location: 'academia',
    duration: '45 min',
    age: '',
    weight: '',
    height: '',
    has_trained_before: 'Não',
    training_time: '0 meses',
    injuries: '',
    diseases: '',
    body_focus: 'Equilibrado',
    intensity: 'Moderado',
    observations: ''
  });
  
  // Robust Generation States
  const [generationPhase, setGenerationPhase] = useState<'validating' | 'analyzing' | 'optimizing' | 'finalizing' | 'idle'>('idle');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const FALLBACK_PLAN = {
    id: 'fallback-' + Date.now(),
    title: 'Plano de Transição ProFit 🛡️',
    goal: formData.goal,
    level: formData.level,
    days_per_week: formData.days_per_week,
    structured_plan: {
      daily_workouts: [
        { day: langData.days_mon, muscles: langData.PT ? 'Peito e Tríceps' : 'Chest and Triceps', exercises: [] },
        { day: langData.days_tue, muscles: langData.PT ? 'Costas e Bíceps' : 'Back and Biceps', exercises: [] },
        { day: langData.days_wed, muscles: langData.PT ? 'Descanso Ativo' : 'Active Rest', exercises: [] },
        { day: langData.days_thu, muscles: langData.PT ? 'Pernas Completo' : 'Full Legs', exercises: [] },
        { day: langData.days_fri, muscles: langData.PT ? 'Ombros e Core' : 'Shoulders and Core', exercises: [] },
        { day: langData.days_sat, muscles: langData.PT ? 'Cardio e Mobilidade' : 'Cardio and Mobility', exercises: [] },
        { day: langData.days_sun, muscles: langData.PT ? 'Descanso Full' : 'Full Rest', exercises: [] }
      ]
    },
    plan_start_date: new Date().toISOString(),
    plan_renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

  useEffect(() => {
    fetchActivePlan();
    
    // Pre-populate metrics from profile if available
    const loadProfile = async () => {
      try {
        const profile = await api.user.getProfile();
        if (profile) {
          setFormData(prev => ({
            ...prev,
            age: profile.age?.toString() || '',
            weight: profile.weight?.toString() || '',
            height: profile.height?.toString() || ''
          }));
        }
      } catch (err) {
        console.error("Failed to load profile for pre-population", err);
      }
    };
    loadProfile();

    // Load draft from localStorage
    const savedDraft = localStorage.getItem('workout_planner_draft');
    if (savedDraft) {
      try {
        setFormData(prev => ({ ...prev, ...JSON.parse(savedDraft) }));
      } catch (e) { console.warn("Failed to parse draft"); }
    }
  }, []);

  // Save draft on changes
  useEffect(() => {
    localStorage.setItem('workout_planner_draft', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (activePlan) {
      fetchProgress(activePlan.id);
    }
  }, [activePlan]);

  const fetchActivePlan = async () => {
    try {
      setIsLoading(true);
      const data = await api.workouts.getActive();
      if (data && typeof data.structured_plan === 'string') {
        try { data.structured_plan = JSON.parse(data.structured_plan); } catch(e) {}
      }
      setActivePlan(data);
    } catch (err) {
      console.error('Failed to fetch active plan', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProgress = async (planId: string) => {
    try {
      const sessions = await api.workouts.getProgress(planId);
      setCompletedSessions(sessions.map((s: any) => s.day_of_week));
    } catch (err) {
      console.error('Failed to fetch progress', err);
    }
  };

  const handleUseFallback = async () => {
    try {
      setIsGenerating(true);
      setGenerationPhase('finalizing');
      setLoadingProgress(80);
      
      // Simula uma pequena carga para UX
      await new Promise(r => setTimeout(r, 1500));
      
      setActivePlan(FALLBACK_PLAN);
      setIsModalOpen(false);
      setShowWarning(false);
      setGenerationPhase('idle');
      setIsGenerating(false);
      localStorage.removeItem('workout_planner_draft');
    } catch (err) {
      console.error('Fallback failed', err);
    }
  };

  const handleGenerate = async () => {
    // 1. Persistência e Cache Check
    localStorage.setItem('workout_planner_draft', JSON.stringify(formData));
    
    if (activePlan && !isUpdating) {
      // Se já tem um plano e não é atualização, não faz nada (ou avisa)
      return;
    }

    setIsGenerating(true);
    setLoadingProgress(0);
    setGenerationPhase('validating');

    let attempts = 0;
    const maxAttempts = 3;
    let result = null;

    // Fake progress messages
    const loadingSteps = [
      langData.wk_loading_1,
      langData.wk_loading_2,
      langData.wk_loading_3,
      langData.wk_loading_4
    ];

    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 98) return prev;
        return prev + 1;
      });
    }, 500);

    // Smart Retry Loop
    while (attempts < maxAttempts) {
      try {
        const stepIndex = Math.min(attempts, loadingSteps.length - 1);
        setGenerationPhase(stepIndex === 0 ? 'validating' : stepIndex === 1 ? 'analyzing' : 'optimizing');
        
        let payload: any;
        if (selectedImage) {
          const data = new FormData();
          Object.entries(formData).forEach(([key, value]) => data.append(key, value));
          data.append('experience', formData.has_trained_before === 'Sim' ? formData.training_time : 'Nenhum');
          data.append('image', selectedImage);
          data.append('isUpdate', isUpdating.toString());
          payload = data;
        } else {
          payload = { 
            ...formData, 
            experience: formData.has_trained_before === 'Sim' ? formData.training_time : 'Nenhum',
            isUpdate: isUpdating 
          };
        }

        const response = await api.workouts.generate(payload);
        // Garantimos que a resposta contém o plano (pode ser response.plan ou a prórpia response)
        result = response.plan || response;
        break; // Sucesso! Sai do loop.
      } catch (err: any) {
        attempts++;
        console.warn(`Tentativa ${attempts} falhou:`, err);
        
        if (err.status === 403) {
          clearInterval(progressInterval);
          setIsGenerating(false);
          setConfirmOptions({
            isOpen: true,
            title: langData.wk_active_plan_title,
            message: langData.wk_active_plan_msg,
            type: 'warning',
            confirmText: langData.wk_understand,
            showCancel: false,
            onConfirm: async () => {}
          });
          return;
        }

        if (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    clearInterval(progressInterval);

    if (result) {
      setLoadingProgress(100);
      setTimeout(() => {
        setActivePlan(result);
        setIsModalOpen(false);
        setShowWarning(false);
        setGenerationPhase('idle');
        setIsGenerating(false);
        localStorage.removeItem('workout_planner_draft');
      }, 800);
    } else {
      setIsGenerating(false);
      setConfirmOptions({
        isOpen: true,
        title: langData.wk_ia_coach_title,
        message: langData.wk_ia_demand_msg,
        type: 'warning',
        confirmText: langData.wk_use_fallback,
        showCancel: true,
        onConfirm: handleUseFallback
      });
    }
  };

  /**
   * Modais integrados como funções de renderização internas para estabilidade
   */
  const renderGeneratorModal = () => {
    const triggerTransition = (next: number, dir: number) => {
      setIsTransitioning(true);
      setDirection(dir);
      setTimeout(() => {
        setCurrentStep(next);
        setIsTransitioning(false);
      }, 300);
    };

    const nextStep = () => {
      if (currentStep < 5) triggerTransition(currentStep + 1, 1);
    };
    
    const prevStep = () => {
      if (currentStep > 1) triggerTransition(currentStep - 1, -1);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert("Imagem muito grande. Máximo 5MB.");
          return;
        }
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };

    const stepVariants = {
      initial: (dir: number) => ({
        opacity: 0,
        x: dir > 0 ? 20 : -20,
      }),
      animate: {
        opacity: 1,
        x: 0,
      },
      exit: (dir: number) => ({
        opacity: 0,
        x: dir > 0 ? -20 : 20,
      })
    };

    const isStepValid = () => {
      switch (currentStep) {
        case 1:
          return formData.goal && formData.level && formData.location && formData.days_per_week;
        case 2:
          const ageNum = Number(formData.age);
          const weightNum = Number(formData.weight);
          const heightNum = Number(formData.height);
          return ageNum > 0 && weightNum > 0 && heightNum > 0;
        case 3:
          const hasTimeIfTrained = formData.has_trained_before === 'Sim' ? (formData.training_time && formData.training_time !== '') : true;
          return formData.has_trained_before && hasTimeIfTrained && formData.body_focus;
        case 4:
          // Opcional mas recomendado, permitimos avançar se preencher ao menos um ou se o usuário estiver ciente.
          // Para ser rigoroso como pedido, vamos exigir que o campo de observações ou saúde não esteja vazio (pode ser "Nenhuma").
          return formData.injuries.trim() !== '' || formData.diseases.trim() !== '' || formData.observations.trim() !== '';
        default:
          return true;
      }
    };

    return (
      <motion.div 
        key="generator-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      >
        <motion.div 
          key="generator-card"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          className="bg-slate-900 w-full max-w-lg rounded-[40px] p-8 pb-12 overflow-hidden flex flex-col max-h-[90vh] border border-white/10 shadow-3xl"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-black text-white">{langData.wk_step_1_title}</h2>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= currentStep ? 'bg-[#56AB2F]' : 'bg-slate-800'}`} />
                ))}
              </div>
            </div>
            <button onClick={() => { setIsModalOpen(false); setCurrentStep(1); setIsUpdating(false); setSelectedImage(null); setImagePreview(null); }} className="ml-4 text-[var(--text-muted)] p-2 hover:bg-white/10 rounded-full transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar min-h-[420px] overflow-x-hidden flex flex-col justify-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ 
                  type: 'spring', 
                  stiffness: 300, 
                  damping: 30,
                  opacity: { duration: 0.2 }
                }}
                className="w-full"
              >
                {/* Step Content Injected Here */}
                {(() => {
                  switch (currentStep) {
                    case 1:
                      return (
                        <div className="space-y-6">
                          <div>
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">{langData.wk_goal}</label>
                            <div className="grid grid-cols-2 gap-2">
                              {['emagrecer', 'ganhar massa', 'definição', 'condicionamento'].map(opt => (
                                <button 
                                  key={opt}
                                  onClick={() => setFormData({...formData, goal: opt})}
                                  className={`p-3 rounded-2xl text-xs font-bold capitalize border-2 transition-all ${formData.goal === opt ? 'bg-[#56AB2F] border-[#56AB2F] text-white shadow-lg shadow-[#56AB2F]/20' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">{langData.wk_level}</label>
                              <select value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value})} className="w-full bg-slate-800/50 p-4 rounded-2xl text-sm font-bold border-white/5 text-white outline-none focus:ring-2 focus:ring-[#56AB2F]/50">
                                <option value="iniciante">{langData.PT ? 'Iniciante' : 'Beginner'}</option>
                                <option value="intermediário">{langData.PT ? 'Intermediário' : 'Intermediate'}</option>
                                <option value="avançado">{langData.PT ? 'Avançado' : 'Advanced'}</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">{langData.wk_days_week}</label>
                              <select value={formData.days_per_week} onChange={(e) => setFormData({...formData, days_per_week: e.target.value})} className="w-full bg-slate-800/50 p-4 rounded-2xl text-sm font-bold border-white/5 text-white outline-none focus:ring-2 focus:ring-[#56AB2F]/50">
                                {[3, 4, 5, 6, 7].map(d => <option key={d} value={`${d}`}>{d} {langData.wk_days}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block"> {langData.wk_location}</label>
                            <div className="flex gap-2">
                              {['academia', 'casa'].map(opt => (
                                <button 
                                  key={opt}
                                  onClick={() => setFormData({...formData, location: opt})}
                                  className={`flex-1 p-3 rounded-2xl text-xs font-bold capitalize border-2 transition-all ${formData.location === opt ? 'bg-[#56AB2F] border-[#56AB2F] text-white shadow-lg shadow-[#56AB2F]/20' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800'}`}
                                >
                                  {opt === 'academia' ? (langData.PT ? 'Academia' : 'Gym') : (langData.PT ? 'Casa' : 'Home')}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    case 2:
                      return (
                        <div className="space-y-6">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">{langData.wk_age}</label>
                              <input type="number" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} placeholder="30" className="w-full bg-slate-800/50 p-4 rounded-2xl text-sm font-bold border-white/5 text-white outline-none focus:ring-2 focus:ring-[#56AB2F]/50" />
                            </div>
                            <div>
                              <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">{langData.wk_weight}</label>
                              <input type="number" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} placeholder="70" className="w-full bg-slate-800/50 p-4 rounded-2xl text-sm font-bold border-white/5 text-white outline-none focus:ring-2 focus:ring-[#56AB2F]/50" />
                            </div>
                            <div>
                              <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">{langData.wk_height}</label>
                              <input type="number" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} placeholder="175" className="w-full bg-slate-800/50 p-4 rounded-2xl text-sm font-bold border-white/5 text-white outline-none focus:ring-2 focus:ring-[#56AB2F]/50" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">{langData.wk_duration}</label>
                              <select value={formData.duration} onChange={(e) => setFormData({...formData, duration: e.target.value})} className="w-full bg-slate-800/50 p-4 rounded-2xl text-sm font-bold border-white/5 text-white outline-none focus:ring-2 focus:ring-[#56AB2F]/50">
                                {['20 min', '30 min', '45 min', '60 min'].map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">{langData.wk_intensity}</label>
                              <select value={formData.intensity} onChange={(e) => setFormData({...formData, intensity: e.target.value})} className="w-full bg-slate-800/50 p-4 rounded-2xl text-sm font-bold border-white/5 text-white outline-none focus:ring-2 focus:ring-[#56AB2F]/50">
                                {['Leve', 'Moderado', 'Intenso'].map(i => (
                                  <option key={i} value={i}>
                                    {i === 'Leve' ? (langData.PT ? 'Leve' : 'Light') : i === 'Moderado' ? (langData.PT ? 'Moderado' : 'Moderate') : (langData.PT ? 'Intenso' : 'Intense')}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    case 3:
                      return (
                        <div className="space-y-6">
                          <div>
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">{langData.wk_trained_before}</label>
                            <div className="flex gap-2">
                              {['Sim', 'Não'].map(opt => (
                                <button 
                                  key={opt}
                                  onClick={() => setFormData({...formData, has_trained_before: opt})}
                                  className={`flex-1 p-3 rounded-2xl text-xs font-bold border-2 transition-all ${formData.has_trained_before === opt ? 'bg-[#56AB2F] border-[#56AB2F] text-white shadow-lg shadow-[#56AB2F]/20' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                          {formData.has_trained_before === 'Sim' && (
                            <div>
                              <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">{langData.wk_training_time}</label>
                              <div className="grid grid-cols-3 gap-2">
                                {['0 meses', '1-3 meses', '6+ meses'].map(opt => (
                                  <button 
                                    key={opt}
                                    onClick={() => setFormData({...formData, training_time: opt})}
                                    className={`p-2 rounded-2xl text-[10px] font-bold border-2 transition-all ${formData.training_time === opt ? 'bg-[#56AB2F] border-[#56AB2F] text-white shadow-lg shadow-[#56AB2F]/20' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800'}`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3 block">{langData.wk_body_focus}</label>
                            <div className="grid grid-cols-3 gap-2">
                              {['Peito', 'Braços', 'Abdômen', 'Pernas', 'Glúteos', 'Equilibrado'].map(opt => (
                                <button 
                                  key={opt}
                                  onClick={() => setFormData({...formData, body_focus: opt})}
                                  className={`p-2 rounded-2xl text-[10px] font-bold border-2 transition-all ${formData.body_focus === opt ? 'bg-[#56AB2F] border-[#56AB2F] text-white shadow-lg shadow-[#56AB2F]/20' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800'}`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    case 4:
                      return (
                        <div className="space-y-6">
                          <div>
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">{langData.wk_injuries}</label>
                            <textarea 
                              value={formData.injuries} 
                              onChange={(e) => setFormData({...formData, injuries: e.target.value})} 
                              placeholder={langData.PT ? 'Ex: Joelho esquerdo, Coluna...' : 'Ex: Left knee, Spine...'} 
                              className="w-full bg-slate-800/50 p-4 rounded-2xl text-sm font-bold border-white/5 text-white h-20 resize-none outline-none focus:ring-2 focus:ring-[#56AB2F]/50"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">{langData.wk_health_conditions}</label>
                            <textarea 
                              value={formData.diseases} 
                              onChange={(e) => setFormData({...formData, diseases: e.target.value})} 
                              placeholder={langData.PT ? 'Ex: Pressão alta, Diabetes...' : 'Ex: High blood pressure, Diabetes...'} 
                              className="w-full bg-slate-800/50 p-4 rounded-2xl text-sm font-bold border-white/5 text-white h-20 resize-none outline-none focus:ring-2 focus:ring-[#56AB2F]/50"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 block">{langData.wk_notes}</label>
                            <textarea 
                              value={formData.observations} 
                              onChange={(e) => setFormData({...formData, observations: e.target.value})} 
                              placeholder={langData.wk_notes_placeholder} 
                              className="w-full bg-slate-800/50 p-4 rounded-2xl text-sm font-bold border-white/5 text-white h-20 resize-none outline-none focus:ring-2 focus:ring-[#56AB2F]/50"
                            />
                          </div>
                        </div>
                      );
                    case 5:
                      return (
                        <div className="space-y-6">
                          <div className="bg-slate-800/50 border-2 border-dashed border-[#56AB2F]/30 rounded-[32px] p-8 text-center relative overflow-hidden group">
                            {imagePreview ? (
                              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                                <img src={imagePreview} alt="Corpo" className="w-full h-full object-cover" />
                                <button 
                                  onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="w-20 h-20 bg-[#EAF5D5] rounded-full flex items-center justify-center mx-auto text-[#56AB2F]">
                                  <Camera className="w-10 h-10" />
                                </div>
                                <div>
                                  <h4 className="text-lg font-black text-white mb-1">Análise Corporal por IA</h4>
                                  <p className="text-xs font-bold text-[var(--text-muted)] leading-relaxed px-4">Envie uma foto do seu corpo inteiro (frente) para uma análise MASTER de pontos fortes e fracos.</p>
                                </div>
                                <label className="inline-block px-8 py-4 bg-[#56AB2F] text-white rounded-2xl font-black text-sm shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all">
                                  Selecionar Foto
                                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                </label>
                                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Opcional • Formatos JPG, PNG</p>
                              </div>
                            )}
                          </div>
                          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
                              A IA analisará seu percentual de gordura estimado e estrutura muscular para hiper-personalizar seu treino. Imagem segura e privada.
                            </p>
                          </div>
                        </div>
                      );
                    default:
                      return null;
                  }
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8">
            {!isStepValid() && !isTransitioning && (
              <p className="text-center text-amber-500 text-[10px] font-black uppercase tracking-widest mb-3 animate-pulse">
                {langData.wk_fill_all}
              </p>
            )}
            <div className="flex gap-3">
              {currentStep > 1 && (
                <button 
                  onClick={prevStep}
                  disabled={isTransitioning}
                  className="flex-1 py-5 bg-slate-800 rounded-3xl text-slate-400 font-black text-lg disabled:opacity-50 hover:bg-slate-700 transition-colors"
                >
                  Voltar
                </button>
              )}
              <button 
                onClick={currentStep === 5 ? () => setShowWarning(true) : nextStep}
                disabled={!isStepValid() || isTransitioning}
                className={`py-5 bg-gradient-to-r from-[#A8E063] to-[#56AB2F] rounded-3xl text-white font-black text-lg shadow-xl transition-all ${currentStep === 1 ? 'w-full' : 'flex-[2]'} disabled:opacity-30 flex items-center justify-center`}
              >
                {isTransitioning ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : currentStep === 5 ? 'Gerar Plano' : 'Continuar'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  /**
   * Modal de confirmação/aviso unificado
   */
  const renderLoadingOverlay = () => {
    const loadingSteps = [
      langData.wk_loading_1,
      langData.wk_loading_2,
      langData.wk_loading_3,
      langData.wk_loading_4
    ];
    
    // Calcula qual mensagem mostrar baseado no progresso
    const currentStepIndex = Math.min(Math.floor((loadingProgress / 100) * loadingSteps.length), loadingSteps.length - 1);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="relative w-32 h-32 mb-12">
          {/* Outer Ring */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-t-[#56AB2F] border-r-transparent border-b-[#56AB2F]/20 border-l-transparent rounded-full"
          />
          {/* Inner Glow/Logo */}
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-4 bg-[#56AB2F]/20 rounded-full flex items-center justify-center"
          >
            <Sparkles className="w-10 h-10 text-[#56AB2F] animate-pulse" />
          </motion.div>
        </div>

        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-4"
        >
          <h3 className="text-xl font-black text-white">{loadingSteps[currentStepIndex]}</h3>
          <p className="text-sm font-bold text-[#56AB2F] uppercase tracking-[0.2em] animate-pulse">
            {langData.wk_sync_ia}
          </p>
        </motion.div>

        <div className="mt-12 w-full max-w-xs space-y-2">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${loadingProgress}%` }}
              className="h-full bg-gradient-to-r from-[#a8e063] to-[#56ab2f]"
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">
            <span>{langData.PT ? 'Progresso' : 'Progress'}</span>
            <span>{Math.round(loadingProgress)}%</span>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderWarningModal = () => (
    <motion.div 
      key="warning-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-6"
    >
      <motion.div 
        key="warning-card"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[var(--bg-card)] w-full max-w-sm rounded-[40px] p-8 text-center shadow-2xl"
      >
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>
        <h3 className="text-2xl font-black text-[var(--text-main)] mb-4">{langData.wk_attention}</h3>
        <p className="text-[var(--text-muted)] font-bold mb-8 leading-relaxed">
          {langData.wk_warning_msg}
          <br />
          {langData.wk_validity_msg}
        </p>
        <div className="space-y-3">
          <button 
            disabled={isGenerating}
            onClick={handleGenerate}
            className="w-full py-4 bg-[#56AB2F] text-white rounded-2xl font-black shadow-lg disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isUpdating ? langData.wk_update_now : langData.wk_confirm_generate)}
          </button>
          <button onClick={() => { setShowWarning(false); setIsUpdating(false); }} className="w-full py-4 text-[var(--text-muted)] font-bold">{langData.wk_back}</button>
        </div>
      </motion.div>
    </motion.div>
  );


  /**
   * Tela de Carregamento Premium (Fases da IA)
   */
  const renderGenerationOverlay = () => {
    const phaseTexts = {
      validating: langData.PT ? 'Validando seus dados...' : 'Validating your data...',
      analyzing: langData.PT ? 'Analisando sua biometria...' : 'Analyzing your biometrics...',
      optimizing: langData.PT ? 'Otimizando volume de treino...' : 'Optimizing training volume...',
      finalizing: langData.PT ? 'Finalizando seu plano Master...' : 'Finalizing your Master plan...',
      idle: ''
    };

    return (
      <motion.div 
        key="generation-overlay"
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="relative mb-12">
          {/* Outer Ring */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 rounded-full border-t-2 border-r-2 border-[#56AB2F] opacity-20"
          />
          {/* Inner Glow/Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }} 
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 bg-[#56AB2F]/20 rounded-full flex items-center justify-center"
            >
              <Sparkles className="w-8 h-8 text-[#56AB2F] animate-pulse" />
            </motion.div>
          </div>
        </div>

        <h3 className="text-2xl font-black text-white mb-2 leading-tight">
          {langData.wk_creating_custom}<br />
          <span className="text-[#56AB2F]">{langData.wk_custom_plan}</span>
        </h3>
        
        <p className="text-slate-400 font-bold mb-10 text-sm h-6">
          {phaseTexts[generationPhase]}
        </p>

        {/* Progress Bar Container */}
        <div className="w-full max-w-xs bg-slate-800 h-2 rounded-full overflow-hidden mb-4 border border-slate-700">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${loadingProgress}%` }}
            className="h-full bg-gradient-to-r from-[#A8E063] to-[#56AB2F] shadow-[0_0_15px_rgba(86,171,47,0.5)]"
          />
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${retryCount >= i ? 'bg-[#56AB2F]' : 'bg-slate-700'}`} 
              />
            ))}
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {retryCount > 0 ? (langData.PT ? `Tentativa ${retryCount + 1}` : `Attempt ${retryCount + 1}`) : (langData.PT ? 'Conectando ao Coach...' : 'Connecting to Coach...')}
          </span>
        </div>

        {/* Subtle detail text */}
        <p className="mt-16 text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
          Powered by ProFit Master Coach AI
        </p>
      </motion.div>
    );
  };


  return (
    <div className="main-wrapper bg-[var(--bg-app)]">
      <AnimatePresence>
        {isGenerating && renderGenerationOverlay()}
      </AnimatePresence>
      <div className="app-container pb-32 bg-transparent shadow-none border-none">
        <div className="px-6 pt-12 pb-6 flex justify-center items-center sticky top-0 z-40 bg-[var(--bg-app)]/90 backdrop-blur-sm">
          <h1 className="text-[22px] font-bold text-[var(--text-main)]">{langData.wk_ia_title}</h1>
        </div>

        <div className="px-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-[#56AB2F] mb-4" />
              <p className="text-[var(--text-muted)] font-bold italic">{langData.wk_preparing}</p>
            </div>
          ) : activePlan ? (
            <div className="space-y-8">
              {/* Active Plan Info */}
              <div className="bg-[var(--bg-card)] rounded-[40px] p-8 shadow-xl border border-[var(--border-main)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 flex space-x-2">
                  {activePlan.goal === 'Manual' && (
                    <button 
                      onClick={() => navigate('/workout/manual')}
                      className="p-2 bg-[#56AB2F]/10 rounded-xl text-[#56AB2F] hover:bg-[#56AB2F]/20 transition-all border border-[#56AB2F]/20"
                      title="Editar Plano Manual"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setConfirmOptions({
                        isOpen: true,
                        title: langData.PT ? 'Resetar Plano' : 'Reset Plan',
                        message: langData.PT ? 'Deseja realmente apagar o plano atual e gerar um novo? Todo seu progresso nos 30 dias será perdido. Esta ação é irreversível.' : 'Do you really want to delete the current plan and generate a new one? All your 30-day progress will be lost. This action is irreversible.',
                        type: 'danger',
                        confirmText: langData.PT ? 'Apagar Plano' : 'Delete Plan',
                        showCancel: true,
                        onConfirm: async () => {
                          try {
                            await api.workouts.reset();
                            setActivePlan(null);
                          } catch(e) {
                            setTimeout(() => {
                              setConfirmOptions({
                                isOpen: true,
                                title: langData.error,
                                message: langData.PT ? 'Ocorreu um erro ao resetar o plano. Tente novamente.' : 'An error occurred while resetting the plan. Please try again.',
                                type: 'danger',
                                confirmText: langData.close,
                                onConfirm: async () => {},
                                showCancel: false
                              });
                            }, 300);
                          }
                        }
                      });
                    }}
                    className="p-2 bg-gray-50 rounded-xl text-[var(--text-muted)] hover:text-red-500 transition-colors"
                    title="Resetar Plano"
                  >
                    <Flame className="w-5 h-5" />
                  </button>
                  <Flame className="w-6 h-6 text-orange-500 opacity-20" />
                </div>
                <p className="text-[10px] font-black text-[#56AB2F] uppercase tracking-widest mb-1">{langData.wk_active_plan_title}</p>
                <h2 className="text-2xl font-black text-[var(--text-main)] mb-1">{activePlan.title || (langData.PT ? 'Seu Plano Master' : 'Your Master Plan')}</h2>
                <div className="flex flex-wrap gap-4 mt-6">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                    <p className="text-xs font-bold text-[var(--text-muted)]">{langData.PT ? 'Início' : 'Start'}: {formatDate(activePlan.plan_start_date || activePlan.created_at)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[#56AB2F]" />
                    <p className="text-xs font-bold text-[var(--text-muted)]">{langData.PT ? 'Renovação' : 'Renewal'}: {formatDate(activePlan.plan_renewal_date || activePlan.next_plan_available_at)}</p>
                  </div>
                </div>

                <div className="mt-8 relative">
                  <button 
                    onClick={() => {
                      setIsUpdating(true);
                      setIsModalOpen(true);
                    }}
                    className="w-full py-4 bg-slate-800 border-2 border-[#56AB2F]/30 rounded-2xl text-white font-black text-sm flex items-center justify-center space-x-2 group hover:bg-[#56AB2F] transition-all shadow-lg"
                  >
                    <Sparkles className="w-5 h-5 text-[#56AB2F] group-hover:text-white transition-colors group-hover:animate-pulse" />
                    <span>{langData.wk_update_now}</span>
                    
                    {activePlan.goal === 'Manual' && (
                      <span className="absolute -top-3 -right-2 bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg border border-white animate-bounce">
                        UPGRADE PREMIUM
                      </span>
                    )}
                  </button>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold text-center mt-2 px-4 italic">
                    {activePlan.goal === 'Manual' 
                      ? (langData.PT ? 'Gere um plano inteligente para acelerar seus resultados.' : 'Generate a smart plan to accelerate your results.')
                      : (langData.PT ? 'Gera um novo plano adaptado à sua evolução e histórico recente.' : 'Generates a new plan adapted to your evolution and recent history.')}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-[var(--bg-card)] rounded-[32px] p-6 border border-white/10 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="text-base font-black text-[var(--text-main)]">{langData.PT ? 'Seu Progresso' : 'Your Progress'}</h4>
                   <Trophy className="w-6 h-6 text-[#56AB2F]" />
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedSessions.length / (activePlan.structured_plan?.daily_workouts?.length || 1)) * 100}%` }}
                    className="h-full bg-[#56AB2F]"
                  />
                </div>
              </div>

              {/* Weekly Cards */}
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2 px-1">
                  <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest">{langData.PT ? 'Organização Semanal' : 'Weekly Schedule'}</h4>
                  <p className="text-[9px] font-black text-[#56AB2F] uppercase bg-[#56AB2F]/10 px-2 py-1 rounded-lg">
                    {activePlan.days_per_week}
                  </p>
                </div>
                {activePlan.structured_plan?.daily_workouts?.map((dw: any) => {
                  const todayName = getMaputoDayName(new Date()).toLowerCase();
                  const isDone = completedSessions.includes(dw.day);
                  const isToday = dw.day.toLowerCase() === todayName;
                  const isLocked = !isToday && !isDone;
                  const canAccess = isToday || isDone;

                  return (
                    <motion.button
                      key={dw.day}
                      disabled={!canAccess && !isDone}
                      onClick={() => {
                        if (canAccess || isDone) {
                          navigate(`/workout/session/${dw.day}`);
                        }
                      }}
                      whileTap={(canAccess || isDone) ? { scale: 0.98 } : {}}
                      className={`w-full p-6 rounded-[32px] shadow-sm border-2 transition-all flex items-center justify-between group relative overflow-hidden
                        ${isDone 
                          ? 'bg-[#F0F9EB]/40 border-[#56AB2F]/20 opacity-100' 
                          : isToday 
                            ? 'bg-[var(--bg-card)] border-[#56AB2F] shadow-lg shadow-[#56AB2F]/10' 
                            : canAccess
                              ? 'bg-[var(--bg-card)] border-transparent'
                              : 'bg-gray-50/50 border-transparent opacity-40'}`}
                    >
                      <div className="flex items-center space-x-4 relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500
                          ${isDone ? 'bg-[#56AB2F] text-white rotate-[360deg]' : 
                            isToday ? 'bg-[#56AB2F]/10 text-[#56AB2F]' : 
                            canAccess ? 'bg-gray-50 text-[var(--text-muted)]' : 'bg-gray-100/50 text-gray-300'}`}>
                          {isDone ? <CheckCircle2 className="w-7 h-7" /> : <Dumbbell className="w-6 h-6" />}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                             <p className={`text-base font-black ${isLocked ? 'text-gray-300' : 'text-[var(--text-main)]'}`}>{dw.day}</p>
                             {isToday && !isDone && (
                               <span className="flex h-2 w-2 rounded-full bg-[#56AB2F] animate-ping" />
                             )}
                          </div>
                          <p className={`text-xs font-bold leading-tight line-clamp-1 ${isDone ? 'text-[#56AB2F]' : isLocked ? 'text-gray-200' : 'text-[var(--text-muted)]'}`}>
                            {isDone ? (langData.PT ? 'Treino Finalizado! 🏆' : 'Workout Done! 🏆') : (
                              activePlan.goal === 'Manual' && dw.exercises && dw.exercises.length > 0
                                ? dw.exercises.map((ex: any) => ex.name).join(', ')
                                : dw.muscles
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 relative z-10">
                        {isToday && !isDone && (
                          <span className="bg-[#56AB2F] text-white text-[9px] font-black uppercase px-2 py-1 rounded-md">{langData.PT ? 'Hoje' : 'Today'}</span>
                        )}
                        {(!canAccess && !isDone) ? (
                          <Lock className="w-5 h-5 text-gray-200" />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isToday ? 'bg-[#56AB2F] text-white' : 'bg-gray-50 text-gray-300'}`}>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Progress Sparkle for current day */}
                      {isToday && !isDone && (
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#56AB2F]/10 to-transparent rounded-full -mr-12 -mt-12 blur-2xl" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-20 h-20 bg-[var(--bg-card)] rounded-[32px] flex items-center justify-center shadow-sm mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-[#56AB2F]" />
              </div>
              <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">{langData.PT ? 'Sem Plano Ativo' : 'No Active Plan'}</h2>
              <p className="text-[var(--text-muted)] font-bold mb-10 max-w-xs mx-auto">{langData.PT ? 'Gere agora seu plano inteligente válido pelos próximos 30 dias.' : 'Generate your smart plan now, valid for the next 30 days.'}</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full py-5 bg-[#56AB2F] rounded-3xl text-white font-black text-lg shadow-xl active:scale-95 transition-all mb-4"
              >
                {langData.PT ? 'Gerar Plano Inteligente' : 'Generate Smart Plan'}
              </button>
              <button 
                onClick={() => navigate('/workout/manual')}
                className="w-full py-5 bg-transparent border-2 border-[#56AB2F] rounded-3xl text-[#56AB2F] font-black text-lg active:scale-95 transition-all"
              >
                {langData.PT ? 'Criar Meu Plano' : 'Create My Plan'}
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {isGenerating && renderLoadingOverlay()}
          {isModalOpen && renderGeneratorModal()}
          {showWarning && renderWarningModal()}
        </AnimatePresence>

        <ConfirmModal 
          isOpen={confirmOptions.isOpen}
          onClose={closeConfirm}
          title={confirmOptions.title}
          message={confirmOptions.message}
          type={confirmOptions.type}
          confirmText={confirmOptions.confirmText}
          onConfirm={confirmOptions.onConfirm}
          showCancel={confirmOptions.showCancel}
        />

        <BottomNav />
      </div>
    </div>
  );
};
