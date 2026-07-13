import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ChevronLeft, ChevronRight, BarChart2, Users, Calendar, Apple, Utensils, Sun, Dumbbell, Smile, Trophy, Star, CheckCircle, MessageCircle, Clock, Sparkles, Zap, Bell, ChevronDown, User, Lock, X, Scan, Image as ImageIcon, ShieldCheck, Crown } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { notificationService } from '../services/notificationService';

const PENDING_QUIZ_DATA_KEY = 'pending_quiz_data';
const PENDING_QUIZ_STEP_KEY = 'pending_quiz_step';

const COUNTRIES = [
  { code: 'MZ', name: 'Moçambique', prefix: '+258', flag: 'https://flagcdn.com/w40/mz.png' },
  { code: 'ZA', name: 'África do Sul', prefix: '+27', flag: 'https://flagcdn.com/w40/za.png' },
  { code: 'AO', name: 'Angola', prefix: '+244', flag: 'https://flagcdn.com/w40/ao.png' },
];

// Componente de Seleção por Rolagem (Scroll Picker) - Versão Flexível
const ScrollPicker = ({ items, unit = '', value, onChange }: { items: (number | string)[], unit?: string, value: any, onChange: (v: any) => void }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemHeight = 56; 

  useEffect(() => {
    if (scrollRef.current) {
      const index = items.indexOf(value);
      if (index !== -1) scrollRef.current.scrollTop = index * itemHeight;
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const newValue = items[index];
    if (newValue !== undefined && newValue !== value) {
      onChange(newValue);
    }
  };

  return (
    <div className="relative w-full h-[240px] overflow-hidden flex flex-col items-center">
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-14 bg-white/5 rounded-2xl -z-10 border border-white/10" />
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-auto snap-y snap-mandatory py-[92px] no-scrollbar"
        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none', scrollBehavior: 'smooth' }}
      >
        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        {items.map((item, i) => (
          <div 
            key={i} 
            className={`h-14 flex items-center justify-center snap-center transition-all duration-200 ${
              item === value ? 'text-[#22C55E] font-black text-2xl drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'text-gray-400 font-bold text-lg opacity-30 font-sans'
            }`}
          >
            {item}{unit}
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente de Texto com Efeito de Digitação (Typing Effect) - Global para reuso
const typingContainer = {
  hidden: { opacity: 0 },
  visible: (i = 1) => ({
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.04 * i },
  }),
};

const typingChild = {
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 100,
    },
  },
  hidden: {
    opacity: 0,
    x: -5,
  },
};

const TypingText = ({ text, className }: { text: string, className?: string }) => {
  const words = text.split(" ");
  
  return (
    <motion.div
      style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}
      variants={typingContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {words.map((word, index) => (
        <motion.span 
          variants={typingChild} 
          key={index}
          className="mr-1.5 inline-block"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

export const Quiz = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { langData, language } = useLanguage();
  const [step, setStep] = useState(1);
  const [stepHistory, setStepHistory] = useState<number[]>([]);
  const totalSteps = 36;
  const [direction, setDirection] = useState(0);
  const [leadId] = useState<string>(() => {
    const saved = localStorage.getItem('quiz_lead_id');
    if (saved) return saved;
    const newId = crypto.randomUUID();
    localStorage.setItem('quiz_lead_id', newId);
    return newId;
  });

  const buildRegistrationPayload = (data: any) => {
    const { password, ...safeData } = data || {};

    return {
      ...safeData,
      weight: safeData.current_weight ?? safeData.weight,
      primary_objective: safeData.objective ?? safeData.primary_objective,
      blockers: safeData.obstacles ?? safeData.blockers ?? [],
    };
  };

  const persistLocalQuizProgress = (currentStep: number, data: any) => {
    if (localStorage.getItem('token')) return;

    localStorage.setItem(PENDING_QUIZ_DATA_KEY, JSON.stringify(buildRegistrationPayload(data)));
    localStorage.setItem(PENDING_QUIZ_STEP_KEY, String(currentStep));
  };

  const syncLead = async (currentStep: number, currentData: any = null, isCompleted = false) => {
    if (!localStorage.getItem('token')) return;
    try {
      const dataToSync = currentData || formData;
      await api.quiz.syncLead({
        id: leadId,
        responses: buildRegistrationPayload(dataToSync),
        current_step: currentStep,
        is_completed: isCompleted
      });
    } catch (err) {
      console.warn('Lead sync failed', err);
    }
  };

  // Restore quiz state on reload, then sync initial step
  useEffect(() => {
    const restoreSync = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        try {
          const pendingQuizData = localStorage.getItem(PENDING_QUIZ_DATA_KEY);
          if (pendingQuizData) {
            const parsedData = JSON.parse(pendingQuizData);
            if (parsedData && typeof parsedData === 'object') {
              setFormData((prev: any) => ({ ...prev, ...parsedData }));
            }
          }

          const pendingStep = Number(localStorage.getItem(PENDING_QUIZ_STEP_KEY));
          if (pendingStep > 1 && pendingStep <= totalSteps) {
            setStep(pendingStep);
          }
        } catch (err) {
          console.warn('Could not restore local quiz progress:', err);
        }
        return;
      }

      try {
        const data = await api.quiz.getSync();
        if (data?.lead) {
          const { responses, current_step, is_completed } = data.lead;

          if (is_completed) {
            try {
              await api.user.update({ onboarding_completed: true });
              await refreshUser();
            } catch (_) {}
            navigate('/home');
            return;
          }

          if (responses && typeof responses === 'object') {
            setFormData((prev: any) => ({ ...prev, ...responses }));
          }
          if (current_step && Number(current_step) > 1) {
            setStep(Number(current_step));
          }
        }
      } catch (err) {
        console.warn('Could not restore quiz sync:', err);
      } finally {
        syncLead(step);
      }
    };

    restoreSync();

    // Preload meal scanner image for Step 25 zero-delay
    const img = new Image();
    img.src = '/fitness_meal_scanner.png';
  }, []);
  useEffect(() => {
    // Fundo premium dark unificado
    document.documentElement.style.backgroundColor = '#0F172A';
    document.body.style.backgroundColor = '#0F172A';
    
    return () => { 
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [formData, setFormData] = useState<any>({
    gender: '',
    workout_frequency: '',
    results_graph: '',
    height: 170,
    current_weight: 70,
    birth_day: 1,
    birth_month: 'Janeiro',
    birth_year: 2001,
    objective: '',
    weight_feeling: '',
    feeling_consequence: '',
    goal_confirmation: '',
    motivation_2: '',
    science_chart: '',
    weight_loss_velocity: 0.5,
    target_weight: 0,
    age: '',
    understands_calories: null,
    activity_level: '',
    workout_days: [],
    obstacles: [],
    goals: [],
    motivation: '',
    blockers: [],
    habit_check: '',
    ready_commitment: '',
    referral_source: '',
    name: '',
    email: '',
    password: '',
    phone: '',
    referral_code: ''
  });
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [authError, setAuthError] = useState('');
  const [pushSubscription, setPushSubscription] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('mensal');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [geoInfo, setGeoInfo] = useState({
    country: '',
    country_code: '',
    city: '',
    ip_address: ''
  });
  const [shakeButton, setShakeButton] = useState(false);
  const [isFreePromoActive, setIsFreePromoActive] = useState(true); // Iniciamos como TRUE para garantir a percepção de graça logo no início

  // Fetch Promotion Status
  useEffect(() => {
    const fetchPromoStatus = async () => {
      try {
        const response = await api.auth.getPromotionStatus();
        // Forçar ativa se o backend retornar true ou se houver erro mas o contador estiver baixo (fallback agressivo)
        if (response && response.isFreePromoActive) {
          setIsFreePromoActive(true);
          console.log('[Quiz] Promo ativa via backend!');
        } else {
          // Se não houver resposta mas o app ainda está em pré-lançamento, mantemos ativa por padrão
          // Isso é um fail-safe para garantir que os primeiros usuários sempre ganhem
          console.log('[Quiz] Promo inativa ou erro no fetch. Verificando fallback...');
        }
      } catch (err) {
        console.error('[Quiz] Erro ao buscar status da promoção:', err);
      }
    };
    fetchPromoStatus();
  }, []);

  // Validação Dinâmica por Etapa
  const isCurrentStepValid = () => {
    // Etapas informativas/gráficos que não requerem input (sempre válidas)
    const informationalSteps = [3, 9, 10, 11, 12, 13, 17, 19, 20, 22, 23, 24, 25, 34, 35, 36];
    if (informationalSteps.includes(step)) return true;

    // Etapas com campos específicos
    switch (step) {
      case 1: return !!formData.gender;
      case 2: return !!formData.workout_frequency;
      case 4: return formData.height > 0 && formData.current_weight > 0;
      case 5: return !!formData.birth_day && !!formData.birth_month && !!formData.birth_year;
      case 6: return !!formData.objective;
      case 15: return formData.obstacles && formData.obstacles.length > 0;
      case 16: return formData.goals && formData.goals.length > 0;
      case 18: return formData.understands_calories !== null;
      case 21: return !!formData.activity_level;
      case 28: return !!formData.referral_source;
      case 29: return formData.name?.trim().length > 1;
      case 30: return formData.email?.includes('@') && formData.email?.includes('.');
      case 31: return formData.phone?.trim().length >= 9;
      case 32: return true; // Cupom é opcional (skip)
      case 27: return analysisProgress === 100;
      default:
        // Fallback: verificar se o campo mapeado tem valor
        const field = fieldMap[step];
        if (!field) return true;
        const val = formData[field];
        if (Array.isArray(val)) return val.length > 0;
        return val !== '' && val !== null && val !== undefined;
    }
  };

  useEffect(() => {
    if (user) {
      setFormData((prev: any) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user?.id]);

  useEffect(() => {
    const { birth_day, birth_month, birth_year } = formData;
    if (!birth_day || !birth_month || !birth_year) return;
    const mesesPT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const mesesEN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    let monthIndex = mesesPT.indexOf(birth_month);
    if (monthIndex === -1) monthIndex = mesesEN.indexOf(birth_month);
    if (monthIndex === -1) return;
    const birthDate = new Date(Number(birth_year), monthIndex, parseInt(String(birth_day)));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    setFormData((prev: any) => ({ ...prev, age: String(age) }));
  }, [formData.birth_day, formData.birth_month, formData.birth_year]);

  useEffect(() => {
    const fetchGeo = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data && !data.error) {
          setGeoInfo({
            country: data.country_name,
            country_code: data.country,
            city: data.city,
            ip_address: data.ip
          });
        }
      } catch (err) {
        console.error('Error fetching geolocation:', err);
      }
    };
    fetchGeo();
  }, []);

  const handleRegistration = async () => {
    if (isRegistering) return;
    setIsRegistering(true);

    const country = geoInfo.country || (selectedCountry.prefix === '+258' ? 'Moçambique' : selectedCountry.prefix === '+27' ? 'África do Sul' : selectedCountry.prefix === '+244' ? 'Angola' : '');
    const country_code = geoInfo.country_code || (selectedCountry.prefix === '+258' ? 'MZ' : selectedCountry.prefix === '+27' ? 'ZA' : selectedCountry.prefix === '+244' ? 'AO' : '');

    try {
      const res = await api.auth.register(
        formData.name,
        formData.email,
        formData.password,
        formData.referral_code,
        {
          // Quiz fields (mapped to backend column names)
          age: formData.age || null,
          gender: formData.gender || null,
          weight: formData.current_weight || null,
          height: formData.height || null,
          primary_objective: formData.objective || null,
          activity_level: formData.activity_level || null,
          target_weight: formData.target_weight || null,
          understands_calories: formData.understands_calories ?? null,
          blockers: formData.obstacles || [],
          // Contact & geo
          phone: formData.phone || null,
          country,
          country_code: geoInfo.country_code || country_code,
          city: geoInfo.city || '',
          ip_address: geoInfo.ip_address || '',
          // Meta
          language: localStorage.getItem('appLanguage') || 'PT',
          subscription_plan: selectedPlan,
          leadId
        }
      );

      if (res.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));

        if (pushSubscription) {
          await notificationService.subscribe().catch(e => console.error('Failed to register device:', e));
        }

        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      console.error("Registration failed:", err);
      if (err.status === 409 || err.message?.includes('já está registrado')) {
        try {
          const loginRes = await api.auth.login(formData.email, formData.password);
          if (loginRes.token) {
            localStorage.setItem('token', loginRes.token);
            localStorage.setItem('user', JSON.stringify(loginRes.user));
            await api.user.update({
              primary_objective: formData.objective,
              gender: formData.gender,
              weight: formData.current_weight,
              height: formData.height,
              target_weight: formData.target_weight,
              activity_level: formData.activity_level,
              phone: formData.phone,
              country,
              onboarding_completed: true
            });
            if (pushSubscription) {
              await notificationService.subscribe().catch(e => console.error('Failed to register device:', e));
            }
            window.location.href = '/dashboard';
          }
        } catch (loginErr: any) {
          if (loginErr.status === 401 || loginErr.message?.includes('Senha incorreta')) {
            setShowPasswordModal(true);
          } else {
            alert(loginErr.message || "Erro ao fazer login");
          }
        }
      } else {
        alert(err.message || "Erro ao criar conta");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleManualLogin = async () => {
    if (!tempPassword) return;
    setIsRegistering(true);
    setAuthError('');
    try {
      const loginRes = await api.auth.login(formData.email, tempPassword);
      if (loginRes.token) {
        localStorage.setItem('token', loginRes.token);
        localStorage.setItem('user', JSON.stringify(loginRes.user));
        // Atualizar perfil com novos dados do quiz
            await api.user.update({
              gender: formData.gender,
              objective: formData.objective,
              height: formData.height,
              weight: formData.current_weight,
              target_weight: formData.target_weight,
              activity_level: formData.activity_level,
              phone: formData.phone,
              country: geoInfo.country || (selectedCountry.prefix === '+258' ? 'Moçambique' : selectedCountry.prefix === '+27' ? 'África do Sul' : selectedCountry.prefix === '+244' ? 'Angola' : ''),
              onboarding_completed: true
            });

        // Registrar dispositivo se tiver subscrição
        if (pushSubscription) {
          try {
            await notificationService.subscribe();
          } catch (pushErr) {
            console.error('Failed to register device during manual login:', pushErr);
          }
        }

        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setAuthError(err.message || "Senha incorreta");
      setIsRegistering(false);
    }
  };

  // Mapeamento de Etapas
  const fieldMap: Record<number, string> = {
    1: 'gender',
    2: 'workout_frequency',
    3: 'results_graph',
    4: 'height_weight',
    5: 'birth_date',
    6: 'objective',
    7: 'target_weight',
    8: 'weight_feeling',
    9: 'feeling_consequence',
    10: 'goal_confirmation',
    11: 'motivation_2',
    12: 'weight_loss_velocity',
    13: 'body_comparison',
    14: 'age',
    15: 'height',
    16: 'current_weight',
    17: 'understands_calories',
    18: 'cal_edu_1',
    19: 'cal_edu_2',
    20: 'cal_edu_3',
    21: 'activity_level',
    23: 'workout_days',
    24: 'blockers',
    25: 'proposta_valor',
    26: 'notificacoes',
    28: 'referral_source',
    29: 'name',
    30: 'email',
    31: 'phone',
    32: 'referral_code',
    27: 'analyzing',
    33: 'final_offer'
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => {
      const newData = { ...prev, [field]: value };
      
      // Validação automática de dias do mês (impede 31 de Novembro, etc.)
      if (field === 'birth_month' || field === 'birth_year' || field === 'birth_day') {
        const mesesPT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesesEN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        const monthName = newData.birth_month;
        const year = parseInt(newData.birth_year);
        const day = parseInt(newData.birth_day);
        
        let monthIndex = mesesPT.indexOf(monthName);
        if (monthIndex === -1) monthIndex = mesesEN.indexOf(monthName);
        
        if (monthIndex !== -1) {
          const maxDays = new Date(year, monthIndex + 1, 0).getDate();
          if (day > maxDays) {
            newData.birth_day = maxDays;
          }
        }
      }
      
      persistLocalQuizProgress(step, newData);
      return newData;
    });
  };

  const goToStep = (newStep: number) => {
    setStepHistory(prev => [...prev, step]);
    setDirection(1);
    setStep(newStep);
    persistLocalQuizProgress(newStep, formData);
    syncLead(newStep);
  };

  const nextStep = (overrideValue?: { field: string, value: any }) => {
    setDirection(1);
    
    const currentObjective = overrideValue?.field === 'objective' ? overrideValue.value : formData.objective;
    const currentCalories = overrideValue?.field === 'understands_calories' ? overrideValue.value : formData.understands_calories;

    // Smart Jumps Reforçados (Ajustados para 32 passos)
    if (step === 18 && currentCalories === true) { 
      goToStep(22); // Ótimo, você já tem uma base!
      return;
    }
    if (step === 18 && currentCalories === false) { 
      goToStep(19); // Explicação Básica
      return;
    }
    if (step === 19) {
      goToStep(20); // Estratégia Calórica (Dinâmica)
      return;
    }
    if (step === 20) {
      goToStep(22); // Ótimo, você já tem uma base!
      return;
    }
    if (step === 22) {
      goToStep(23); // Depoimento (social proof)
      return;
    }
    if (step === 23) {
      goToStep(24); // Histórias de Sucesso (Social Proof)
      return;
    }
    if (step === 24) {
      goToStep(25); // Proposta de Valor (Benefits)
      return;
    }
    if (step === 25) {
      goToStep(26); // Notificações
      return;
    }
    if (step === 26) {
      goToStep(28); // Onde ouviu falar
      return;
    }
    if (step === 28) {
      goToStep(user ? 32 : 29);
      return;
    }
    if (step === 29) {
      goToStep(30);
      return;
    }
    if (step === 30) {
      goToStep(31);
      return;
    }
    if (step === 31) {
      goToStep(32);
      return;
    }
    if (step === 32) {
      handleFinalize();
      return;
    }
    if (step === 27) {
      goToStep(34);
      return;
    }
    if (step === 34) {
      goToStep(35);
      return;
    }
    if (step === 35) {
      goToStep(36);
      return;
    }
    if (step === 36) {
      handleFinalize();
      return;
    }
    if (step === 21) {
      // Se for "manter", pula o depoimento individual (23) e vai para Histórias de Sucesso (24)
      goToStep(currentObjective === 'manter' ? 24 : 23);
      return;
    }
    if (step === 6 && currentObjective === 'manter') { 
      goToStep(8); 
      return;
    }
    // Lógica para o Passo 12 (Branching Inicial)
    if (step === 11 && currentObjective === 'ganhar') {
      goToStep(13); // Ganhar pula Velocidade (12) e vai para Sucesso (13)
      return;
    }
    
    // Lógica para o Passo 12, 13 e 15 (Branching Final)
    if (step === 11 && currentObjective === 'manter') {
      goToStep(15); // Manter pula Gráficos (12, 13, 14) e vai para Obstáculos (15)
      return;
    }
    
    if (step === 13) {
      goToStep(15); // Perder/Ganhar vão para Obstáculos (15)
      return;
    }

    if (step === 15) {
      goToStep(16); // Segue para Conquistas (16)
      return;
    }

    if (step === 16) {
      goToStep(17); // Segue para gráfico de musculatura (17)
      return;
    }

    if (step === 17) {
      goToStep(18); // Segue para Conhecimento de Calorias (18)
      return;
    }

    if (step === 12 && currentObjective !== 'perder') {
      goToStep(15); // Fallback: Manter/Ganhar pulam o 12 se chegarem aqui
      return;
    }

    if (step < totalSteps) {
      goToStep(step + 1);
    } else {
      handleFinalize();
    }
  };

  const prevStep = () => {
    setDirection(-1);
    
    if (stepHistory.length > 0) {
      const prev = stepHistory[stepHistory.length - 1];
      setStepHistory(prevArr => prevArr.slice(0, -1));
      setStep(prev);
      persistLocalQuizProgress(prev, formData);
    } else if (step === 1) {
      navigate(-1);
    } else {
      const previousStep = step - 1;
      setStep(previousStep);
      persistLocalQuizProgress(previousStep, formData);
    }
  };

  const handleFinalize = async () => {
    try {
      if (step === 36) {
        // Redirecionamento Final para Checkout
        console.log("Onboarding finalizado, salvando dados...");

        const pendingQuizData = buildRegistrationPayload(formData);

        await syncLead(36, pendingQuizData, true);

        if (!localStorage.getItem('token')) {
          persistLocalQuizProgress(36, pendingQuizData);
        }

        if (isFreePromoActive) {
          console.log("[Quiz] Promo ativa! Pulando checkout...");
          navigate(`/register-password?email=${encodeURIComponent(formData.email)}&name=${encodeURIComponent(formData.name)}&promo=true`);
        } else {
          navigate(`/checkout?email=${encodeURIComponent(formData.email)}&name=${encodeURIComponent(formData.name)}&plan=${selectedPlan}`);
        }
        return;
      }

      // Se ainda não estiver no 36, vai para a Análise (Passo 27)
      setAnalysisProgress(0);
      goToStep(27);
    } catch (err) {
      console.error("Erro ao finalizar", err);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const permissionGranted = await notificationService.subscribeFromUserGesture(false);
      setPushSubscription(permissionGranted ? true : null);
    } catch (err) {
      console.error('Erro ao solicitar permissão:', err);
    } finally {
      nextStep();
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  const getAnalysisTitle = () => {
    if (analysisProgress <= 30) return langData.quiz_analysis_title_1;
    if (analysisProgress <= 70) return langData.quiz_analysis_title_2;
    return langData.quiz_analysis_title_3;
  };

  const renderContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col items-center text-center mt-16 px-4">
            <h2 className="text-[32px] font-black text-white mb-2 leading-tight">{langData.quiz_step_gender_title}</h2>
            <p className="text-gray-500 font-medium mb-12">{langData.welcome_subtitle}</p>
            
            <div className="w-full space-y-4">
              {[
                { id: 'Masculino', label: langData.quiz_gender_male },
                { id: 'Feminino', label: langData.quiz_gender_female },
                { id: 'Outro', label: langData.quiz_gender_other }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { updateField('gender', opt.id); setTimeout(() => nextStep(), 300); }}
                  className={`w-full py-5 rounded-[22px] text-lg font-bold transition-all ${
                    formData.gender === opt.id ? 'bg-[#22C55E]/10 border-[#22C55E] text-[#22C55E] shadow-lg shadow-[#22C55E]/10' : 'bg-[var(--bg-card)] text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col items-center text-center mt-16 px-4">
            <h2 className="text-[32px] font-black text-white mb-2 leading-tight px-6">{langData.quiz_step_activity_title}</h2>
            <p className="text-gray-500 font-medium mb-10">{langData.welcome_subtitle}</p>
            
            <div className="w-full space-y-4">
              {[
                { id: '0-2', label: '0-2', desc: langData.quiz_activity_sedentary_desc },
                { id: '3-5', label: '3-5', desc: langData.quiz_activity_light_desc },
                { id: '6+', label: '6+', desc: langData.quiz_activity_very_desc }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { updateField('workout_frequency', opt.id); setTimeout(() => nextStep(), 300); }}
                  className={`w-full py-4 rounded-[22px] flex flex-col items-center justify-center transition-all ${
                    formData.workout_frequency === opt.id ? 'bg-[#22C55E]/10 border-[#22C55E] text-[#22C55E] shadow-lg shadow-[#22C55E]/10' : 'bg-[var(--bg-card)] text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  <span className="text-xl font-black">{opt.label}</span>
                  <span className="text-sm font-bold opacity-60">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col items-center text-center mt-12 px-6">
            <h2 className="text-[30px] font-black text-white mb-2 leading-tight px-4">
              {formData.objective === 'ganhar' ? langData.quiz_chart_gain_title : langData.quiz_chart_loss_title}
            </h2>
            <p className="text-gray-500 font-medium mb-14 text-sm leading-relaxed px-4">{langData.quiz_chart_subtitle}</p>
            
            <div className="w-full relative mt-10">
               <div className="absolute -top-12 left-0 text-xs font-bold text-white">
                 {formData.objective === 'ganhar' ? 'Sua Massa' : 'Seu Peso'}
               </div>
               <div className="absolute -top-12 right-0 text-xs font-bold text-white">{langData.quiz_chart_standard}</div>
               
               <svg viewBox="0 0 400 220" className="w-full h-auto overflow-visible">
                  <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                  <line x1="0" y1="130" x2="400" y2="130" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                  <path d="M 10 30 L 100 80 L 200 150 L 300 180 L 390 190 L 390 200 L 10 200 Z" fill="rgba(255,255,255,0.02)" />
                  <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }} d="M 10 130 C 50 130, 80 140, 100 120 C 130 100, 180 110, 220 90 C 260 70, 300 40, 390 30" fill="none" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
                  <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }} d="M 10 30 L 100 80 L 200 150 L 300 180 L 390 190" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                  <circle cx="10" cy="30" r="8" fill="white" stroke="#0F172A" strokeWidth="3" />
                  <circle cx="390" cy="190" r="8" fill="white" stroke="#0F172A" strokeWidth="3" />
                  <line x1="0" y1="200" x2="400" y2="200" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                  <text x="10" y="215" fontSize="10" fontWeight="bold" className="fill-gray-500">Mês 1</text>
                  <text x="375" y="215" fontSize="10" fontWeight="bold" className="fill-gray-500">Mês 6</text>
                  <text x="10" y="185" fontSize="12" fontWeight="black" className="fill-[#22C55E] italic">profit</text>
               </svg>
            </div>
            
            <p className="mt-8 text-xs font-bold text-gray-400 max-w-[280px] mx-auto uppercase tracking-wider leading-relaxed">
              {langData.quiz_chart_footer}
            </p>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col items-center text-center mt-12 px-6">
            <h2 className="text-[32px] font-black text-white mb-2 leading-tight">{langData.quiz_step_height_title} & {langData.quiz_step_weight_title.split(' ')[4]}</h2>
            <p className="text-gray-500 font-medium mb-12 text-sm px-6 leading-relaxed">{langData.welcome_subtitle}</p>
            
            <div className="w-full flex justify-between gap-8 mt-4">
               <div className="flex-1 flex flex-col items-center">
                  <span className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[2px]">{langData.quiz_step_height_title.split(' ')[4]} (cm)</span>
                  <ScrollPicker 
                    items={Array.from({ length: 81 }, (_, i) => 140 + i)}
                    unit=" cm"
                    value={formData.height} 
                    onChange={(v) => updateField('height', v)} 
                  />
               </div>
               <div className="flex-1 flex flex-col items-center">
                  <span className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[2px]">{langData.quiz_step_weight_title.split(' ')[4]} (kg)</span>
                  <ScrollPicker 
                    items={Array.from({ length: 146 }, (_, i) => 35 + i)}
                    unit=" kg"
                    value={formData.current_weight} 
                    onChange={(v) => updateField('current_weight', v)} 
                  />
               </div>
            </div>
          </div>
        );

      case 5:
        const meses = language === 'PT' ? ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"] : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const anos = Array.from({ length: 85 }, (_, i) => 1940 + i);
        const currentMonthIndex = meses.indexOf(formData.birth_month);
        const maxDays = currentMonthIndex !== -1 ? new Date(formData.birth_year, currentMonthIndex + 1, 0).getDate() : 31;
        const dias = Array.from({ length: maxDays }, (_, i) => i + 1);

        return (
          <div className="flex flex-col items-center text-center mt-12 px-6">
            <h2 className="text-[32px] font-black text-white mb-2 leading-tight">{langData.quiz_step_age_title}</h2>
            <p className="text-gray-500 font-medium mb-12 text-sm px-6">{langData.welcome_subtitle}</p>
            
            <div className="w-full flex justify-between gap-2 mt-4">
               <div className="w-20 flex flex-col items-center">
                  <span className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[2px]">{langData.quiz_day}</span>
                  <ScrollPicker 
                    items={dias.map(d => d < 10 ? `0${d}` : d)}
                    value={formData.birth_day < 10 && typeof formData.birth_day === 'number' ? `0${formData.birth_day}` : formData.birth_day} 
                    onChange={(v) => updateField('birth_day', v)} 
                  />
               </div>
               <div className="flex-1 flex flex-col items-center px-1">
                  <span className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[2px]">{langData.quiz_month}</span>
                  <ScrollPicker 
                    items={meses}
                    value={formData.birth_month} 
                    onChange={(v) => updateField('birth_month', v)} 
                  />
               </div>
               <div className="w-24 flex flex-col items-center">
                  <span className="text-[10px] font-black text-gray-400 mb-4 uppercase tracking-[2px]">{langData.quiz_year}</span>
                  <ScrollPicker 
                    items={anos}
                    value={formData.birth_year} 
                    onChange={(v) => updateField('birth_year', v)} 
                  />
               </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="flex flex-col items-center text-center mt-16 px-4">
            <h2 className="text-[32px] font-black text-white mb-2 px-6 leading-tight">{langData.quiz_step_goal_title}</h2>
            <p className="text-gray-500 font-medium mb-12">{langData.welcome_subtitle}</p>
            <div className="w-full space-y-4">
               {[
                 { id: 'perder', label: langData.quiz_goal_lose },
                 { id: 'manter', label: langData.quiz_goal_maintain },
                 { id: 'ganhar', label: langData.quiz_goal_gain }
               ].map(opt => (
                 <button
                   key={opt.id}
                   onClick={() => { updateField('objective', opt.id); setTimeout(() => nextStep({ field: 'objective', value: opt.id }), 300); }}
                   className={`w-full py-5 rounded-[22px] text-lg font-bold transition-all ${
                     formData.objective === opt.id ? 'bg-[#22C55E]/10 border-[#22C55E] text-[#22C55E] shadow-lg shadow-[#22C55E]/10' : 'bg-[var(--bg-card)] text-white hover:bg-white/10 border border-white/5'
                   }`}
                 >
                   {opt.label}
                 </button>
               ))}
            </div>
          </div>
        );

      case 7:
        const targetValue = formData.target_weight || formData.current_weight;
        const diff = targetValue - formData.current_weight;
        const diffText = diff > 0 ? `+${diff.toFixed(1)} kg` : `${diff.toFixed(1)} kg`;
        const diffColor = (diff > 0 && formData.objective === 'ganhar') || (diff < 0 && formData.objective === 'perder') 
          ? 'text-[#22C55E]' : 'text-[#22C55E]';

        return (
          <div className="flex flex-col items-center text-center mt-12 px-6">
            <h2 className="text-[28px] font-black text-white mb-2 leading-tight">{langData.quiz_step_target_weight_title}</h2>
            <p className="text-gray-500 font-medium mb-12 capitalize">{formData.objective} {langData.quiz_step_weight_title.split(' ')[4]}</p>
            
            <div className="mb-16">
              <div className="text-[48px] font-black text-white leading-none">{targetValue.toFixed(1)} kg</div>
              <div className={`text-lg font-bold mt-2 ${diffColor}`}>{diffText}</div>
            </div>

            <div className="w-full relative h-32 flex items-center justify-center overflow-hidden">
               <div className="absolute top-0 bottom-0 w-1 bg-gray-900 z-10 rounded-full h-20 self-center"></div>
               <div 
                 className="flex h-24 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-[45%]"
                 onScroll={(e) => {
                   const scrollLeft = (e.currentTarget as HTMLDivElement).scrollLeft;
                   const newValue = Math.round(scrollLeft / 15) + 30;
                   if (newValue !== targetValue) updateField('target_weight', newValue);
                 }}
               >
                 {Array.from({ length: 171 }, (_, i) => i + 30).map(v => (
                   <div key={v} className="flex-none w-[15px] flex flex-col items-center justify-end pb-2 snap-center">
                      <div className={`w-[2px] bg-gray-300 ${v % 5 === 0 ? 'h-10 bg-gray-500' : 'h-6'}`}></div>
                      {v % 5 === 0 && <span className="text-[10px] text-gray-400 mt-2 font-bold">{v}</span>}
                   </div>
                 ))}
               </div>
            </div>

            <div className="mt-12">
              <span className="text-xl font-bold text-white">{formData.current_weight} kg</span>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="flex flex-col items-center text-center mt-12 px-4 w-full">
            <h2 className="text-[26px] font-black text-white mb-8 leading-tight px-6">{langData.quiz_step_feeling_title}</h2>
            
            <div className="w-full space-y-3 px-2">
              {[
                { id: 'frustrado', label: langData.quiz_feeling_frustrated },
                { id: 'evito', label: langData.quiz_feeling_avoidance },
                { id: 'conformado', label: langData.quiz_feeling_resigned },
                { id: 'determinado', label: langData.quiz_feeling_determined }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { updateField('weight_feeling', opt.id); setTimeout(() => nextStep(), 300); }}
                  className={`w-full py-4 px-6 rounded-[18px] text-left transition-all ${
                    formData.weight_feeling === opt.id ? 'bg-[#22C55E]/10 border-[#22C55E] text-[#22C55E] shadow-lg shadow-[#22C55E]/10' : 'bg-[var(--bg-card)] text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  <span className="text-[15px] font-bold leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 9:
        let feelingTitle = "";
        let feelingSub = "";

        if (formData.weight_feeling === 'determinado') {
          feelingTitle = langData.quiz_feeling_result_determinado_title;
          feelingSub = langData.quiz_feeling_result_determinado_sub;
        } else if (formData.weight_feeling === 'conformado') {
          feelingTitle = langData.quiz_feeling_result_conformado_title;
          feelingSub = langData.quiz_feeling_result_conformado_sub;
        } else if (formData.weight_feeling === 'frustrado') {
          feelingTitle = langData.quiz_feeling_result_frustrado_title;
          feelingSub = langData.quiz_feeling_result_frustrado_sub;
        } else if (formData.weight_feeling === 'evito') {
          feelingTitle = langData.quiz_feeling_result_evito_title;
          feelingSub = langData.quiz_feeling_result_evito_sub;
        }

        const today = new Date();
        const day = today.getDate();
        const monthNamesPT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const monthNamesEN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const month = language === 'PT' ? monthNamesPT[today.getMonth()] : monthNamesEN[today.getMonth()];
        const todayStr = language === 'PT' ? `Já estamos no dia ${day} de ${month}.` : `We are already on ${month} ${day}.`;
        
        const finalTitle = feelingTitle.replace('{todayStr}', todayStr);

        return (
          <div className="flex flex-col items-center justify-center text-center mt-32 px-10">
            <h2 className="text-[28px] font-black text-white mb-6 leading-tight">{finalTitle}</h2>
            <p className="text-gray-500 font-medium text-lg leading-relaxed">{feelingSub}</p>
          </div>
        );

      case 10:
        let goalText = "";
        let goalVal = "";
        
        if (formData.objective === 'ganhar') {
          goalText = langData.quiz_goal_text_gain;
          goalVal = `${Math.abs((formData.target_weight || 0) - (formData.current_weight || 0)).toFixed(0)} kg`;
        } else if (formData.objective === 'manter') {
          goalText = langData.quiz_goal_text_maintain;
          goalVal = `${(formData.current_weight || 0)} kg`;
        } else {
          goalText = langData.quiz_goal_text_lose;
          goalVal = `${Math.abs((formData.current_weight || 0) - (formData.target_weight || 0)).toFixed(1)} kg`;
        }

        // Corrigindo o texto e a capitalização (Remover "peso" e capitalizar)
        const displayGoalText = goalText.replace(' peso', '').replace(' seu peso', '').trim();
        const capitalizedGoalText = displayGoalText.charAt(0).toUpperCase() + displayGoalText.slice(1);

        // Pegar o sufixo da tradução (tudo depois de {goalVal})
        const fullTranslation = langData.quiz_goal_realistic_title;
        const suffix = fullTranslation.substring(fullTranslation.indexOf('{goalVal}') + '{goalVal}'.length).trim();

        return (
          <div className="flex flex-col items-center justify-center text-center mt-32 px-8">
            <h2 className="text-[30px] font-black text-white mb-8 leading-tight">
              {capitalizedGoalText} <span className="text-[#22C55E] drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">{goalVal}</span> {suffix}
            </h2>
            <p className="text-gray-500 font-medium text-lg leading-relaxed px-4">
              {langData.quiz_goal_realistic_sub}
            </p>
          </div>
        );

      case 11:
        const isManter = formData.objective === 'manter';
        const isPerder = formData.objective === 'perder';

        let m2Title = isManter ? langData.quiz_motivation_maintain_title : langData.quiz_motivation_gain_title;
        let m2SubText = isManter ? langData.quiz_motivation_maintain_sub : langData.quiz_motivation_gain_sub;

        if (isPerder) {
          m2Title = langData.quiz_motivation_lose_title;
          m2SubText = langData.quiz_motivation_lose_sub;
        }

        return (
          <div className="flex flex-col items-center justify-center text-center mt-32 px-8">
            <h2 className="text-[30px] font-black text-white mb-8 leading-tight">
              {m2Title}
            </h2>
            <p className="text-gray-500 font-medium text-lg leading-relaxed px-4">
              {m2SubText}
            </p>
          </div>
        );

      case 12:
        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center text-center mt-12 px-6"
          >
            <h2 className="text-[28px] font-black text-white mb-4 leading-tight px-4">
              {langData.quiz_step_velocity_title}
            </h2>
            <p className="text-gray-500 font-medium text-lg mb-10 px-6">
              {langData.quiz_velocity_subtitle}
            </p>
            
            <div className="w-full max-w-xs space-y-10">
                 <div className="flex flex-col items-center gap-4">
                    <span className="text-[34px] font-black text-white tracking-tight">
                      {formData.weight_loss_velocity.toFixed(1)} kg <span className="text-white font-bold text-2xl">{langData.quiz_velocity_per_week}</span>
                    </span>
                    
                    <div className="flex justify-between w-full px-8 items-center text-3xl">
                       <span className={`transition-all duration-300 ${formData.weight_loss_velocity < 0.5 ? 'opacity-100 scale-110' : 'opacity-20 grayscale'}`}>🦥</span>
                       <span className={`transition-all duration-300 ${formData.weight_loss_velocity >= 0.5 && formData.weight_loss_velocity < 1.0 ? 'opacity-100 scale-110' : 'opacity-20 grayscale'}`}>🐇</span>
                       <span className={`transition-all duration-300 ${formData.weight_loss_velocity >= 1.0 ? 'opacity-100 scale-110' : 'opacity-20 grayscale'}`}>🐆</span>
                    </div>
                 </div>

                 <div className="relative pt-4 px-6">
                    <div className="relative h-[5px] bg-gray-100 rounded-full w-full">
                       <input 
                         type="range" 
                         min="0.1" 
                         max="1.5" 
                         step="0.1"
                         value={formData.weight_loss_velocity}
                         onChange={(e) => updateField('weight_loss_velocity', parseFloat(e.target.value))}
                         className="absolute top-1/2 -translate-y-1/2 left-0 w-full cursor-pointer h-10 z-20 opacity-0"
                       />
                       <div 
                         className="absolute top-1/2 -translate-y-1/2 w-10 h-7 bg-black rounded-[10px] z-10 pointer-events-none flex items-center justify-center shadow-md transition-all"
                         style={{ left: `calc(${((formData.weight_loss_velocity - 0.1) / (1.5 - 0.1)) * 100}% - 20px)` }}
                       >
                          <div className="w-[3px] h-3 bg-gray-100/20 rounded-full"></div>
                       </div>
                    </div>

                    <button 
                       onClick={() => updateField('weight_loss_velocity', 0.5)}
                       className="mt-14 text-gray-400 font-bold text-base hover:text-orange-500 transition-colors uppercase tracking-widest"
                    >
                      {langData.quiz_velocity_recommended}
                    </button>
                 </div>
            </div>
          </motion.div>
        );

      case 13:
        const isPerderChart = formData.objective === 'perder';
        const chartTitle = isPerderChart ? langData.quiz_chart_loss_title : langData.quiz_chart_gain_title;

        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center justify-center text-center mt-8 px-6"
          >
            <h2 className="text-[28px] font-black text-white mb-4 leading-tight px-4">
              {chartTitle}
            </h2>
            <p className="text-gray-500 font-medium text-lg mb-8 px-6 leading-tight">
              {langData.quiz_chart_subtitle}
            </p>
            
            <div className="bg-[var(--bg-card)] rounded-[32px] p-8 w-full max-w-[340px] shadow-2xl relative overflow-hidden border border-white/5">
               <div className="flex justify-between items-end gap-6 mb-4 h-[220px]">
                  <div className="flex-1 flex flex-col items-center gap-3">
                     <span className="text-sm font-bold text-gray-400 text-center mb-auto leading-tight">{langData.quiz_chart_standard.split(' ')[0]}<br/>{langData.quiz_chart_standard.split(' ')[1]}</span>
                     <div className="w-full bg-[var(--bg-app)] rounded-[24px] p-2 flex flex-col items-center justify-end h-[160px] shadow-inner border border-white/5">
                       <motion.div 
                         initial={{ height: 0 }}
                         animate={{ height: 45 }}
                         transition={{ duration: 1, delay: 0.5 }}
                         className="w-full bg-white/10 rounded-2xl flex items-center justify-center relative border border-white/5"
                       >
                          <span className="text-base font-black text-gray-400">20%</span>
                       </motion.div>
                     </div>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-3">
                     <span className="text-sm font-bold text-gray-400 text-center mb-auto leading-tight">{langData.quiz_chart_profit.split(' ')[1]}<br/>ProFit</span>
                     <div className="w-full bg-[var(--bg-app)] rounded-[24px] p-2 flex flex-col items-center justify-end h-[160px] shadow-inner border border-white/5">
                       <motion.div 
                         initial={{ height: 0 }}
                         animate={{ height: 140 }}
                         transition={{ duration: 1, delay: 0.8 }}
                         className="w-full bg-gradient-to-t from-[#22C55E] to-[#22C55E] rounded-2xl flex items-center justify-center relative shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                       >
                          <span className="text-2xl font-black text-white italic tracking-tighter">2X</span>
                       </motion.div>
                     </div>
                  </div>
               </div>
               <p className="text-[15px] text-gray-500 font-bold mt-6 leading-tight">{langData.quiz_chart_footer}</p>
            </div>
          </motion.div>
        );


      case 15: // NOVO: Obstáculos (Múltipla Seleção - Versão Compacta Sem Scroll)
        const obstacleOptions = [
          { id: 'consistency', label: langData.quiz_obstacle_consistency, icon: <BarChart2 className="w-4 h-4" /> },
          { id: 'habits', label: langData.quiz_obstacle_habits, icon: <Utensils className="w-4 h-4" /> },
          { id: 'support', label: langData.quiz_obstacle_support, icon: <Users className="w-4 h-4" /> },
          { id: 'schedule', label: langData.quiz_obstacle_schedule, icon: <Calendar className="w-4 h-4" /> },
          { id: 'inspiration', label: langData.quiz_obstacle_inspiration, icon: <Apple className="w-4 h-4" /> }
        ];

        const toggleObstacle = (id: string) => {
          const current = formData.obstacles || [];
          if (current.includes(id)) {
            updateField('obstacles', current.filter((i: string) => i !== id));
          } else {
            updateField('obstacles', [...current, id]);
          }
        };

        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center text-center mt-2 px-6 h-full min-h-[580px]"
          >
            <div className="flex flex-col items-center">
              <h2 className="text-[26.5px] font-black text-white mb-1 leading-tight px-4 tracking-tight">
                {langData.quiz_step_obstacles_title}
              </h2>
              <p className="text-gray-400 font-bold text-[14.5px] mb-6 px-6">
                {langData.quiz_obstacles_subtitle}
              </p>

              <div className="w-full max-w-sm space-y-2">
                {obstacleOptions.map((opt) => {
                  const isSelected = formData.obstacles?.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleObstacle(opt.id)}
                      className={`w-full flex items-center gap-4 p-3.5 rounded-[22px] transition-all duration-300 text-left border-2 ${
                        isSelected 
                        ? 'bg-[#22C55E]/10 border-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.2)] scale-[1.01]' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-colors shrink-0 ${
                        isSelected ? 'bg-[#22C55E] text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-[#0F172A] text-gray-500 shadow-sm'
                      }`}>
                        {opt.icon}
                      </div>
                      <span className={`text-[15.5px] font-black leading-tight ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );


      case 16: // NOVO: Conquistas (Múltipla Seleção - Versão Compacta)
        const goalOptions = [
          { id: 'health', label: langData.quiz_goal_health, icon: <Apple className="w-4 h-4" /> },
          { id: 'energy', label: langData.quiz_goal_energy, icon: <Sun className="w-4 h-4" /> },
          { id: 'motivation', label: langData.quiz_goal_motivation, icon: <Dumbbell className="w-4 h-4" /> },
          { id: 'body', label: langData.quiz_goal_body, icon: <Smile className="w-4 h-4" /> }
        ];

        const toggleGoal = (id: string) => {
          const current = formData.goals || [];
          if (current.includes(id)) {
            updateField('goals', current.filter((g: string) => g !== id));
          } else {
            updateField('goals', [...current, id]);
          }
        };

        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center text-center mt-2 px-6 h-full min-h-[580px]"
          >
            <div className="flex flex-col items-center">
              <h2 className="text-[28px] font-black text-white mb-2 leading-tight px-6 tracking-tight">
                {langData.quiz_step_conquer_title}
              </h2>
              <p className="text-gray-400 font-bold text-[15px] mb-8 px-6">
                {langData.quiz_goals_subtitle}
              </p>

              <div className="w-full max-w-sm space-y-2.5">
                {goalOptions.map((opt) => {
                  const isSelected = formData.goals?.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleGoal(opt.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-[22px] transition-all duration-300 text-left border-2 ${
                        isSelected 
                        ? 'bg-[#22C55E]/10 border-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.2)] scale-[1.01]' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-colors shrink-0 ${
                        isSelected ? 'bg-[#22C55E] text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-[#0F172A] text-gray-500 shadow-sm'
                      }`}>
                        {opt.icon}
                      </div>
                      <span className={`text-[16px] font-black leading-tight ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );


      case 17: // NOVO: Gráfico de Educação Muscular (Versão "Pixel-Perfect" sem Sobreposição)
        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center mt-12 px-6 h-full"
          >
            <div className="flex flex-col items-center w-full max-w-sm">
              <h2 className="text-[27px] font-black text-white mb-8 leading-tight px-4 tracking-tight">
                {langData.quiz_step_evolution_title}
              </h2>
              
              {/* SVG Curve Graphics - Curva mais "Wavy" e Espaçada */}                  <svg viewBox="0 0 340 200" className="w-full h-full overflow-visible">
                    {/* The curve itself - Mais ondulada */}
                    <motion.path
                      d="M 20 170 C 60 170, 90 175, 110 155 S 180 140, 220 130 S 280 100, 325 55"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="6"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                    />

                    {/* Checkpoints - Reposicionados para ficarem abaixo da linha */}
                    <motion.g
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                    >
                      <circle cx="85" cy="167" r="9" fill="white" stroke="#0F172A" strokeWidth="4" />
                      <text x="85" y="195" textAnchor="middle" className="text-[13px] font-black fill-white italic">{langData.quiz_evolution_3days}</text>
                    </motion.g>

                    <motion.g
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 1.2, duration: 0.4 }}
                    >
                      <circle cx="195" cy="136" r="10" fill="white" stroke="#0F172A" strokeWidth="4" />
                      <text x="195" y="165" textAnchor="middle" className="text-[15px] font-black fill-white italic">{langData.quiz_evolution_7days}</text>
                    </motion.g>

                    <motion.g
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: 1 }}
                      transition={{ delay: 2, duration: 0.5, type: 'spring' }}
                    >
                      {/* Trophy Bubble */}
                      <circle cx="315" cy="65" r="24" fill="#22C55E" stroke="#0F172A" strokeWidth="4" />
                      <foreignObject x="301" y="51" width="28" height="28">
                         <Trophy className="w-7 h-7 text-white" />
                      </foreignObject>
                      <text x="315" y="115" textAnchor="middle" className="text-[17px] font-black fill-white italic">{langData.quiz_evolution_30days}</text>
                    </motion.g>
                 </svg>
              </div>

              <p className="text-[var(--text-muted)] font-bold text-[14.5px] leading-[1.6] px-4">
                {langData.quiz_evolution_footer}
              </p>
          </motion.div>
        );


      case 18: // NOVO: Conhecimento de Calorias (Refinado para Versão Profissional)
        const getGoalText = () => {
          if (formData.objective === 'perder') return langData.quiz_goal_text_lose;
          if (formData.objective === 'ganhar') return langData.quiz_goal_text_gain;
          return langData.quiz_goal_text_maintain;
        };

        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center text-center mt-20 px-8 h-full"
          >
            <div className="flex flex-col items-center w-full max-w-sm">
              <h2 className="text-[23.5px] font-black text-white mb-10 leading-[1.3] px-2 tracking-tight">
                {langData.quiz_step_calories_intro.replace('{goal}', getGoalText())}
              </h2>
              
              <div className="w-full space-y-3">
                <button
                  onClick={() => { updateField('understands_calories', true); setTimeout(() => nextStep({ field: 'understands_calories', value: true }), 300); }}
                  className={`w-full py-5 rounded-[22px] font-bold text-lg transition-all ${
                    formData.understands_calories === true
                    ? 'bg-[#22C55E] text-white shadow-lg'
                    : 'bg-white/5 text-gray-400 active:bg-white/10 border border-white/5'
                  }`}
                >
                  {langData.quiz_yes}
                </button>

                <button
                  onClick={() => { updateField('understands_calories', false); setTimeout(() => nextStep({ field: 'understands_calories', value: false }), 300); }}
                  className={`w-full py-5 rounded-[22px] font-bold text-lg transition-all ${
                    formData.understands_calories === false
                    ? 'bg-[#22C55E] text-white shadow-lg'
                    : 'bg-white/5 text-gray-400 active:bg-white/10 border border-white/5'
                  }`}
                >
                  {langData.quiz_no}
                </button>
              </div>
            </div>
          </motion.div>
        );

      case 19: // NOVO: Explicação de Calorias com Efeito de Digitação (Typing Effect)
        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center text-center mt-12 px-8 h-full"
          >
            <div className="flex flex-col items-center w-full max-w-sm">
              <h2 className="text-[28px] font-black text-white mb-8 leading-tight tracking-tight">
                {langData.quiz_step_explain_title}
              </h2>
              
              <div className="space-y-12 w-full">
                 <div className="w-full text-center">
                    <TypingText 
                      text={langData.quiz_explain_p1}
                      className="text-[var(--text-muted)] font-bold text-[16.5px] leading-[1.6]"
                    />
                 </div>

                 <div className="flex flex-col items-center w-full">
                    <TypingText 
                      text={langData.quiz_explain_p2}
                      className="text-[var(--text-muted)] font-bold text-[16px] leading-[1.6] mb-6"
                    />
                    
                        <div className="space-y-4 w-full">
                           <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center group border border-white/5">
                              <span className="text-gray-400 font-bold">{langData.quiz_explain_banana}</span>
                              <span className="text-[#22C55E] font-black">~90 kcal</span>
                           </motion.div>
                           <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 }} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center group border border-white/5">
                              <span className="text-gray-400 font-bold">{langData.quiz_explain_bread}</span>
                              <span className="text-[#22C55E] font-black">~80 kcal</span>
                           </motion.div>
                           <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.6 }} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center group border border-white/5">
                              <span className="text-gray-400 font-bold">{langData.quiz_explain_rice}</span>
                              <span className="text-[#22C55E] font-black">~40 kcal</span>
                           </motion.div>
                        </div>
                 </div>
              </div>
            </div>
          </motion.div>
        );

      case 20: // NOVO: Como isso te ajuda (Dinâmico por Objetivo)
        const getStrategyTitle = () => {
          if (formData.objective === 'perder') return langData.quiz_step_how_helps_title.replace('{goal}', langData.quiz_goal_text_lose);
          if (formData.objective === 'ganhar') return langData.quiz_step_how_helps_title.replace('{goal}', langData.quiz_goal_text_gain);
          return langData.quiz_step_how_helps_title.replace('{goal}', langData.quiz_goal_text_maintain);
        };

        const getStrategyText = () => {
          if (formData.objective === 'perder') {
            return {
              p1: langData.quiz_helps_lose_p1,
              p2: langData.quiz_helps_lose_p2,
            };
          }
          if (formData.objective === 'ganhar') {
            return {
              p1: langData.quiz_helps_gain_p1,
              p2: langData.quiz_helps_gain_p2,
            };
          }
          return {
            p1: langData.quiz_helps_maintain_p1,
            p2: langData.quiz_helps_maintain_p2,
          };
        };

        const strategy = getStrategyText();

        return (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-center mt-12 px-8 h-full"
          >
            <div className="flex flex-col items-center w-full max-w-sm">
              <h2 className="text-[28px] font-black text-white mb-10 leading-tight tracking-tight">
                {getStrategyTitle()}
              </h2>
              
              <div className="space-y-12 w-full">
                 <TypingText text={strategy.p1} className="text-[var(--text-muted)] font-bold text-[16px] leading-[1.6]" />
                 <TypingText text={strategy.p2} className="text-[var(--text-muted)] font-bold text-[16px] leading-[1.6]" />
                 <TypingText text={langData.quiz_helps_footer} className="text-[var(--text-muted)] font-bold text-[16px] leading-[1.6]" />
              </div>
            </div>
          </motion.div>
        );

      case 22: // NOVO: Ótimo, você já tem uma base!
        const getFinalText = () => {
          if (formData.objective === 'perder') return langData.quiz_goal_text_lose;
          if (formData.objective === 'ganhar') return langData.quiz_goal_text_gain;
          return langData.quiz_goal_text_maintain;
        };

        return (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-center mt-12 px-8 h-full"
          >
            <div className="flex flex-col items-center w-full max-w-sm">
              <h2 className="text-[28px] font-black text-white mb-10 leading-tight tracking-tight">
                {langData.quiz_step_base_title}
              </h2>
              
              <div className="space-y-12 w-full">
                 <TypingText text={langData.quiz_base_p1} className="text-[var(--text-muted)] font-bold text-[16px] leading-[1.6]" />
                 <TypingText text={langData.quiz_base_p2.replace('{goal}', getFinalText())} className="text-[var(--text-muted)] font-bold text-[16px] leading-[1.6]" />
              </div>
            </div>
          </motion.div>
        );

      case 21: // NOVO: Nível de Atividade Física (Compacto e Profissional)
        const activityOptions = [
          { id: 'sedentary', label: langData.quiz_activity_sedentary, desc: langData.quiz_activity_sedentary_desc },
          { id: 'light', label: langData.quiz_activity_light, desc: langData.quiz_activity_light_desc },
          { id: 'moderate', label: langData.quiz_activity_moderate, desc: langData.quiz_activity_moderate_desc },
          { id: 'very_active', label: langData.quiz_activity_very, desc: langData.quiz_activity_very_desc },
          { id: 'extra_active', label: langData.quiz_activity_extra, desc: langData.quiz_activity_extra_desc }
        ];

        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center justify-start text-center mt-8 px-6 h-full w-full"
          >
            <div className="flex flex-col items-center w-full max-w-sm">
              <h2 className="text-[28px] font-black text-white mb-2 leading-tight tracking-tight px-4">
                {langData.quiz_step_activity_title}
              </h2>
              <p className="text-gray-400 font-bold text-[14px] mb-8">
                {langData.quiz_activity_subtitle}
              </p>

              <div className="w-full space-y-3">
                {activityOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { updateField('activity_level', opt.id); setTimeout(() => nextStep(), 300); }}
                    className={`w-full p-4 rounded-[22px] text-left transition-all border-2 ${
                      formData.activity_level === opt.id 
                      ? 'bg-[#22C55E]/10 border-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.2)] scale-[1.01]' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-[16px] font-black ${formData.activity_level === opt.id ? 'text-white' : 'text-gray-200'}`}>
                        {opt.label}
                      </span>
                      <span className="text-[12px] font-bold text-gray-500">{opt.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );


      case 23: // NOVO: Depoimento Lucas (Screenshot - Passo 23) - Versão Compacta
        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-start text-center mt-4 px-6 h-full w-full overflow-hidden"
          >
            <div className="flex flex-col items-center w-full max-w-sm">
              <h2 className="text-[24px] font-black text-white mb-0.5 leading-tight tracking-tight">
                {formData.objective === 'ganhar' ? "Faça como o Emanuel" : "Faça como a Dona Fátima"}
              </h2>
              <p className="text-gray-400 font-bold text-[13px] mb-5">
                {langData.quiz_social_subtitle}
              </p>
              
              {/* Image Section */}
              <div className="relative w-full rounded-[32px] overflow-hidden bg-white/5 aspect-[1.2/1] mb-5 shadow-sm">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center">
                    <img 
                      src={formData.objective === 'ganhar' ? "/assets/testimonials/emanuel.jpg" : "/assets/testimonials/dona%20fatima.jpg"} 
                      alt="Success story" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = formData.objective === 'ganhar' 
                          ? "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=800"
                          : "https://images.unsplash.com/photo-1594882645126-14020914d58d?auto=format&fit=crop&q=80&w=800";
                      }}
                    />
                 </div>
                 
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-[var(--bg-app)] rounded-full flex items-center justify-center shadow-lg z-10">
                    <ChevronLeft className="w-4 h-4 text-white rotate-180" />
                 </div>

                 <div className="absolute bottom-4 left-4 bg-[var(--bg-app)] px-3 py-1 rounded-lg z-20">
                    <span className="text-[10px] font-black text-white tracking-wider uppercase">{langData.quiz_social_before}</span>
                 </div>
                 <div className="absolute bottom-4 right-4 bg-[#523EDC] px-3 py-1 rounded-lg shadow-lg z-20">
                    <span className="text-[10px] font-black text-white tracking-wider uppercase">{langData.quiz_social_after}</span>
                 </div>
              </div>

              <div className="flex items-center justify-between w-full px-6 mb-6">
                 <div className="flex flex-col items-center flex-1">
                    <span className="text-[22px] font-black text-white leading-none mb-1">
                      {formData.objective === 'ganhar' ? "+12kg" : "-22kg"}
                    </span>
                    <span className="text-[9px] font-black text-gray-400 font-medium uppercase tracking-widest leading-none">{langData.quiz_social_change}</span>
                 </div>

                 <div className="w-[1px] h-8 bg-white/10 mx-4" />

                 <div className="flex flex-col items-center flex-1">
                    <span className="text-[22px] font-black text-white leading-none mb-1">
                      {formData.objective === 'ganhar' ? "6" : "4"}
                    </span>
                    <span className="text-[9px] font-black text-gray-400 font-medium uppercase tracking-widest leading-none">{langData.quiz_social_duration}</span>
                 </div>
              </div>

              {/* Quote Card */}
              <div className="bg-white/5 p-5 rounded-[24px] w-full text-left border border-white/5 backdrop-blur-sm shadow-xl">
                 <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-[#0F172A] rounded-full shadow-sm mt-1 border border-white/5">
                       <ChevronLeft className="w-4 h-4 text-[#22C55E] -rotate-90" />
                    </div>
                    <p className="text-gray-100 italic font-bold text-[14.5px] leading-relaxed">
                       {formData.objective === 'ganhar' ? langData.quiz_emanuel_quote : langData.quiz_fatima_quote}
                    </p>
                 </div>
                 <div className="pl-12">
                    <span className="text-gray-400 font-black text-[12px] opacity-80">
                       — {formData.objective === 'ganhar' ? langData.quiz_emanuel_user : langData.quiz_fatima_user}
                    </span>
                 </div>
              </div>
            </div>
          </motion.div>
        );

      case 24: // NOVO: Histórias de Sucesso (Screenshot - Passo 24)
        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-start text-center mt-2 px-6 h-full w-full overflow-hidden"
          >
            <div className="flex flex-col items-center w-full max-w-sm">
              <h2 className="text-[26px] font-black text-white mb-2 leading-tight tracking-tight">
                {langData.quiz_step_success_title}
              </h2>
              
              {/* Stars Header */}
              <div className="flex gap-1 mb-2">
                 {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 text-[#FFC107] fill-[#FFC107]" />)}
              </div>
              <p className="text-white font-bold text-[14px] mb-6">
                {langData.quiz_success_subtitle}
              </p>

              {/* Avatars Section */}
              <div className="flex flex-col items-center mb-8">
                 <div className="flex -space-x-3 mb-4">
                    {[
                      "https://i.pravatar.cc/150?u=1",
                      "https://i.pravatar.cc/150?u=2",
                      "https://i.pravatar.cc/150?u=3"
                    ].map((url, i) => (
                      <div key={i} className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-sm">
                         <img src={url} alt="User avatar" className="w-full h-full object-cover" />
                      </div>
                    ))}
                 </div>
                 <span className="text-[15px] font-black text-white">{langData.quiz_success_users}</span>
              </div>

              {/* Success Card */}
              <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 shadow-2xl mb-6 text-left w-full">
                 <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-[#FFC107] fill-[#FFC107]" />)}
                 </div>
                 <h4 className="text-white font-black text-[15px] mb-2 leading-tight">{langData.quiz_success_comment_title}</h4>
                 <p className="text-gray-400 font-bold text-[12.5px] leading-relaxed">
                    {langData.quiz_success_comment_text}
                 </p>
              </div>

              {/* Reassurance Block */}
              <div className="bg-gradient-to-br from-[#22C55E]/10 to-transparent border border-[#22C55E]/20 rounded-[32px] p-6 w-full flex flex-col items-center">
                 <div className="w-14 h-14 bg-[#22C55E] rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                    <Star className="w-7 h-7 text-white fill-white" />
                 </div>
                 <h3 className="text-white font-black text-[18px] mb-1 leading-tight tracking-tight">
                    {langData.quiz_success_footer_title}
                 </h3>
                 <p className="text-gray-400 font-bold text-[12.5px] leading-tight px-4 opacity-80">
                    {langData.quiz_success_footer_text}
                 </p>
              </div>
            </div>
          </motion.div>
        );

      case 25: { // NOVO: Proposta de Valor / Scanner Teaser (Design Image 2)
        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center text-center px-6 pt-5 pb-2 h-full w-full bg-[var(--bg-app)] transition-colors overflow-hidden"
          >
            <div className="flex flex-col items-center w-full max-w-sm">
              <h2 className="text-[26px] font-black text-white mb-6 leading-tight tracking-tight px-2 text-center uppercase">
                {langData.quiz_step_evolution_promo_title}
              </h2>
              
              {/* Image Container with Scanning UI */}
              <div className="relative w-full aspect-[4/5] rounded-[40px] overflow-hidden shadow-2xl mb-8 border-[6px] border-white/5 ring-1 ring-white/10">
                <img 
                  src="/fitness_meal_scanner.png" 
                  alt="Meal Scanner" 
                  className="w-full h-full object-cover"
                />
                
                {/* Scanning Corner Brackets */}
                <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-lg shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-lg shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                <div className="absolute bottom-1/3 left-8 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-lg shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                <div className="absolute bottom-1/3 right-8 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-lg shadow-[0_0_15px_rgba(255,255,255,0.5)]" />

                {/* Animated Scanning Line */}
                <motion.div 
                  initial={{ top: "10%" }}
                  animate={{ top: "60%" }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-[2.55px] bg-sky-400 shadow-[0_0_20px_#38bdf8] z-10"
                />

                {/* Quick Action Buttons Overlay - REDUZIDO E LIMPO */}
                <div className="absolute bottom-10 left-0 right-0 px-8 flex gap-4 justify-center">
                  <div className="bg-[var(--bg-app)]/95 backdrop-blur-md rounded-[22px] px-4 py-3 flex flex-col items-center flex-1 shadow-lg border border-white/50">
                    <Scan className="w-5 h-5 text-gray-500 mb-1" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{langData.quiz_evolution_scan}</span>
                  </div>
                  <div className="bg-[var(--bg-app)]/95 backdrop-blur-md rounded-[22px] px-4 py-3 flex flex-col items-center flex-1 shadow-lg border border-white/50">
                    <ImageIcon className="w-5 h-5 text-gray-500 mb-1" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{langData.quiz_evolution_gallery}</span>
                  </div>
                </div>

                {/* Bottom Center Indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white/50 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--bg-app)]" />
                </div>
              </div>

              {/* Trust Footer */}
              <div className="flex items-center gap-2 mb-4 opacity-70">
                <ShieldCheck className="w-5 h-5 text-white" />
                <span className="text-[14px] font-black text-white">{langData.quiz_evolution_no_payment}</span>
              </div>
            </div>
          </motion.div>
        );
      }

      case 26: {
        const handleEnableNotifications = async () => {
          try {
            await notificationService.subscribeFromUserGesture(false);
          } catch (err) {
            console.error('Erro ao solicitar permissão:', err);
          } finally {
            nextStep();
          }
        };

        const notifPreviews = [
          { emoji: '📊', text: langData.quiz_notif_report },
          { emoji: '🍽️', text: langData.quiz_notif_lunch },
          { emoji: '🔥', text: langData.quiz_notif_streak },
          { emoji: '💧', text: langData.quiz_notif_water },
        ];

        return (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center text-center px-5 pt-3 pb-4 h-full w-full"
          >
            <div className="flex flex-col items-center w-full max-w-sm mx-auto">
              <h2 className="text-[24px] font-black text-white mb-1.5 leading-tight tracking-tight">
                {langData.quiz_step_notif_title}
              </h2>
              <p className="text-gray-500 font-bold text-[12px] mb-3 px-2 leading-relaxed">
                {langData.quiz_notif_subtitle}
              </p>

              {/* Ícone Sino */}
              <div className="w-14 h-14 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                <Bell className="w-7 h-7 text-[#22C55E]" />
              </div>

              {/* Stat */}
              <p className="text-[#22C55E] font-black text-[12.5px] mb-4 px-4 leading-snug drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                {langData.quiz_notif_stat}
              </p>

              {/* Prévia das Notificações */}
              <div className="w-full space-y-2">
                {notifPreviews.map((notif, i) => (
                  <div key={i} className="bg-white/5 border border-white/5 rounded-2xl px-3 py-2 text-left shadow-sm flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#22C55E] rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                      <span className="text-[8px] font-black text-white tracking-tight">PRO</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">PROFIT</span>
                        <span className="text-[9px] font-bold text-gray-500">{langData.quiz_notif_now}</span>
                      </div>
                      <p className="text-[11px] font-bold text-gray-100 leading-snug">{notif.emoji} {notif.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      }

      case 28: {
        const sources = [
          {
            id: 'instagram',
            label: 'Instagram',
            icon: (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </div>
            )
          },
          {
            id: 'facebook',
            label: 'Facebook',
            icon: (
              <div className="w-9 h-9 rounded-xl bg-[#1877F2] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
            )
          },
          {
            id: 'tiktok',
            label: 'TikTok',
            icon: (
              <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
              </div>
            )
          },
          {
            id: 'youtube',
            label: 'YouTube',
            icon: (
              <div className="w-9 h-9 rounded-xl bg-[#FF0000] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
              </div>
            )
          },
          {
            id: 'google',
            label: 'Google',
            icon: (
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-app)] border border-white/10 flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              </div>
            )
          },
          {
            id: 'outro',
            label: langData.quiz_referral_other,
            icon: (
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-gray-400 font-black text-lg">?</span>
              </div>
            )
          },
        ];

        return (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center text-center px-5 pt-6 h-full w-full"
          >
            <div className="flex flex-col items-start w-full max-w-sm">
              <h2 className="text-[26px] font-black text-white mb-2 leading-tight tracking-tight text-left">
                {langData.quiz_step_referral_source_title}
              </h2>
              <p className="text-gray-500 font-bold text-[13px] mb-6 leading-relaxed text-left">
                {langData.quiz_referral_source_subtitle}
              </p>

              <div className="w-full space-y-3">
                {sources.map(source => {
                  const isSelected = formData.referral_source === source.id;
                  return (
                    <button
                      key={source.id}
                      onClick={() => { updateField('referral_source', source.id); setTimeout(() => nextStep(), 300); }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-[20px] transition-all text-left border ${
                        isSelected ? 'bg-[#22C55E]/10 border-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-white/[0.03] border-white/5 hover:bg-white/5'
                      }`}
                    >
                      {source.icon}
                      <span className={`text-[16px] font-black ${
                        isSelected ? 'text-white' : 'text-gray-400'
                      }`}>{source.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );
      }

      case 29: {
        return (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center text-center px-6 pt-32 h-full w-full bg-[var(--bg-app)]"
          >
            <div className="flex flex-col items-start w-full max-w-sm">
              <h2 className="text-[30px] font-black text-white mb-2 leading-tight tracking-tight w-full text-center">
                {langData.quiz_step_name_title}
              </h2>
              <p className="text-gray-500 font-medium text-[14px] mb-10 w-full text-center">
                {langData.quiz_name_subtitle}
              </p>

              <label className="text-[12px] font-black text-gray-400 mb-2 ml-1 uppercase tracking-[2px]">
                {langData.quiz_name_label}
              </label>
              <input
                type="text"
                placeholder={langData.quiz_name_placeholder}
                value={formData.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full bg-white/5 rounded-[16px] px-5 py-4 text-[16px] font-bold text-white placeholder-gray-500 outline-none border border-white/10 focus:border-white/20 transition-all shadow-sm"
                autoFocus
              />
            </div>
          </motion.div>
        );
      }

      case 30: {
        return (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center text-center px-6 pt-16 h-full w-full bg-[var(--bg-app)] transition-colors"
          >
            <div className="flex flex-col items-start w-full max-w-sm">
              <h2 className="text-[30px] font-black text-white mb-2 leading-tight tracking-tight w-full text-center">
                {langData.quiz_step_email_title}
              </h2>
              <p className="text-gray-500 font-medium text-[14px] mb-8 w-full text-center">
                {langData.quiz_email_subtitle}
              </p>

              <label className="text-[12px] font-black text-gray-400 mb-2 ml-1 uppercase tracking-[2px]">
                {langData.quiz_email_label}
              </label>
              <input
                type="email"
                placeholder={langData.quiz_email_placeholder}
                value={formData.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full bg-white/5 rounded-[16px] px-5 py-4 text-[16px] font-bold text-white placeholder-gray-500 outline-none border border-white/10 focus:border-white/20 transition-all shadow-sm"
                autoFocus
              />
            </div>
          </motion.div>
        );
      }

      case 31: {
        return (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center text-center px-6 pt-32 h-full w-full bg-[var(--bg-app)] transition-colors"
          >
            <div className="flex flex-col items-start w-full max-w-sm">
              <h2 className="text-[30px] font-black text-white mb-2 leading-tight tracking-tight w-full text-center">
                {langData.quiz_step_phone_title}
              </h2>
              <p className="text-gray-500 font-medium text-[14px] mb-10 w-full text-center">
                {langData.quiz_phone_subtitle}
              </p>

              <label className="text-[12px] font-black text-gray-400 mb-2 ml-1 uppercase tracking-[2px]">
                {langData.quiz_phone_label}
              </label>
              
              <div className="w-full relative" ref={countryDropdownRef}>
                <div className="w-full flex items-center bg-white/5 rounded-[20px] px-5 py-1.5 group focus-within:border-white/20 border border-white/10 transition-all shadow-sm">
                  <button 
                    type="button"
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                    className="flex items-center gap-2 pr-4 border-r border-white/10 mr-4 hover:opacity-70 transition-opacity min-w-[95px]"
                  >
                    <img 
                      src={selectedCountry.flag} 
                      alt={selectedCountry.code} 
                      className="w-6 h-auto rounded-sm shadow-sm"
                    />
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                    <span className="text-[16px] font-black text-white">{selectedCountry.prefix}</span>
                  </button>
                  <input
                    type="tel"
                    placeholder={langData.quiz_phone_placeholder}
                    value={formData.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full bg-transparent py-4 text-[16px] font-bold text-white placeholder-gray-500 outline-none"
                    autoFocus
                  />
                </div>

                <AnimatePresence>
                  {isCountryDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.98 }}
                      className="absolute top-full left-0 right-0 mt-3 bg-[var(--bg-app)] rounded-[20px] shadow-2xl border border-white/10 py-2 z-[100] overflow-hidden"
                    >
                      <div className="max-h-[280px] overflow-y-auto px-1 custom-scrollbar">
                        {COUNTRIES.map((c) => (
                          <button
                            key={c.code}
                            onClick={() => {
                              setSelectedCountry(c);
                              setIsCountryDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-[12px] transition-all ${selectedCountry.code === c.code ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'hover:bg-white/5 text-gray-300'}`}
                          >
                            <img src={c.flag} alt={c.name} className="w-6 h-auto rounded-sm shadow-sm" />
                            <span className="text-[15px] font-bold flex-1 text-left">{c.name}</span>
                            <span className={`text-[14px] font-black ${selectedCountry.code === c.code ? 'text-[#22C55E]' : 'text-gray-500'}`}>
                              {c.prefix}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        );
      }

      case 32: {
        return (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center text-center px-6 pt-32 h-full w-full bg-[var(--bg-app)] transition-colors"
          >
            <div className="flex flex-col items-start w-full max-w-sm">
              <h2 className="text-[30px] font-black text-white mb-2 leading-tight tracking-tight w-full text-center">
                {langData.quiz_step_referral_code_title}
              </h2>
              <p className="text-gray-500 font-medium text-[14px] mb-10 w-full text-center">
                {langData.quiz_referral_code_subtitle}
              </p>

              <label className="text-[12px] font-black text-gray-400 mb-2 ml-1 uppercase tracking-[2px]">
                {langData.quiz_referral_code_label}
              </label>
              <input
                type="text"
                placeholder={langData.quiz_referral_code_placeholder}
                value={formData.referral_code || ''}
                onChange={(e) => updateField('referral_code', e.target.value)}
                className="w-full bg-white/5 rounded-[16px] px-5 py-4 text-[16px] font-bold text-white placeholder-gray-500 outline-none border border-white/10 focus:border-white/20 transition-all shadow-sm"
                autoFocus
              />
            </div>
          </motion.div>
        );
      }

      case 27: {
        const checkPoints = [
          { label: langData.quiz_analysis_data, progress: 25 },
          { label: langData.quiz_analysis_health, progress: 50 },
          { label: langData.quiz_analysis_macros, progress: 75 },
          { label: langData.quiz_analysis_review, progress: 95 }
        ];

        return (
          <div className="flex flex-col items-center justify-center px-6 min-h-screen w-full bg-[var(--bg-app)] transition-colors overflow-y-auto no-scrollbar">
            {/* Shake Container */}
            <motion.div 
              animate={{ 
                x: analysisProgress > 0 && analysisProgress < 100 ? [0, -1.5, 1.5, -1, 1, 0] : 0,
                y: analysisProgress > 0 && analysisProgress < 100 ? [0, 1, -1, 0.5, -0.5, 0] : 0
              }}
              transition={{ 
                duration: 0.15, 
                repeat: Infinity,
                ease: "linear"
              }}
              className="flex flex-col items-center w-full max-w-sm"
            >
              {/* Círculo de Progresso Customizado */}
              <div className="relative w-40 h-40 mb-10 shrink-0">
                <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="72"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-white/5"
                    />
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="72"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray="452"
                    animate={{ strokeDashoffset: 452 - (452 * analysisProgress) / 100 }}
                    fill="transparent"
                    strokeLinecap="round"
                    className="text-white"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[34px] font-black text-white">{analysisProgress}%</span>
                </div>
              </div>

              {/* Título com Cursor de Escrita */}
              <div className="mb-8 min-h-[60px] text-center w-full px-4">
                <h3 className="text-[22px] font-black text-white inline-flex items-center justify-center gap-1">
                  {getAnalysisTitle()}
                  <motion.span 
                    animate={{ opacity: [0, 1] }} 
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-[3px] h-7 bg-white"
                  />
                </h3>
              </div>
            </motion.div>

            {/* Checklist Dinâmica */}
            <div className="w-full max-w-sm space-y-4 mb-10 shrink-0">
              {checkPoints.map((cp, idx) => {
                const isCompleted = analysisProgress >= cp.progress;
                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0.3, x: -10 }}
                    animate={{ opacity: isCompleted ? 1 : 0.3, x: 0 }}
                    className="flex items-center gap-4 py-1"
                  >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${isCompleted ? 'bg-green-500 border-green-500' : 'border-white/10'}`}>
                      {isCompleted ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <CheckCircle className="w-4 h-4 text-white stroke-[3px]" />
                        </motion.div>
                      ) : null}
                    </div>
                    <span className={`text-[16px] font-bold transition-all duration-500 ${isCompleted ? 'text-green-600' : 'text-gray-300'}`}>
                      {cp.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Card de Prova Social */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="w-full max-w-sm bg-white/5 rounded-[28px] p-8 border border-white/5 shadow-2zl flex flex-col items-center text-center mb-10 shrink-0"
            >
              <h4 className="text-[22px] font-black text-white mb-1">{langData.quiz_analysis_proof_title}</h4>
              <p className="text-gray-400 font-bold text-[14px] mb-4">{langData.quiz_analysis_proof_subtitle}</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
            </motion.div>

            {/* Fade Fundo para Scroll Profissional */}
            <div className="fixed bottom-32 left-0 right-0 h-20 bg-gradient-to-t from-[var(--bg-app)] to-transparent pointer-events-none z-10" />
          </div>
        );
      }
      
      case 34: {
        // --- CÁLCULOS DINÂMICOS ---
        const weight = Number(formData.current_weight) || 70;
        const targetWeight = Number(formData.target_weight) || weight;
        const height = Number(formData.height) || 170;
        const age = Number(formData.age) || 30;
        const gender = formData.gender || 'male';
        
        // TDEE Multipliers
        const activityMultipliers: Record<string, number> = {
          sedentary: 1.2,
          light: 1.375,
          moderate: 1.55,
          very: 1.725,
          extra: 1.9
        };
        const multiplier = activityMultipliers[formData.activity_level] || 1.2;
        
        let bmr = 0;
        if (gender === 'male') {
          bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else {
          bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        }
        
        const tdee = bmr * multiplier;
        let calories = Math.round(tdee);
        
        if (formData.objective === 'perder') calories -= 500;
        else if (formData.objective === 'ganhar') calories += 500;
        
        // Macros
        const protein = Math.round(weight * 2);
        const fat = Math.round(weight * 0.9);
        const carbs = Math.round((calories - (protein * 4 + fat * 9)) / 4);
        
        // Data da Meta (+21 dias)
        const goalDate = new Date();
        goalDate.setDate(goalDate.getDate() + 21);
        const dateStr = goalDate.toLocaleDateString(language === 'PT' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const weightDiff = Math.abs(weight - targetWeight);
        const weightAction = formData.objective === 'perder' ? langData.quiz_results_lose : (formData.objective === 'ganhar' ? langData.quiz_results_gain : langData.quiz_results_maintain_goal);

        const benefits = [
          { icon: <Zap size={22} />, title: langData.quiz_results_benefit_1 },
          { icon: <Utensils size={22} />, title: langData.quiz_results_benefit_2 },
          { icon: <Sun size={22} />, title: langData.quiz_results_benefit_3 },
          { icon: <BarChart2 size={22} />, title: langData.quiz_results_benefit_4 },
        ];

        return (
          <div className="flex flex-col items-center w-full px-5 pt-8 pb-32 bg-[var(--bg-app)] overflow-y-auto max-h-screen no-scrollbar relative animate-in fade-in duration-700">
             
             {/* Icon Check Animado */}
             <motion.div 
               initial={{ scale: 0, rotate: -45 }}
               animate={{ scale: 1, rotate: 0 }}
               className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg"
             >
                <CheckCircle className="text-black w-9 h-9 stroke-[3px]" />
             </motion.div>

             {/* Títulos Principais */}
             <h2 className="text-[32px] font-black text-white mb-2">{langData.quiz_results_congrats}</h2>
             <p className="text-[17px] font-bold text-gray-400 mb-10 text-center px-4 leading-relaxed tracking-tight">
               {langData.quiz_results_ready}
             </p>

             {/* Card da Meta */}
             <div className="w-full max-w-sm bg-white/5 rounded-[28px] p-6 mb-12 flex flex-col items-center border border-white/10">
                <span className="text-[14px] font-black text-white mb-2 uppercase tracking-tight">{weightAction}</span>
                <div className="bg-white/10 px-6 py-4 rounded-[18px]">
                   <span className="text-[17px] font-bold text-white">
                     {formData.objective === 'manter' ? `${weight} kg` : `${weightDiff.toFixed(1)} ${langData.quiz_results_kg_until} ${dateStr}`}
                   </span>
                </div>
             </div>

             {/* Recomendação Diária */}
             <div className="w-full max-w-sm mb-12">
                <div className="flex flex-col items-start mb-6">
                   <h3 className="text-[20px] font-black text-white">{langData.quiz_results_daily_rec}</h3>
                   <span className="text-[13px] font-bold text-gray-400">{langData.quiz_results_edit_anytime}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   {/* Calorias */}
                   <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 shadow-2xl flex flex-col items-center">
                      <div className="relative w-24 h-24 mb-3">
                         <svg className="w-full h-full -rotate-90">
                           <circle cx="48" cy="48" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                           <motion.circle 
                             cx="48" cy="48" r="42" stroke="#fff" strokeWidth="8" fill="transparent" strokeLinecap="round"
                             initial={{ strokeDasharray: "264", strokeDashoffset: "264" }}
                             animate={{ strokeDashoffset: 264 - (264 * 0.75) }}
                             transition={{ duration: 1.5, ease: "easeOut" }}
                           />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[18px] font-black text-white">{calories}</span>
                         </div>
                      </div>
                      <span className="text-[14px] font-black text-gray-400 uppercase tracking-widest">{langData.quiz_results_calories}</span>
                   </div>

                   {/* Carbo */}
                   <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 shadow-2xl flex flex-col items-center">
                      <div className="relative w-24 h-24 mb-3">
                         <svg className="w-full h-full -rotate-90">
                           <circle cx="48" cy="48" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                           <motion.circle 
                             cx="48" cy="48" r="42" stroke="#E39276" strokeWidth="8" fill="transparent" strokeLinecap="round"
                             initial={{ strokeDasharray: "264", strokeDashoffset: "264" }}
                             animate={{ strokeDashoffset: 264 - (264 * 0.6) }}
                             transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                           />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[18px] font-black text-white">{carbs}g</span>
                         </div>
                      </div>
                      <span className="text-[14px] font-black text-gray-400 uppercase tracking-widest">{langData.quiz_results_carbs}</span>
                   </div>

                   {/* Proteína */}
                   <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 shadow-2xl flex flex-col items-center">
                      <div className="relative w-24 h-24 mb-3">
                         <svg className="w-full h-full -rotate-90">
                           <circle cx="48" cy="48" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                           <motion.circle 
                             cx="48" cy="48" r="42" stroke="#FF5C5C" strokeWidth="8" fill="transparent" strokeLinecap="round"
                             initial={{ strokeDasharray: "264", strokeDashoffset: "264" }}
                             animate={{ strokeDashoffset: 264 - (264 * 0.5) }}
                             transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                           />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[18px] font-black text-white">{protein}g</span>
                         </div>
                      </div>
                      <span className="text-[14px] font-black text-gray-400 uppercase tracking-widest">{langData.quiz_results_protein}</span>
                   </div>

                   {/* Gorduras */}
                   <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 shadow-2xl flex flex-col items-center">
                      <div className="relative w-24 h-24 mb-3">
                         <svg className="w-full h-full -rotate-90">
                           <circle cx="48" cy="48" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                           <motion.circle 
                             cx="48" cy="48" r="42" stroke="#4D96FF" strokeWidth="8" fill="transparent" strokeLinecap="round"
                             initial={{ strokeDasharray: "264", strokeDashoffset: "264" }}
                             animate={{ strokeDashoffset: 264 - (264 * 0.4) }}
                             transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
                           />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[18px] font-black text-white">{fat}g</span>
                         </div>
                      </div>
                      <span className="text-[14px] font-black text-gray-400 uppercase tracking-widest">{langData.quiz_results_fats}</span>
                   </div>
                </div>
             </div>

             {/* Pontuação de Saúde */}
             <div className="w-full max-w-sm bg-white/5 rounded-[28px] p-7 mb-12 border border-white/10">
                <div className="flex justify-between items-center mb-5">
                   <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-white/5 rounded-2xl flex items-center justify-center shadow-sm">
                         <Star className="text-rose-500 fill-rose-500 w-6 h-6" />
                      </div>
                      <span className="text-[18px] font-black text-white">{langData.quiz_results_health_score}</span>
                   </div>
                   <span className="text-[18px] font-black text-white">10/10</span>
                </div>
                <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: "100%" }}
                     transition={{ duration: 2, ease: "easeInOut" }}
                     className="h-full bg-emerald-500"
                   />
                </div>
             </div>

             {/* Lista de Benefícios */}
             <div className="w-full max-w-sm mb-12">
                <h3 className="text-[24px] font-black text-white mb-8 text-center">{langData.quiz_results_how_to_reach}</h3>
                <div className="space-y-4">
                   {benefits.map((benefit, idx) => (
                       <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + (idx * 0.1) }}
                        className="bg-white/5 border border-white/10 rounded-[22px] p-5 shadow-sm flex items-center gap-5"
                      >
                         <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white shrink-0">
                            {benefit.icon}
                         </div>
                         <span className="text-[15.5px] font-bold text-white leading-snug">{benefit.title}</span>
                      </motion.div>
                   ))}
                </div>
             </div>

             {/* Referências Científicas */}
             <div className="w-full max-w-sm mb-10 pb-10">
                <p className="text-[13.5px] font-black text-white mb-6 px-2">{langData.quiz_results_research_title}</p>
                <div className="space-y-4 px-2">
                   {[
                     { label: '• Basal Metabolic Rate (BMR) - Healthline', href: '#' },
                     { label: '• Calorie Counting Made Easy - Harvard Health', href: '#' },
                     { label: '• Metabolic Rate Research - PubMed', href: '#' },
                     { label: '• BMR Estimation Accuracy - Mayo Clinic Proceedings', href: '#' }
                   ].map((link, i) => (
                     <a key={i} href={link.href} className="block text-[14px] font-bold text-sky-500 hover:opacity-70 transition-opacity">
                       {link.label}
                     </a>
                   ))}
                </div>
             </div>

             {/* Botão Fixo/Sticky Footer */}
             <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)] to-transparent pt-10 z-[100]">
                <div className="max-w-sm mx-auto">
                    <button 
                      onClick={() => nextStep()}
                      className="w-full bg-white text-black py-6 rounded-[24px] font-black text-[18px] shadow-2xl shadow-white/10 active:scale-[0.98] transition-all"
                    >
                      {langData.quiz_results_button}
                    </button>
                 </div>
              </div>

           </div>
        );
      }

      case 35: {
        return (
          <div className="flex flex-col h-full overflow-hidden bg-[var(--bg-app)] relative animate-in fade-in duration-700">
            <div className="flex-1 flex flex-col items-center justify-center px-6 pt-2">
               <h2 className="text-[23px] font-black text-white mb-4 text-center leading-tight tracking-tight uppercase px-4 max-w-sm">
                 Comece sua evolução com o <span className="text-orange-400">ProFit</span> agora
               </h2>

               {/* Visor de Câmera Realístico (Formato Smartphone Retangular) */}
               <div className="w-full aspect-[3/4.5] max-h-[440px] bg-white/5 rounded-[44px] relative overflow-hidden flex flex-col items-center justify-end shadow-2xl border-[5px] border-white/5 mb-3">
                  {/* Imagem Premium de Prato Fitness */}
                  <img 
                    src="/meal_scanner.png" 
                    alt="Escaneamento Inteligente"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/5" />
                  
                  {/* Linha de Scanner Animada (Laser) */}
                  <motion.div 
                    initial={{ top: "10%" }}
                    animate={{ top: ["10%", "85%", "10%"] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-[2.5px] bg-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.8)] z-30"
                  />

                  {/* Cantos de Foco Brancos do Mockup (Ajustados para formato vertical) */}
                  <div className="absolute top-10 left-10 w-7 h-7 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <div className="absolute top-10 right-10 w-7 h-7 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <div className="absolute bottom-32 left-10 w-7 h-7 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <div className="absolute bottom-32 right-10 w-7 h-7 border-b-4 border-r-4 border-white rounded-br-lg" />

                  {/* Botões do Visor Compactos */}
                  <div className="absolute bottom-20 left-0 right-0 px-10 flex gap-3 z-20">
                     <button className="flex-1 bg-[var(--bg-app)]/95 backdrop-blur-sm p-3.5 rounded-2xl flex flex-col items-center gap-1.5 active:scale-95 transition-all shadow-md">
                        <Scan className="w-4 h-4 text-gray-400" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Escanear Refeição</span>
                     </button>
                     <button className="flex-1 bg-[var(--bg-app)]/95 backdrop-blur-sm p-3.5 rounded-2xl flex flex-col items-center gap-1.5 active:scale-95 transition-all shadow-md">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Galeria</span>
                     </button>
                  </div>

                  {/* Botão Obturador Compacto */}
                  <div className="mb-7 z-20 cursor-pointer active:scale-90 transition-transform">
                     <div className="w-13 h-13 rounded-full border-4 border-white/60 flex items-center justify-center p-1">
                        <div className="w-full h-full bg-[var(--bg-app)] rounded-full shadow-lg" />
                     </div>
                  </div>
               </div>
            </div>
          </div>
        );
      }

      case 36: {
        const today = new Date();
        const trialEndDate = new Date();
        trialEndDate.setDate(today.getDate() + 3); // 3 dias de teste grátis
        const dateStr = trialEndDate.toLocaleDateString(language === 'PT' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });

        return (
          <div className="flex flex-col h-full overflow-hidden bg-[var(--bg-app)] relative animate-in fade-in duration-700">
            <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8">
                {/* Título Emocional Compacto - FORÇANDO PROMO SE ATIVA */}
                <h2 className="text-[28px] font-black text-white mb-6 text-center tracking-tight leading-tight uppercase px-4">
                  {isFreePromoActive ? (
                    <>Teste o ProFit <span className="text-[#22C55E] animate-pulse">Inteiramente Grátis</span></>
                  ) : (
                    <>Sua Jornada <span className="text-[#22C55E]">Premium</span> começa agora</>
                  )}
                </h2>

               {/* Linha do Tempo Vertical Ultra-Compacta */}
               <div className="w-full max-w-[280px] mb-8 relative pl-10">
                  {/* Linha vertical decorativa */}
                  <div className="absolute left-[16px] top-4 bottom-4 w-[3.5px] bg-[#22C55E]/10 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ height: 0 }}
                       animate={{ height: "100%" }}
                       transition={{ duration: 1.5, ease: "easeInOut" }}
                       className="w-full bg-[#22C55E]"
                     />
                  </div>

                  {/* Itens da Linha do Tempo */}
                  <div className="space-y-6">
                     {/* Hoje */}
                     <div className="relative">
                        <div className="absolute -left-[40px] top-0 w-8 h-8 bg-[#22C55E] rounded-lg flex items-center justify-center shadow-md border-2 border-white z-10">
                           <Lock className="w-4 h-4 text-white" />
                        </div>
                        <div>
                           <p className="text-[14px] font-black text-white mb-0">{langData.quiz_timeline_today_title}</p>
                           <p className="text-[12px] font-bold text-gray-400 leading-tight">{langData.quiz_timeline_today_sub}</p>
                        </div>
                     </div>

                     {/* Lembrete */}
                     <div className="relative">
                        <div className="absolute -left-[40px] top-0 w-8 h-8 bg-[#22C55E] rounded-lg flex items-center justify-center shadow-md border-2 border-white z-10">
                           <Bell className="w-4 h-4 text-white" />
                        </div>
                        <div>
                           <p className="text-[14px] font-black text-white mb-0">{langData.quiz_timeline_reminder_title}</p>
                           <p className="text-[12px] font-bold text-gray-400 leading-tight">{langData.quiz_timeline_reminder_sub}</p>
                        </div>
                     </div>

                     {/* Cobrança */}
                     <div className="relative">
                        <div className="absolute -left-[40px] top-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md border-2 border-white z-10">
                           <Crown className="w-4 h-4 text-black" />
                        </div>
                        <div>
                           <p className="text-[14px] font-black text-white mb-0">{langData.quiz_timeline_charge_title}</p>
                           <p className="text-[12px] font-bold text-gray-400 leading-tight opacity-70">
                             {isFreePromoActive ? (language === 'PT' ? 'Acesso Vitalício' : 'Lifetime Access') : langData.quiz_timeline_charge_sub.replace('{date}', dateStr)}
                           </p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Seletor de Planos Premium Lado a Lado */}
               <div className="w-full flex flex-col items-center mb-6">
                  <div className="w-full flex gap-3 mb-6">
                    {/* Plano Anual - Destaque Premium */}
                    <div 
                      onClick={() => setSelectedPlan('anual')}
                      className={`flex-1 ${selectedPlan === 'anual' ? 'bg-white/10 border-[#22C55E] shadow-lg shadow-[#22C55E]/10' : 'bg-white/5 border-white/5 shadow-sm'} border-2 rounded-[24px] p-5 relative flex flex-col justify-center text-center cursor-pointer active:scale-95 transition-all min-h-[145px]`}
                    >
                       <span className={`text-[9px] font-black ${selectedPlan === 'anual' ? 'text-[#22C55E]' : 'text-gray-400'} uppercase tracking-widest mb-1 leading-none`}>ANUAL</span>
                       <div className="flex flex-col items-center">
                         <span className={`text-[22px] font-black text-white leading-none mb-1 ${isFreePromoActive ? 'line-through opacity-60 decoration-red-500 decoration-[4px]' : ''}`}>
                           2.490 <span className="text-[12px]">MT</span>
                         </span>
                         {isFreePromoActive && (
                           <motion.span 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: [0.8, 1.1, 0.8] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-[26px] font-black text-emerald-500 leading-none mt-1"
                           >GRÁTIS</motion.span>
                         )}
                       </div>
                       <span className="text-[10px] font-black text-gray-400 uppercase leading-none opacity-60">por ano</span>
                       <div className="mt-2">
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded-full inline-block">SALVE 30%</span>
                       </div>
                    </div>

                    {/* Plano Mensal */}
                    <div 
                      onClick={() => setSelectedPlan('mensal')}
                      className={`flex-1 ${selectedPlan === 'mensal' ? 'bg-white/10 border-[#22C55E] shadow-lg shadow-[#22C55E]/10' : 'bg-white/5 border-white/5 shadow-sm'} border-2 rounded-[24px] p-5 relative flex flex-col justify-center text-center cursor-pointer active:scale-95 transition-all min-h-[145px]`}
                    >
                       <span className={`text-[9px] font-black ${selectedPlan === 'mensal' ? 'text-[#22C55E]' : 'text-gray-400'} uppercase tracking-widest mb-1 leading-none`}>MENSAL</span>
                       <div className="flex flex-col items-center">
                         <span className={`text-[22px] font-black text-white leading-none mb-1 ${isFreePromoActive ? 'line-through opacity-60 decoration-red-500 decoration-[4px]' : ''}`}>
                           299 <span className="text-[12px]">MT</span>
                         </span>
                         {isFreePromoActive && (
                            <motion.span 
                              initial={{ scale: 0.8 }}
                              animate={{ scale: [0.8, 1.1, 0.8] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="text-[26px] font-black text-emerald-500 leading-none mt-1"
                            >GRÁTIS</motion.span>
                         )}
                       </div>
                       <span className="text-[10px] font-black text-gray-400 uppercase leading-none opacity-60">por mês</span>
                       <div className="absolute top-3 right-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedPlan === 'mensal' ? 'border-[#22C55E] bg-[#22C55E]' : 'border-white/20'}`}>
                             {selectedPlan === 'mensal' && <CheckCircle className="w-3 h-3 text-white" strokeWidth={4} />}
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  {/* Trust Info Inline for Step 36 refinement */}
                  <p className="text-[13px] font-black text-white mb-3 leading-tight uppercase text-center w-full">NÃO PERCA A OPORTUNIDADE DE MUDAR SEU CORPO!</p>
                  <div className="flex items-center justify-center gap-2 opacity-80">
                     <ShieldCheck className="w-4 h-4 text-white" />
                     <span className="text-[13px] font-black text-white tracking-tight">Cancele quando quiser!</span>
                  </div>
               </div>
            </div>
          </div>
        );
      }


      case 33: {
        return (
          <div className="flex flex-col px-6 pt-10">
            <div className="bg-white/5 rounded-[32px] p-8 mb-8 border border-white/10 shadow-sm">
               <h2 className="text-[28px] font-black text-white mb-4 leading-tight">{langData.quiz_step_final_title}</h2>
               <p className="text-[#22C55E] font-bold mb-6 italic">
                 {langData.quiz_final_subtitle.replace('{feeling}', langData[`quiz_feeling_${formData.weight_feeling}`] || formData.weight_feeling || (language === 'PT' ? 'objetivo' : 'goal'))}
               </p>
               <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl shadow-sm border border-white/5">
                    <div className="w-12 h-12 bg-[#22C55E] rounded-xl flex items-center justify-center text-white font-bold text-xl">✓</div>
                    <div>
                      <p className="font-black text-white">{langData.quiz_final_macros_title}</p>
                      <p className="text-sm text-gray-400">{langData.quiz_final_macros_desc}</p>
                    </div>
                  </div>
               </div>
            </div>
            <button 
              onClick={handleRegistration}
              disabled={isRegistering}
              className="w-full bg-white text-black py-6 rounded-[22px] font-black text-[18px] shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isRegistering ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : null}
              {langData.quiz_final_button}
            </button>
          </div>
        );
      }

      default:
        return (
          <div className="flex flex-col items-center text-center mt-20">
             <h3 className="text-gray-300 text-sm font-black uppercase mb-2">{(language === 'PT' ? 'Etapa' : 'Step')} {step}</h3>
             <h2 className="text-xl font-bold text-gray-400 italic">{(language === 'PT' ? 'Em construção...' : 'Under construction...')}</h2>
             <button onClick={() => nextStep()} className="mt-8 px-8 py-3 bg-white/10 rounded-full font-bold text-white">{langData.continue}</button>
          </div>
        );
    }
  };

  useEffect(() => {
    if (step === 27 && analysisProgress < 100) {
      const timer = setInterval(() => {
        setAnalysisProgress(p => {
          if (p >= 100) { clearInterval(timer); return 100; }
          return p + 1;
        });
      }, 100);
      return () => clearInterval(timer);
    }
  }, [step, analysisProgress]);

  useEffect(() => {
    if (step === 27 && analysisProgress === 100) {
      const timer = setTimeout(() => nextStep(), 800);
      return () => clearTimeout(timer);
    }
  }, [step, analysisProgress]);

  return (
    <div className="w-full w-screen min-h-screen bg-[var(--bg-app)] font-sans text-white flex flex-col items-center overflow-x-hidden relative">
      <div className="w-full max-w-sm flex flex-col min-h-screen relative">
        
        {/* Header ProFit */}
        <div className="px-4 pt-12 pb-2 relative flex items-center justify-between z-50">
           <button onClick={prevStep} className="p-2 transition-opacity active:opacity-50">
              <ChevronLeft className="w-7 h-7 text-white" />
           </button>
           
           <div className="flex-1" />
        </div>

        {/* Barra de Progresso Orange */}
        <div className="w-full px-4 mt-2">
           <div className="h-[6px] w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[#22C55E]"
                animate={{ width: `${(step / totalSteps) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
           </div>
        </div>

        {/* Conteúdo Central */}
        <div className={`flex-1 flex flex-col ${step === 26 ? 'pb-44' : 'pb-32'}`}>
           <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="w-full flex-grow"
              >
                 {renderContent()}
              </motion.div>
           </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)]/95 to-transparent z-[100] pb-10 pt-10 px-6">
          <div className="w-full max-w-sm">
            {/* Mensagem de Feedback Suave */}
            <AnimatePresence>
              {shakeButton && !isCurrentStepValid() && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="w-full text-center mb-4"
                >
                  <span className="text-[14px] font-black text-rose-500 bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20 italic shadow-sm">
                    {language === 'PT' ? 'Por favor, selecione uma opção para continuar' : 'Please select an option to continue'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {step === 35 && (
              <div className="flex items-center justify-center gap-2 mb-4 opacity-90 scale-90 translate-y-2">
                <ShieldCheck className="w-5 h-5 text-white" />
                <span className="text-[14px] font-black text-white tracking-tight">Sem pagamentos feitos agora</span>
              </div>
            )}

            {step === 26 ? (
              <>
                <button
                  onClick={handleEnableNotifications}
                  className="w-full py-5 rounded-[22px] bg-white text-black font-black text-[17px] shadow-sm transition-all active:scale-[0.98] mb-3"
                >
                  {langData.quiz_notif_allow}
                </button>
                <button
                  onClick={() => nextStep()}
                  className="w-full text-white font-black text-[15px] py-1 text-center"
                >
                  {langData.quiz_notif_later}
                </button>
              </>
            ) : step === 33 ? null : (
              <motion.button
                animate={shakeButton ? { x: [-5, 5, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
                onClick={() => {
                  if (isCurrentStepValid()) {
                    setShakeButton(false);
                    nextStep();
                  } else {
                    setShakeButton(true);
                    setTimeout(() => setShakeButton(false), 800);
                  }
                }}
                className={`w-full py-5 rounded-[22px] font-black text-lg shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
                  isCurrentStepValid()
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white cursor-not-allowed opacity-80'
                }`}
              >
                {step === 32 && !formData.referral_code?.trim() ? langData.skip : langData.continue}
                <ChevronRight className={`w-5 h-5 transition-transform ${isCurrentStepValid() ? 'translate-x-0' : 'translate-x-1 opacity-20'}`} />
              </motion.button>
            )}

            {/* Links Legais Abaixo do Botão (Apenas no Passo 35 de Oferta) */}
            {(step === 35 || step === 36) && (
              <div className="flex items-center justify-center gap-6 mt-6 opacity-40">
                <button className="text-[10px] font-black text-white uppercase tracking-widest hover:text-orange-500 transition-colors">{langData.quiz_privacy}</button>
                <button className="text-[10px] font-black text-white uppercase tracking-widest hover:text-orange-500 transition-colors">{language === 'PT' ? 'Restaurar Compras' : 'Restore Purchases'}</button>
                <button className="text-[10px] font-black text-white uppercase tracking-widest hover:text-orange-500 transition-colors">{langData.quiz_terms}</button>
              </div>
            )}
          </div>
        </div>

        {/* Modal para Login Manual (se necessário) */}
        <ConfirmModal 
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onConfirm={handleManualLogin}
          title={language === 'PT' ? 'Bem-vindo de volta!' : 'Welcome back!'}
          message={
            <div className="flex flex-col gap-4 mt-2">
              <p className="text-sm text-gray-400 font-medium">
                {language === 'PT' 
                  ? 'Este e-mail já possui uma conta ProFit. Insira sua senha para salvar seu plano.'
                  : 'This email already has a ProFit account. Enter your password to save your plan.'
                }
              </p>
              <div className="relative">
                <input 
                  type="password"
                  placeholder={language === 'PT' ? 'Sua senha' : 'Your password'}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[15px] font-bold text-white focus:ring-2 focus:ring-[#22C55E]/20 outline-none transition-all"
                  autoFocus
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
              </div>
              {authError && (
                <p className="text-[12px] text-red-500 font-bold bg-red-50 py-2 px-3 rounded-lg border border-red-100 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  {authError}
                </p>
              )}
            </div>
          }
          confirmText={language === 'PT' ? 'Entrar e Salvar' : 'Login & Save'}
          cancelText={language === 'PT' ? 'Cancelar' : 'Cancel'}
          type="info"
        />
      </div>
    </div>
  );
};

export default Quiz;
