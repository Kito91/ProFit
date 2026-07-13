import React, { useEffect, useState } from 'react';
import { 
  User, Bell, Mail, Calendar, Ruler, Weight, Target, 
  ArrowLeft, Edit3, Save, CheckCircle2, X 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { notificationService } from '../services/notificationService';

export const Account = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    height: '',
    weight: '',
    goal: '',
    gender: '',
    daily_calorie_target: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await api.user.getProfile();
      setProfile(data);
      const pushState = await notificationService.getState();
      setNotificationsEnabled(pushState.permission === 'granted' && pushState.subscribed);
      setFormData({
        name: data.name || '',
        email: data.email || '',
        age: data.age || '',
        height: data.height || '',
        weight: data.weight || '',
        goal: data.goal || 'manter',
        gender: data.gender || 'male',
        daily_calorie_target: data.daily_calorie_target || '2000'
      });
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await api.user.uploadProfilePhoto(file);
      setProfile({ ...profile, avatar_url: result.avatar_url });
    } catch (err) {
      console.error("Upload failed", err);
      setError("Falha no upload da foto.");
    }
  };

  const validate = () => {
    if (!formData.name.trim()) return "O nome não pode estar vazio.";
    if (!formData.email.includes('@')) return "Email inválido.";
    if (isNaN(Number(formData.age))) return "Idade deve ser um número.";
    if (isNaN(Number(formData.height))) return "Altura deve ser um número.";
    if (isNaN(Number(formData.weight))) return "Peso deve ser um número.";
    if (formData.gender !== 'male' && formData.gender !== 'female' && formData.gender !== 'other') return "Selecione um gênero válido.";
    return null;
  };

  const handleSave = async () => {
    const errorMsg = validate();
    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await api.user.updateAccount({
        ...formData,
        age: parseInt(formData.age),
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        daily_calorie_target: parseInt(formData.daily_calorie_target)
      });
      setShowSuccess(true);
      setIsEditing(false);
      await fetchProfile();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setError("Erro ao salvar alterações. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotifications = async () => {
    const newValue = !notificationsEnabled;
    try {
      if (newValue) {
        const success = await notificationService.subscribe();
        if (!success) {
          setNotificationsEnabled(false);
          setError("Permissao de notificacao negada ou indisponivel no navegador.");
          return;
        }
      } else {
        const success = await notificationService.unsubscribe();
        if (!success) {
          setError("Não foi possível desativar as notificações neste dispositivo.");
          return;
        }
      }

      const pushState = await notificationService.getState();
      setNotificationsEnabled(pushState.permission === 'granted' && pushState.subscribed);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      setError("Falha ao atualizar configurações de notificação.");
    }
  };

  const ModernInput = ({ label, icon: Icon, value, name, type = "text", disabled = !isEditing }: any) => (
    <div className={`group bg-[var(--bg-container)] rounded-3xl p-5 border-2 transition-all duration-300 shadow-sm ${
      isEditing ? 'border-[var(--border-main)] focus-within:border-[#56AB2F]/30 focus-within:shadow-lg focus-within:shadow-[#56AB2F]/5' : 'border-transparent'
    }`}>
      <div className="flex items-center space-x-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
          isEditing ? 'bg-[var(--bg-app)] text-[#56AB2F]' : 'bg-[var(--bg-app)] text-[var(--text-muted)]'
        }`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] mb-1">{label}</p>
          <input 
            type={type}
            disabled={disabled}
            value={value}
            onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
            className="w-full bg-transparent text-lg font-bold text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-100"
            placeholder={`Digite seu ${label.toLowerCase()}...`}
          />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)]">
        <div className="w-12 h-12 border-4 border-[var(--border-main)] border-t-[#56AB2F] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="main-wrapper bg-[var(--bg-app)]">
      <div className="app-container min-h-screen flex flex-col pb-24">
        {/* Header */}
        <div className="px-6 pt-12 pb-8 flex items-center justify-between sticky top-0 z-40 bg-[var(--bg-app)]/80 backdrop-blur-md">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-[var(--bg-container)] rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all text-[var(--text-main)] border border-[var(--border-main)]"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Conta</h1>
          <div className="w-12" />
        </div>

        <div className="px-6 flex-1">
          {/* Profile Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg-container)] rounded-[40px] p-8 shadow-xl border border-[var(--border-main)] mb-10 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#A8E063]/10 to-transparent rounded-bl-full" />
            
            <div className="flex flex-col items-center relative z-10">
              <div className="relative mb-6">
                <input 
                  type="file" 
                  id="account-photo-upload" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
                <label htmlFor="account-photo-upload" className="cursor-pointer group block">
                  <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-[var(--bg-surface)] p-1 shadow-inner bg-[var(--bg-surface)] relative">
                    {(profile?.avatar_url || profile?.profile_photo) ? (
                      <img 
                        src={(() => {
                          const url = profile?.avatar_url || profile?.profile_photo;
                          if (typeof url !== 'string') return '';
                          return url;
                        })()} 
                        alt="Avatar" 
                        className="w-full h-full object-cover rounded-[35px]" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[var(--bg-surface)] text-[var(--text-muted)]">
                        <User className="w-16 h-16" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[35px]">
                      <Edit3 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </label>
                {!isEditing && (
                  <label 
                    htmlFor="account-photo-upload"
                    className="absolute -right-2 -bottom-2 w-10 h-10 bg-[#56AB2F] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#56AB2F]/40 active:scale-90 transition-all border-4 border-white cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </label>
                )}
              </div>

              <h2 className="text-2xl font-black text-[var(--text-main)] mb-1">{profile?.name || 'Seu Nome'}</h2>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-bold text-[var(--text-muted)] bg-[var(--bg-surface)] px-4 py-1.5 rounded-full">{profile?.email || 'seuemail@exemplo.com'}</p>
                {profile?.subscription_status === 'ativo' ? (
                  <div className="flex flex-col items-start gap-2">
                    <div className="plan-badge-pill">
                      {profile?.is_early_adopter ? 'FREE' : 'PRO'}
                    </div>
                    {profile?.plan_expiration && (
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-[var(--text-muted)] mt-0.5 uppercase tracking-tighter">
                          Válido até: {new Date(profile.plan_expiration).toLocaleDateString('pt-BR')}
                        </span>
                        <button 
                          onClick={() => navigate('/plans')}
                          className="mt-2 text-[#56AB2F] text-[9px] font-black uppercase tracking-widest hover:underline text-left"
                        >
                          Renovar Plano Pro
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                   <button 
                     onClick={() => navigate('/checkout')}
                     className="bg-emerald-50 text-[#56AB2F] text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest active:scale-95 transition-all border border-emerald-100 shadow-sm"
                   >
                     Ativar Plano Pro 🚀
                   </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Success/Error Alerts */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mb-6 bg-green-500 text-white rounded-3xl p-5 flex items-center justify-center space-x-3 shadow-lg shadow-green-500/30"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span className="font-black text-sm uppercase tracking-wider">Perfil atualizado com sucesso!</span>
              </motion.div>
            )}
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mb-6 bg-rose-500 text-white rounded-3xl p-5 flex items-center justify-between shadow-lg shadow-rose-500/30"
              >
                <div className="flex items-center space-x-3">
                  <X className="w-6 h-6" />
                  <span className="font-bold text-sm">{error}</span>
                </div>
                <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notifications Toggle Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg-container)] rounded-3xl p-6 border border-[var(--border-main)] mb-8 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Bell size={24} />
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-[var(--text-main)]">Notificações Inteligentes</h4>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">Lembretes personalizados de refeição e água.</p>
              </div>
            </div>
            
            <button 
              onClick={handleToggleNotifications}
              className={`w-14 h-8 rounded-full relative transition-all duration-300 ${notificationsEnabled ? 'bg-[#56AB2F]' : 'bg-[var(--bg-surface)] border border-[var(--border-main)]'}`}
            >
              <motion.div 
                animate={{ x: notificationsEnabled ? 28 : 4 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
              />
            </button>
          </motion.div>

          {/* Information Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2 ml-2">
              <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Dados Pessoais</h3>
            </div>
            
            <div className="grid gap-4">
              <ModernInput label="Nome" icon={User} value={formData.name} name="name" />
              <ModernInput label="Email" icon={Mail} value={formData.email} name="email" type="email" />
              <div className="grid grid-cols-2 gap-4">
                <ModernInput label="Idade" icon={Calendar} value={formData.age} name="age" type="number" />
                <ModernInput label="Altura" icon={Ruler} value={formData.height} name="height" type="number" />
              </div>
              <ModernInput label="Peso" icon={Weight} value={formData.weight} name="weight" type="number" />
              
              <div className={`group bg-[var(--bg-container)] rounded-3xl p-5 border-2 transition-all duration-300 shadow-sm ${
                isEditing ? 'border-[var(--border-main)]' : 'border-transparent'
              }`}>
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    isEditing ? 'bg-[var(--bg-app)] text-[#56AB2F]' : 'bg-[var(--bg-app)] text-[var(--text-muted)]'
                  }`}>
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em] mb-1">Gênero</p>
                    {isEditing ? (
                      <div className="flex space-x-2 mt-1">
                        <button 
                          onClick={() => setFormData({ ...formData, gender: 'male' })}
                          className={`flex-1 py-1.5 sm:py-2 px-1 sm:px-2 rounded-xl font-bold text-xs sm:text-sm transition-all border-2 ${formData.gender === 'male' ? 'border-[#56AB2F] bg-[#56AB2F]/5 text-[#56AB2F]' : 'border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}
                        >
                          Masculino
                        </button>
                        <button 
                          onClick={() => setFormData({ ...formData, gender: 'female' })}
                          className={`flex-1 py-1.5 sm:py-2 px-1 sm:px-2 rounded-xl font-bold text-xs sm:text-sm transition-all border-2 ${formData.gender === 'female' ? 'border-[#56AB2F] bg-[#56AB2F]/5 text-[#56AB2F]' : 'border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}
                        >
                          Feminino
                        </button>
                        <button 
                          onClick={() => setFormData({ ...formData, gender: 'other' })}
                          className={`flex-1 py-1.5 sm:py-2 px-1 sm:px-2 rounded-xl font-bold text-xs sm:text-sm transition-all border-2 ${formData.gender === 'other' ? 'border-[#56AB2F] bg-[#56AB2F]/5 text-[#56AB2F]' : 'border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}
                        >
                          Outro
                        </button>
                      </div>
                    ) : (
                      <p className="text-lg font-bold text-[var(--text-main)] capitalize">
                        {formData.gender === 'male' ? 'Masculino' : formData.gender === 'female' ? 'Feminino' : 'Outro'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Save Button */}
          <div className="mt-12">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="editing-buttons"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-4"
                >
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-[#56AB2F] hover:bg-[#4a9428] text-white h-20 rounded-[35px] font-black text-lg uppercase tracking-widest shadow-xl shadow-[#56AB2F]/30 active:scale-[0.98] transition-all flex items-center justify-center"
                  >
                    {isSaving ? (
                      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-6 h-6 mr-3" />
                        Salvar Alterações
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: profile?.name || '',
                        email: profile?.email || '',
                        age: profile?.age || '',
                        height: profile?.height || '',
                        weight: profile?.weight || '',
                        goal: profile?.goal || '',
                        gender: profile?.gender || 'male',
                        daily_calorie_target: profile?.daily_calorie_target || ''
                      });
                    }}
                    className="w-full h-16 text-[var(--text-muted)] font-black text-sm uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="edit-button"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full bg-[var(--bg-container)] hover:bg-[var(--bg-surface)] text-[var(--text-main)] border-2 border-[var(--border-main)] h-20 rounded-[35px] font-black text-lg uppercase tracking-widest shadow-sm active:scale-[0.98] transition-all flex items-center justify-center"
                  >
                    <Edit3 className="w-6 h-6 mr-3 text-[#56AB2F]" />
                    Editar Perfil
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
