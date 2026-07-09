import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Globe, Languages, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { api } from '../services/api';

export const Preferences = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleAILanguageChange = async (lang: 'auto' | 'pt' | 'en') => {
    try {
      await api.user.update({ ai_language: lang });
      await refreshUser();
      setToastMessage('Idioma da IA atualizado');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Failed to update AI language', err);
    }
  };

  const languages = [
    { id: 'auto', name: 'Automático', icon: Monitor,   description: 'Detecta o idioma na conversa' },
    { id: 'pt',   name: 'Português',  icon: Globe,      description: 'Responde sempre em Português'  },
    { id: 'en',   name: 'English',    icon: Languages,  description: 'Always respond in English'     },
  ];

  const currentLang = user?.ai_language || 'auto';

  return (
    <div className="min-h-screen bg-[#0A0F14] text-white pb-32 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0F14]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-md mx-auto px-5 h-[60px] flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="btn-icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[17px] font-bold">Preferências</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* AI Language Section */}
          <div>
            <p className="section-label mb-4">Idioma da IA</p>
            <div className="bg-white/[0.03] rounded-3xl border border-white/[0.06] p-4 space-y-2">
              {languages.map((lang) => {
                const isActive = currentLang === lang.id;
                return (
                  <button
                    key={lang.id}
                    onClick={() => handleAILanguageChange(lang.id as any)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2 active:scale-[0.98] ${
                      isActive
                        ? 'border-[#22C55E] bg-[#22C55E]/5'
                        : 'border-transparent bg-white/[0.03] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-[#22C55E] text-white' : 'bg-white/[0.06] text-slate-400'
                      }`}>
                        <lang.icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className={`font-bold text-[15px] ${isActive ? 'text-[#22C55E]' : 'text-white'}`}>
                          {lang.name}
                        </p>
                        <p className="text-[12px] text-slate-500 font-medium">
                          {lang.description}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 bg-[#22C55E] rounded-full flex items-center justify-center text-white flex-shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-[#111827] border border-white/10 text-white rounded-full flex items-center gap-3 shadow-2xl"
          >
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
            <span className="text-[12px] font-bold uppercase tracking-widest">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};
