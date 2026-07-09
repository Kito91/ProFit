import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

export const Login = () => {
  const navigate = useNavigate();
  const { langData } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'email' | 'password' | 'general' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const getErrorMessage = (err: any) => {
    if (typeof err === 'string') return err;
    if (err?.message) return err.message;
    if (err?.error) return err.error;
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.response?.message) return err.response.message;
    if (err?.data?.message) return err.data.message;
    return langData.auth_error_server;
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError('');
    setErrorType(null);
    try {
      console.log("Iniciando tentativa de login...");
      const normalizedEmail = email.trim().toLowerCase();
      const user = await login(normalizedEmail, password);
      
      const userRole = user?.role || 'user';
      const isAdmin = normalizedEmail === 'handersonchemane@gmail.com' || userRole === 'admin';
      
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      console.error("Erro no login detalhado:", err);
      const msg = getErrorMessage(err);
      setError(msg);
      const status = err?.status ?? null;
      
      if (status === 404 || msg.toLowerCase().includes('e-mail') || msg.toLowerCase().includes('conta não encontrada') || msg.toLowerCase().includes('usuário não encontrado')) {
        setErrorType('email');
      } else if (status === 401 || msg.toLowerCase().includes('senha') || msg.toLowerCase().includes('incorreta')) {
        setErrorType('password');
      } else {
        setErrorType('general');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-wrapper bg-[var(--bg-app)] min-h-screen overflow-x-hidden">
      <LanguageSelector />
      
      {/* Container Principal Mobile-First */}
      <div className="app-container flex flex-col items-center p-6 bg-[var(--bg-app)] min-h-screen shadow-none border-none relative pt-[24px]">
        
        {/* Wrapper Conteúdo com largura controlada */}
        <div className="w-full max-w-[400px] flex flex-col items-center animate-in fade-in duration-700">
          
          {/* Espaço Hero (Placeholder da Imagem) */}
          <div className="mt-[40px] h-[120px] w-full flex items-center justify-center">
            {/* Mantemos vazio para seguir a hierarquia do onboarding */}
          </div>

          {/* Título e Subtítulo */}
          <div className="mt-[24px] text-center w-full px-4">
            <h1 className="text-[28px] font-bold text-white tracking-tight leading-tight">
              {langData.welcome_back}
            </h1>
            <p className="mt-[16px] text-[15px] text-gray-400 leading-relaxed">
              {langData.login_to_account}
            </p>
          </div>

          {/* Área do Formulário */}
          <form className="mt-[20px] w-full px-4 space-y-4" onSubmit={handleLogin}>
            {/* Erro Geral (Agora mais visível) */}
            {(error && (errorType === 'general' || errorType === null)) && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-red-50 rounded-xl border border-red-200 flex items-center justify-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <p className="text-red-600 text-[13px] font-bold text-center leading-tight">{error}</p>
              </motion.div>
            )}

            <div className="space-y-4">
              {/* Campo Email */}
              <div className="flex flex-col gap-1.5">
                <input 
                  type="email" 
                  name="email"
                  id="email"
                  autoComplete="username"
                  placeholder={langData.quiz_email_label} 
                  className={`w-full h-[48px] bg-[var(--bg-card)] rounded-[12px] px-5 text-[15px] font-medium text-white placeholder:text-gray-500 outline-none border border-white/5 focus:border-[#22C55E]/50 transition-all ${errorType === 'email' ? 'ring-2 ring-red-400 bg-red-50/30' : ''}`} 
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorType) setErrorType(null);
                  }}
                />
                {errorType === 'email' && (
                  <p className="text-red-500 text-[12px] font-bold px-1 ml-1">{error}</p>
                )}
              </div>

              {/* Campo Senha */}
              <div className="flex flex-col gap-1.5">
                <input 
                  type="password" 
                  name="password"
                  id="password"
                  autoComplete="current-password"
                  placeholder={langData.auth_password_placeholder} 
                  className={`w-full h-[48px] bg-[var(--bg-card)] rounded-[12px] px-5 text-[15px] font-medium text-white placeholder:text-gray-500 outline-none border border-white/5 focus:border-[#22C55E]/50 transition-all ${errorType === 'password' ? 'ring-2 ring-red-400 bg-red-50/30' : ''}`} 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorType) setErrorType(null);
                  }}
                />
                <div className="flex justify-between items-center px-1">
                  {errorType === 'password' ? (
                    <p className="text-red-500 text-[12px] font-bold ml-1">{error}</p>
                  ) : <div />}
                  <button 
                    type="button"
                    onClick={() => navigate('/forgot-password')} 
                    className="text-[#22C55E] text-[13px] font-semibold hover:opacity-80 transition-opacity"
                  >
                    {langData.auth_forgot_password}
                  </button>
                </div>
              </div>
            </div>

            {/* Botão de Login */}
            <button 
              type="submit"
              disabled={isLoading || !email || !password}
              className="mt-[16px] w-full h-[52px] bg-white text-black text-base font-bold rounded-full transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center shadow-lg shadow-black/5"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : langData.auth_login_button}
            </button>
          </form>

          {/* Rodapé Dinâmico */}
          <div className="mt-[20px] text-center w-full px-4 pb-12">
            <p className="text-[14px] text-gray-400 font-medium">
              {langData.auth_no_account} {' '}
              <button 
                onClick={() => navigate('/quiz/step-1')} 
                className="text-[#22C55E] font-bold hover:underline underline-offset-4"
              >
                {langData.create_account}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
