import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  User as UserIcon,
  Timer
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const PENDING_QUIZ_DATA_KEY = 'pending_quiz_data';
const PENDING_QUIZ_STEP_KEY = 'pending_quiz_step';
const QUIZ_LEAD_ID_KEY = 'quiz_lead_id';

const RegisterPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { register, refreshUser } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const email = searchParams.get('email') || '';
  const name = searchParams.get('name') || '';
  const plan = searchParams.get('plan') || 'mensal';

  const readPendingQuizData = (): Record<string, any> => {
    const pendingDataStr = localStorage.getItem(PENDING_QUIZ_DATA_KEY);
    if (!pendingDataStr) return {};

    try {
      const parsedData = JSON.parse(pendingDataStr);
      const safeQuizData: Record<string, any> = { ...(parsedData || {}) };
      delete safeQuizData.password;
      return safeQuizData;
    } catch (e) {
      console.error("Erro ao ler dados pendentes do quiz", e);
      return {};
    }
  };

  const buildProfileUpdatePayload = (quizData: any) => ({
    age: quizData.age || null,
    gender: quizData.gender || null,
    weight: quizData.current_weight ?? quizData.weight ?? null,
    height: quizData.height ?? null,
    primary_objective: quizData.objective ?? quizData.primary_objective ?? null,
    activity_level: quizData.activity_level ?? null,
    target_weight: quizData.target_weight ?? null,
    understands_calories: quizData.understands_calories ?? null,
    blockers: quizData.obstacles ?? quizData.blockers ?? [],
    phone: quizData.phone || null,
    onboarding_completed: true,
  });

  const syncPendingQuizData = async (quizData: any, leadId: string) => {
    await api.quiz.syncLead({
      id: leadId,
      responses: quizData,
      current_step: 36,
      is_completed: true,
    });
  };

  useEffect(() => {
    // Simulando um progresso de "configurando conta"
    const interval = setInterval(() => {
      setProgress(prev => (prev < 90 ? prev + 1 : prev));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    setProgress(90);

    try {
      // Recuperar dados do Quiz salvos antes do checkout
      const quizData = readPendingQuizData();

      // Recuperar ID do Lead para conversão
      let leadId = localStorage.getItem(QUIZ_LEAD_ID_KEY);
      if (!leadId) {
        leadId = crypto.randomUUID();
        localStorage.setItem(QUIZ_LEAD_ID_KEY, leadId);
      }

      // 1. Registrar Usuário no Backend
      const createdUser = await register(
        name,
        email,
        password,
        quizData.referral_code || undefined,
        {
          ...quizData,
          plan: plan,
          subscription_status: 'ativo', // Ja pagou
          onboarding_completed: true,
          leadId: leadId
        }
      );

      if (createdUser) {
        // 2. Sincronizar o quiz agora que o token jÃ¡ existe no contexto
        let quizSyncCompleted = false;
        try {
          await syncPendingQuizData(quizData, leadId);
          quizSyncCompleted = true;
        } catch (syncError) {
          console.warn('Erro ao sincronizar quiz pendente:', syncError);
        }

        await api.user.update(buildProfileUpdatePayload(quizData));
        await refreshUser();

        setProgress(100);
        toast.success(`Bem-vindo ao ProFit, ${name}!`);
        
        // 2. Iniciar Sessão Automaticamente
        
        // 3. Limpar dados temporários
        if (quizSyncCompleted) {
          localStorage.removeItem(PENDING_QUIZ_DATA_KEY);
          localStorage.removeItem(PENDING_QUIZ_STEP_KEY);
          localStorage.removeItem(QUIZ_LEAD_ID_KEY);
        }
        
        // 4. Redirecionar para Home (Dashboard)
        setTimeout(() => {
          navigate('/home');
        }, 1200);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      toast.error(err.message || 'Erro ao criar conta. Tente novamente.');
      setIsLoading(false);
      setProgress(90);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#22C55E]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#22C55E]/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[420px] w-full"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-[#22C55E] to-[#22C55E] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#22C55E]/20 border border-white/10 rotate-3">
            <Zap size={40} className="text-white fill-current" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">Etapa Final</h1>
          <p className="text-gray-400 font-bold text-[15px]">Crie sua senha para acessar seu plano personalizado.</p>
        </div>

        <div className="bg-[var(--bg-card)] rounded-[32px] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Progress Bar Top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#22C55E] to-[#22C55E]"
              animate={{ width: `${progress}%` }}
            />
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {/* User Badge */}
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#22C55E]/20 flex items-center justify-center">
                <UserIcon size={18} className="text-[#22C55E]" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Conta para</p>
                <p className="text-[13px] font-bold text-white truncate">{email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#22C55E] transition-colors">
                  <Lock size={18} />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Crie uma senha"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-white font-bold outline-none focus:border-[#22C55E] transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#22C55E] transition-colors">
                  <CheckCircle2 size={18} />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirme sua senha"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-[#22C55E] transition-all"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full h-16 bg-gradient-to-r from-[#22C55E] to-[#22C55E] text-white rounded-2xl font-black text-[15px] uppercase tracking-widest shadow-xl shadow-[#22C55E]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Criando Conta...</span>
                </>
              ) : (
                <>
                  <span>CONFIRMAR ACESSO</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 opacity-40">
            <ShieldCheck size={14} className="text-[#22C55E]" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">Proteção de dados ProFit</span>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] font-bold text-gray-600 leading-relaxed px-4">
          Ao confirmar, você concorda com nossos <span className="text-gray-400">Termos de Uso</span> e <span className="text-gray-400">Política de Privacidade</span>.
        </p>
      </motion.div>

      {/* Loading Overlay for redirect */}
      <AnimatePresence>
        {progress === 100 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.5, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-24 h-24 bg-[#22C55E] rounded-full flex items-center justify-center mb-8 shadow-[0_0_80px_rgba(34,197,94,0.4)]"
            >
              <CheckCircle2 size={48} className="text-white" />
            </motion.div>
            <h2 className="text-2xl font-black text-white mb-2">Tudo Pronto! 🎉</h2>
            <p className="text-gray-400 font-bold">Levando você para o seu Dashboard...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RegisterPassword;
