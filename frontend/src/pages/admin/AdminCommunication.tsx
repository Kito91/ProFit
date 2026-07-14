import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Users, Bell, AlertCircle, CheckCircle2, 
  Layout, ChevronDown, Calendar, Mail, History, 
  ExternalLink, Trash2, Clock, Star, Zap, User, 
  ShieldCheck, ArrowRight, Eye, X, Coffee, Droplets, 
  Utensils, Moon, Smartphone, Sparkles, Target, Flame,
  Globe, Search, Check
} from 'lucide-react';
import { api, API_URL } from '../../services/api';
import { notificationService } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

const PERSONALIZATION_PARAMETERS = [
    '{{name}}',
    '{{nome}}',
    '{{age}}',
    '{{idade}}',
    '{{weight}}',
    '{{peso}}',
    '{{kilos}}',
    '{{kg}}'
] as const;

const AdminCommunication: React.FC = () => {
    // UI State
    const [mainTab, setMainTab] = useState<'notifications' | 'emails' | 'influencers'>('notifications');
    const [activeSubTab, setActiveSubTab] = useState<'manual' | 'scheduled' | 'history'>('manual');
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [sending, setSending] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    // Form State - Shared
    const [scheduledAt, setScheduledAt] = useState('');
    const [target, setTarget] = useState('all');

    // Form State - Notifications
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');
    const [notifType, setNotifType] = useState('info');
    const notifBodyRef = useRef<HTMLTextAreaElement>(null);
    
    // Form State - Emails
    const [emailSubject, setEmailSubject] = useState('');
    const [emailContent, setEmailContent] = useState('');
    const emailContentRef = useRef<HTMLTextAreaElement>(null);
    const [emailButtonText, setEmailButtonText] = useState('Ver no App');
    const [emailButtonLink, setEmailButtonLink] = useState('');
    
    // Form State - Influencers
    const [infEmail, setInfEmail] = useState('');
    const [infName, setInfName] = useState('');

    // Data State
    const [scheduledComms, setScheduledComms] = useState<any[]>([]);
    const [commHistory, setCommHistory] = useState<any[]>([]);
    
    // User Selection States
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [userSearch, setUserSearch] = useState('');
    const [countryFilter, setCountryFilter] = useState<'all' | 'MZ' | 'ZA' | 'AO'>('all');

    const { user: currentUser } = useAuth() as any;

    // Static Templates Library
    const templates = [
        { 
            id: 'breakfast', 
            icon: Coffee, 
            color: 'amber',
            name: 'Mata-bicho ☀️', 
            title: 'Hora do Mata-bicho! ☕️', 
            body: 'Não esqueça de registrar seu café da manhã para manter a meta calórica do dia!',
            subject: 'Dica: Comece o dia com energia! ⚡️',
            content: 'Olá! Um bom pequeno-almoço é essencial para sua performance. Registre agora sua primeira refeição no ProFit.'
        },
        { 
            id: 'lunch', 
            icon: Utensils, 
            color: 'emerald',
            name: 'Almoço 🥗', 
            title: 'O que tem no prato hoje? 🥗', 
            body: 'Tire uma foto do seu almoço agora e deixe nossa IA contar os macros para você.',
            subject: 'Sua análise nutricional de hoje',
            content: 'Já almoçou? Use o scanner do ProFit para garantir que está no caminho certo.'
        },
        { 
            id: 'water', 
            icon: Droplets, 
            color: 'sky',
            name: 'Hidratação 💧', 
            title: 'Lembrete de Hidratação 💧', 
            body: 'Beber água acelera seu metabolismo. Já bebeu seus 500ml de agora?',
            subject: 'Um segredo simples para emagrecer...',
            content: 'Beber água antes das refeições ajuda a controlar o apetite. Beba um copo agora!'
        },
        { 
            id: 'workout', 
            icon: Flame, 
            color: 'orange',
            name: 'Treino 🔥', 
            title: 'Foco no Treino! 🔥', 
            body: 'Sua melhor versão é construída hoje. Vamos esmagar essas metas?',
            subject: 'Desafio ProFit: Não pule o treino de hoje',
            content: 'A constância é o segredo do sucesso. Seu plano de treino está te esperando no App.'
        },
        { 
            id: 'pro_upsell', 
            icon: Star, 
            color: 'yellow',
            name: 'Oferta Pro ⭐', 
            title: 'Desbloqueie o Modo Pro 🚀', 
            body: 'Liberte o Master Coach IA e triplique seus resultados. Confira a oferta!',
            subject: 'Sua transformação merece o Modo Pro',
            content: 'Usuários Pro alcançam seus objetivos 3x mais rápido. Veja o que preparamos para você.'
        },
        { 
            id: 'night', 
            icon: Moon, 
            color: 'indigo',
            name: 'Final do Dia 🌙', 
            title: 'Quase lá! 🌙', 
            body: 'Registre sua última refeição do dia e veja seu balanço calórico final.',
            subject: 'Como foi seu dia no ProFit?',
            content: 'Parabéns por mais um dia de foco! Veja seu relatório de macros final agora.'
        },
        { 
            id: 'inactive', 
            icon: AlertCircle, 
            color: 'rose',
            name: 'Reativação 🥺', 
            title: 'Sentimos sua falta... 🥺', 
            body: 'Você não registra nada há 3 dias. Não desista do seu objetivo agora!',
            subject: 'Ainda dá tempo de voltar ao foco!',
            content: 'Voltar ao ritmo é mais fácil do que você imagina. Vamos registrar algo hoje?'
        },
        { 
            id: 'tip', 
            icon: Sparkles, 
            color: 'purple',
            name: 'Dica do Dia 🍏', 
            title: 'Dica ProFit 🍏', 
            body: 'Proteínas ajudam na saciedade. Priorize-as no seu próximo prato!',
            subject: 'Dica Nutricional: O poder das proteínas',
            content: 'Sabia que as proteínas gastam mais energia para serem digeridas? Use isso a seu favor.'
        }
    ];

    // One-time init: subscription check + user list
    useEffect(() => {
        checkSubscription();
        fetchUsers();
    }, []);

    // Fetch scheduled/history data when relevant tab is active
    useEffect(() => {
        if (activeSubTab === 'scheduled' || activeSubTab === 'history') {
            fetchData();
        }
    }, [mainTab, activeSubTab]);

    // Reset sub-tab when switching to influencers (sub-tabs don't apply there)
    useEffect(() => {
        if (mainTab === 'influencers') {
            setActiveSubTab('manual');
        }
    }, [mainTab]);

    const fetchUsers = async () => {
        try {
            const data = await api.admin.getUsers();
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const checkSubscription = async () => {
        const pushState = await notificationService.getState();
        setIsSubscribed(pushState.permission === 'granted' && pushState.subscribed);
    };

    const handleSubscribe = async () => {
        try {
            const subscribed = await notificationService.subscribeFromUserGesture();
            setIsSubscribed(subscribed);
            if (!subscribed) {
                setStatus({ type: 'error', message: 'Não foi possível registrar este navegador.' });
                return;
            }
            setStatus({ type: 'success', message: 'Notificações habilitadas neste navegador!' });
        } catch (err) {
            console.error('Subscription error:', err);
            setStatus({ type: 'error', message: 'Erro ao habilitar notificações.' });
        }
    };

    const fetchData = async () => {
        try {
            if (activeSubTab === 'scheduled') {
                const response = await fetch(`${API_URL}/admin/communication/scheduled`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await response.json();
                setScheduledComms(Array.isArray(data) ? data : []);
            }
            
            if (activeSubTab === 'history') {
                const response = await fetch(`${API_URL}/admin/communication/history`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await response.json();
                setCommHistory(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error fetching communication data:', err);
        }
    };

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const isEmail = mainTab === 'emails';
        
        // Client-side Validation
        if (isEmail) {
            if (!emailSubject.trim() || !emailContent.trim()) {
                setStatus({ type: 'error', message: 'Preencha todos os campos antes de enviar' });
                return;
            }
        } else {
            if (!notifTitle.trim() || !notifBody.trim()) {
                setStatus({ type: 'error', message: 'Preencha todos os campos antes de enviar' });
                return;
            }
        }

        setSending(true);
        setStatus(null);

        try {
            const endpoint = scheduledAt ? '/admin/communication/schedule' : '/admin/communication/send';
            
            const payload = isEmail ? {
                type: 'email',
                target: selectedUserIds.size > 0 ? 'specific' : target,
                subject: emailSubject,
                content: emailContent,
                buttonText: emailButtonText,
                buttonLink: emailButtonLink,
                scheduledAt,
                userIds: selectedUserIds.size > 0 ? Array.from(selectedUserIds) : []
            } : {
                type: 'push',
                target: selectedUserIds.size > 0 ? 'specific' : target,
                title: notifTitle,
                body: notifBody,
                scheduledAt,
                userIds: selectedUserIds.size > 0 ? Array.from(selectedUserIds) : []
            };

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Falha na operação.');
            }

            setStatus({
                type: 'success',
                message: scheduledAt
                    ? 'Agendado com sucesso! ✅'
                    : isEmail
                        ? 'Email enviado com sucesso ✅'
                        : 'Notificação enviada com sucesso! ✅'
            });
            
            // Clear forms on success if it's a direct send
            if (!scheduledAt) {
                if (isEmail) {
                    setEmailSubject('');
                    setEmailContent('');
                    setEmailButtonLink('');
                } else {
                    setNotifTitle('');
                    setNotifBody('');
                }
            }
            setScheduledAt('');
            
            setTimeout(() => setStatus(null), 6000);
        } catch (err: any) {
            console.error('Communication error:', err);
            setStatus({ type: 'error', message: err.message || 'Erro crítico na operação.' });
        } finally {
            setSending(false);
        }
    };

    const handleInviteInfluencer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!infEmail) {
            setStatus({ type: 'error', message: 'E-mail é obrigatório' });
            return;
        }

        setSending(true);
        setStatus(null);

        try {
            await api.admin.inviteInfluencer(infEmail, infName);
            setStatus({ type: 'success', message: 'Convite enviado com sucesso para o Influenciador! 🚀' });
            setInfEmail('');
            setInfName('');
            setTimeout(() => setStatus(null), 5000);
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message || 'Erro ao enviar convite' });
        } finally {
            setSending(false);
        }
    };

    const handleSelectTemplate = (t: any) => {
        if (mainTab === 'notifications') {
            setNotifTitle(t.title);
            setNotifBody(t.body);
        } else {
            setEmailSubject(t.subject);
            setEmailContent(t.content);
        }
    };

    const insertNotificationParameter = (parameter: string) => {
        const textarea = notifBodyRef.current;
        const selectionStart = textarea?.selectionStart ?? notifBody.length;
        const selectionEnd = textarea?.selectionEnd ?? selectionStart;
        const nextBody = `${notifBody.slice(0, selectionStart)}${parameter}${notifBody.slice(selectionEnd)}`;

        setNotifBody(nextBody);

        requestAnimationFrame(() => {
            if (!textarea) return;

            const nextCursorPosition = selectionStart + parameter.length;
            textarea.focus();
            textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
        });
    };

    const insertEmailParameter = (parameter: string) => {
        const textarea = emailContentRef.current;
        const selectionStart = textarea?.selectionStart ?? emailContent.length;
        const selectionEnd = textarea?.selectionEnd ?? selectionStart;
        const nextContent = `${emailContent.slice(0, selectionStart)}${parameter}${emailContent.slice(selectionEnd)}`;

        setEmailContent(nextContent);

        requestAnimationFrame(() => {
            if (!textarea) return;

            const nextCursorPosition = selectionStart + parameter.length;
            textarea.focus();
            textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
        });
    };

    const loadTestTemplate = () => {
        const proTemplate = templates.find(t => t.id === 'pro_upsell');
        if (proTemplate) {
            setEmailSubject(proTemplate.subject);
            setEmailContent(proTemplate.content);
            setStatus({ type: 'success', message: 'Template VIP carregado com sucesso!' });
            setTimeout(() => setStatus(null), 3000);
        }
    };

    const handleTestPush = async () => {
        if (!currentUser?.id) {
            setStatus({ type: 'error', message: 'Usuário não identificado para teste' });
            return;
        }
        
        setSending(true);
        setStatus(null);
        
        try {
            const payload = {
                type: 'push',
                target: 'specific',
                userId: currentUser.id,
                title: notifTitle || 'Teste de Notificação 🔔',
                body: notifBody || 'Se você recebeu isso, as notificações estão funcionando!'
            };

            const response = await fetch(`${API_URL}/admin/communication/send`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Falha no teste');
            
            setStatus({ type: 'success', message: 'Teste enviado para o seu dispositivo! ✅' });
            setTimeout(() => setStatus(null), 5000);
        } catch (err: any) {
            console.error('Test push error:', err);
            setStatus({ type: 'error', message: err.message || 'Erro ao enviar teste de push' });
        } finally {
            setSending(false);
        }
    };

    const deleteScheduled = async (id: string) => {
        if (!confirm('Deseja realmente remover este agendamento?')) return;
        try {
            await fetch(`${API_URL}/admin/communication/scheduled/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            fetchData();
        } catch (err) {
            console.error('Error deleting scheduled:', err);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto flex flex-col space-y-6 animate-in fade-in duration-500 lg:h-[calc(100vh-110px)] lg:overflow-hidden">
            {/* Previous Header & Tabs logic stays same */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-[22px] md:text-[32px] font-bold text-[#1A202C] dark:text-white tracking-tight flex flex-wrap items-center gap-2">
                        Central de Comunicação
                        <span className="text-[11px] md:text-[12px] bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full border border-green-200 dark:border-green-500/30 font-bold uppercase">Multi-Channel</span>
                    </h1>
                    <p className="text-[13px] md:text-[16px] text-[#718096] dark:text-slate-400 mt-1">Gerencie push notifications e e-mails de marketing em um só lugar.</p>
                </div>

                <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                    <button
                        onClick={() => setMainTab('notifications')}
                        className={`flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[13px] sm:text-[14px] font-bold transition-all ${mainTab === 'notifications' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        <Bell size={16} /> <span className="hidden sm:inline">Push</span> Notificações
                    </button>
                    <button
                        onClick={() => setMainTab('emails')}
                        className={`flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[13px] sm:text-[14px] font-bold transition-all ${mainTab === 'emails' ? 'bg-white dark:bg-slate-700 text-[#22c55e] dark:text-[#4ade80] shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        <Mail size={16} /> E-mail
                    </button>
                    <button
                        onClick={() => setMainTab('influencers')}
                        className={`flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[13px] sm:text-[14px] font-bold transition-all ${mainTab === 'influencers' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                    >
                        <Star size={16} /> Influenciadores
                    </button>
                </div>
            </div>

            {mainTab !== 'influencers' && (
                <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                    {[
                        { id: 'manual', label: 'Novo Envio', icon: Send },
                        { id: 'scheduled', label: 'Agendamentos', icon: Calendar },
                        { id: 'history', label: 'Histórico de Envios', icon: History }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id as any)}
                            className={`pb-4 px-2 flex items-center gap-2 text-[14px] font-semibold transition-all relative whitespace-nowrap ${activeSubTab === tab.id ? 'text-[#1A202C] dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeSubTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 dark:bg-green-500 rounded-full" />}
                        </button>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 lg:flex-1 lg:min-h-0 lg:overflow-hidden pb-4">
                <div className="lg:col-span-8 space-y-6 lg:overflow-y-auto pr-0 lg:pr-2 custom-scrollbar">
                    {status && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            <span className="text-[14px] font-medium">{status.message}</span>
                        </div>
                    )}

                    {!isSubscribed && mainTab === 'notifications' && (
                        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Bell className="text-amber-600" size={20} />
                                <div>
                                    <p className="text-[14px] font-bold text-amber-800 dark:text-amber-400">Notificações Desativadas</p>
                                    <p className="text-[12px] text-amber-700 dark:text-amber-500/80">Habilite para testar o recebimento no seu próprio navegador.</p>
                                </div>
                            </div>
                            <button onClick={handleSubscribe} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-[12px] font-bold hover:bg-amber-700 transition-all">
                                Habilitar Agora
                            </button>
                        </div>
                    )}

                    {activeSubTab === 'manual' && mainTab !== 'influencers' && (
                        <div className="bg-[var(--bg-card)] dark:bg-[#1E293B] p-4 md:p-8 rounded-[24px] border border-[#E6EAF0] dark:border-slate-700/50 shadow-sm space-y-8">
                            <form onSubmit={handleAction} className="space-y-6">
                                {mainTab === 'notifications' ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Título</label>
                                                <input required type="text" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[15px] dark:text-white" placeholder="Ex: Hora de treinar! 💪" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Tipo Visual</label>
                                                <select value={notifType} onChange={(e) => setNotifType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[15px] dark:text-white">
                                                    <option value="info">Info (Azul)</option>
                                                    <option value="success">Sucesso (Verde)</option>
                                                    <option value="promotion">Premium (Dourado)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Mensagem</label>
                                            <textarea ref={notifBodyRef} required value={notifBody} onChange={(e) => setNotifBody(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[15px] dark:text-white h-24 resize-none" placeholder="Conteúdo da notificação..." />
                                            <div className="space-y-2 pt-1">
                                                <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                                                    Parâmetros personalizados — clique para inserir
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {PERSONALIZATION_PARAMETERS.map((parameter) => (
                                                        <button
                                                            key={parameter}
                                                            type="button"
                                                            onMouseDown={(event) => event.preventDefault()}
                                                            onClick={() => insertNotificationParameter(parameter)}
                                                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 font-mono text-[12px] font-bold text-indigo-600 transition-colors hover:border-indigo-400 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20"
                                                            aria-label={`Inserir parâmetro ${parameter}`}
                                                        >
                                                            {parameter}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Assunto do E-mail</label>
                                                <button type="button" onClick={loadTestTemplate} className="text-[12px] text-green-600 hover:text-green-700 font-bold flex items-center gap-1">
                                                    <Star size={12} /> Usar Template VIP
                                                </button>
                                            </div>
                                            <input required type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[15px] dark:text-white" placeholder="Ex: Seu progresso semanal chegou! 💚" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Conteúdo (HTML/Text)</label>
                                            <textarea ref={emailContentRef} required value={emailContent} onChange={(e) => setEmailContent(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[15px] dark:text-white h-48 resize-none font-mono" placeholder="Olá [Nome], você está indo muito bem..." />
                                            <div className="space-y-2 pt-1">
                                                <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                                                    Parâmetros personalizados — clique para inserir
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {PERSONALIZATION_PARAMETERS.map((parameter) => (
                                                        <button
                                                            key={parameter}
                                                            type="button"
                                                            onMouseDown={(event) => event.preventDefault()}
                                                            onClick={() => insertEmailParameter(parameter)}
                                                            className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 font-mono text-[12px] font-bold text-green-700 transition-colors hover:border-green-400 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500/30 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:hover:border-green-400 dark:hover:bg-green-500/20"
                                                            aria-label={`Inserir parâmetro ${parameter}`}
                                                        >
                                                            {parameter}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Texto do Botão</label>
                                                <input type="text" value={emailButtonText} onChange={(e) => setEmailButtonText(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] dark:text-white" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Link do Botão</label>
                                                <input type="url" value={emailButtonLink} onChange={(e) => setEmailButtonLink(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] dark:text-white" />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Público-Alvo</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'all', label: 'Todos', icon: Users },
                                                { id: 'pro', label: 'PRO', icon: Star },
                                                { id: 'active', label: 'Ativos', icon: Zap },
                                                { id: 'inactive', label: 'Inativos', icon: ShieldCheck }
                                            ].map(t => (
                                                <button key={t.id} type="button" onClick={() => setTarget(t.id)} className={`flex items-center gap-2 p-3 rounded-xl border font-bold text-[13px] transition-all ${target === t.id ? (mainTab === 'emails' ? 'bg-green-600 border-green-600 text-white' : 'bg-indigo-600 border-indigo-600 text-white') : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                                                    <t.icon size={16} /> {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            <Clock size={16} /> Agendamento (Opcional)
                                        </label>
                                        <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[14px] dark:text-white" />
                                        <p className="text-[11px] text-slate-400">Deixe em branco para enviar imediatamente.</p>
                                    </div>
                                </div>

                                {/* Nova Seção: Selecionar Usuários */}
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-[16px] font-bold text-slate-800 dark:text-white">Selecionar Usuários (Opcional)</h3>
                                            <p className="text-[12px] text-slate-500">Escolha usuários específicos ou envie para todos</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const filtered = users.filter(u => {
                                                        const matchesSearch = !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase());
                                                        const matchesCountry = countryFilter === 'all' || u.country_code === countryFilter;
                                                        return matchesSearch && matchesCountry;
                                                    });
                                                    setSelectedUserIds(new Set([...Array.from(selectedUserIds), ...filtered.map(u => u.id)]));
                                                }}
                                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                Selecionar todos
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setSelectedUserIds(new Set())}
                                                className="text-[11px] font-bold text-slate-500 hover:text-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                Limpar seleção
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input 
                                                type="text" 
                                                value={userSearch} 
                                                onChange={(e) => setUserSearch(e.target.value)}
                                                placeholder="Buscar por nome ou e-mail..."
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[13px]"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {[
                                                { id: 'all', label: 'Tudo', flag: '🌍' },
                                                { id: 'MZ', label: 'MZ', flag: '🇲🇿' },
                                                { id: 'ZA', label: 'ZA', flag: '🇿🇦' },
                                                { id: 'AO', label: 'AO', flag: '🇦🇴' }
                                            ].map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => setCountryFilter(c.id as any)}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[12px] font-bold transition-all ${countryFilter === c.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'}`}
                                                >
                                                    <span>{c.flag}</span>
                                                    <span className="hidden md:inline">{c.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                        <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {users.filter(u => {
                                                    const matchesSearch = !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase());
                                                    const matchesCountry = countryFilter === 'all' || u.country_code === countryFilter;
                                                    return matchesSearch && matchesCountry;
                                                }).map(user => (
                                                    <label 
                                                        key={user.id} 
                                                        className={`flex items-center gap-4 p-3 hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors ${selectedUserIds.has(user.id) ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}`}
                                                    >
                                                        <div className="relative flex items-center justify-center w-5 h-5 rounded-md border-2 transition-all border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shrink-0">
                                                            <input 
                                                                type="checkbox" 
                                                                className="absolute opacity-0 w-full h-full cursor-pointer z-10" 
                                                                checked={selectedUserIds.has(user.id)}
                                                                onChange={() => {
                                                                    const next = new Set(selectedUserIds);
                                                                    if (next.has(user.id)) next.delete(user.id);
                                                                    else next.add(user.id);
                                                                    setSelectedUserIds(next);
                                                                }}
                                                            />
                                                            {selectedUserIds.has(user.id) && <Check size={14} className="text-indigo-600 dark:text-indigo-400 font-bold" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 truncate">{user.name}</span>
                                                                <span className="text-[11px]">{user.country_code === 'MZ' ? '🇲🇿' : user.country_code === 'ZA' ? '🇿🇦' : user.country_code === 'AO' ? '🇦🇴' : '🌍'}</span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 truncate">{user.email || user.phone || 'Sem contato'}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                                {users.length === 0 && (
                                                    <div className="p-8 text-center text-slate-400 text-[13px]">Nenhum usuário encontrado.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {selectedUserIds.size > 0 && (
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 animate-in fade-in slide-in-from-left-2">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                                <span className="text-[12px] font-bold">{selectedUserIds.size} usuários selecionados</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 italic">* Envio limitado apenas aos selecionados</p>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {mainTab === 'notifications' && (
                                        <button
                                            type="button"
                                            onClick={handleTestPush}
                                            disabled={sending || !notifTitle}
                                            className="py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border-2 border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:opacity-50"
                                        >
                                            <Smartphone size={20} /> Testar no meu Aparelho
                                        </button>
                                    )}
                                    <button disabled={sending} type="submit" className={`${mainTab === 'notifications' ? '' : 'md:col-span-2'} py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${mainTab === 'emails' ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'} ${sending ? 'opacity-80' : ''}`}>
                                        {sending ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Enviando...</span>
                                            </div>
                                        ) : (
                                            <>{scheduledAt ? <Calendar size={20} /> : <Send size={20} />} {scheduledAt ? 'Agendar Envio' : 'Disparar Agora'}</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {mainTab === 'influencers' && (
                        <div className="bg-[var(--bg-card)] dark:bg-[#1E293B] p-4 md:p-8 rounded-[24px] border border-[#E6EAF0] dark:border-slate-700/50 shadow-sm space-y-8 animate-in slide-in-from-bottom-4">
                            <div className="space-y-2">
                                <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                                    <Star className="text-amber-500" fill="currentColor" size={28} />
                                    Convidar Novo Influenciador
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400">O influenciador receberá um e-mail especial com acesso PRO Vitalício liberado de imediato.</p>
                            </div>

                            <form onSubmit={handleInviteInfluencer} className="space-y-6 max-w-2xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300">Nome do Influenciador (Opcional)</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input 
                                                type="text" 
                                                value={infName} 
                                                onChange={(e) => setInfName(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[15px] dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium" 
                                                placeholder="Ex: João Silva" 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[14px] font-bold text-slate-700 dark:text-slate-300">E-mail de Convite</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input 
                                                required 
                                                type="email" 
                                                value={infEmail} 
                                                onChange={(e) => setInfEmail(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[15px] dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium" 
                                                placeholder="influencer@exemplo.com" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-500/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-500/20">
                                    <div className="flex gap-3">
                                        <ShieldCheck className="text-amber-600 shrink-0" size={20} />
                                        <div>
                                            <p className="text-[14px] font-bold text-amber-800 dark:text-amber-400">Status VIP Vitalício</p>
                                            <p className="text-[12px] text-amber-700 dark:text-amber-500/80">Ao clicar e ativar pelo e-mail, o influenciador terá o plano PRO ativado permanentemente (VIP) e acesso a todas as ferramentas sem restrições.</p>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    disabled={sending} 
                                    type="submit" 
                                    className="w-full md:w-auto px-10 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-100 disabled:opacity-50"
                                >
                                    {sending ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Enviando Convite...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Send size={20} />
                                            ENVIAR CONVITE VIP
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-[17px] font-bold text-slate-800 dark:text-white mb-4">Etapas do Influenciador</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { title: '1. Recebe E-mail', desc: 'Recebe um link de ativação seguro e personalizado.' },
                                        { title: '2. Cria Senha', desc: 'Define sua senha e perfil se for novo, ou migra conta atual.' },
                                        { title: '3. Acesso Liberado', desc: 'Entra no App com status PRO e VIP ativado para sempre.' }
                                    ].map((step, idx) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-amber-600 font-black text-sm mb-1">{step.title}</p>
                                            <p className="text-[12px] text-slate-500 leading-relaxed">{step.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'scheduled' && mainTab !== 'influencers' && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            {(!Array.isArray(scheduledComms) || scheduledComms.filter(c => mainTab === 'notifications' ? c.type === 'push' : c.type === 'email').length === 0) ? (
                                <div className="bg-[var(--bg-card)] dark:bg-[#1E293B] p-12 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-700 text-center">
                                    <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                                    <p className="text-slate-500 dark:text-slate-400">Nenhum agendamento pendente para {mainTab === 'notifications' ? 'Push' : 'E-mail'}.</p>
                                </div>
                            ) : (
                                (Array.isArray(scheduledComms) ? scheduledComms : []).filter(c => mainTab === 'notifications' ? c.type === 'push' : c.type === 'email').map((item, idx) => (
                                    <div key={idx} className="bg-[var(--bg-card)] dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2.5 rounded-xl ${item.type === 'email' ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'}`}>
                                                <Calendar size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[15px] font-bold text-slate-800 dark:text-white line-clamp-1">{item.title}</span>
                                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold text-slate-500 uppercase">{item.target}</span>
                                                </div>
                                                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                                                    <Clock size={12} className="text-indigo-500" /> Agendado para: <span className="font-bold text-slate-700 dark:text-slate-200">{new Date(item.scheduled_at).toLocaleString('pt-MZ')}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => deleteScheduled(item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeSubTab === 'history' && mainTab !== 'influencers' && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            {(!Array.isArray(commHistory) || commHistory.filter(c => mainTab === 'notifications' ? c.type === 'push' : c.type === 'email').length === 0) ? (
                                <div className="bg-[var(--bg-card)] dark:bg-[#1E293B] p-12 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-700 text-center">
                                    <History size={48} className="mx-auto text-slate-300 mb-4" />
                                    <p className="text-slate-500 dark:text-slate-400">Nenhum histórico encontrado para {mainTab === 'notifications' ? 'Push' : 'E-mail'}.</p>
                                </div>
                            ) : (
                                (Array.isArray(commHistory) ? commHistory : []).filter(c => mainTab === 'notifications' ? c.type === 'push' : c.type === 'email').map((item, idx) => (
                                    <div key={idx} className="bg-[var(--bg-card)] dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2.5 rounded-xl ${item.sub_type === 'scheduled' ? 'bg-amber-500/10 text-amber-400' : (item.type === 'email' ? 'bg-green-500/10 text-green-400' : 'bg-indigo-500/10 text-indigo-400')}`}>
                                                {item.sub_type === 'scheduled' ? <Calendar size={18} /> : (item.type === 'email' ? <Mail size={18} /> : <Bell size={18} />)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[15px] font-bold text-slate-800 dark:text-white line-clamp-1">{item.title || item.sub_type || 'Envio'}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${item.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.user_name || 'Usuário'}</span>
                                                    • <Clock size={12} /> {new Date(item.sent_at).toLocaleString('pt-MZ')}
                                                </p>
                                            </div>
                                        </div>
                                        {item.details && (
                                            <span className="text-[11px] text-slate-400 italic max-w-[200px] truncate">{item.details}</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar - Templates and Preview */}
                <div className="hidden lg:flex lg:col-span-4 flex-col h-full gap-6 min-h-0">
                    {/* Templates Sidebar — hidden on influencers tab */}
                    {mainTab !== 'influencers' && <div className="bg-white dark:bg-[#1E293B] p-6 rounded-[24px] border border-[#E6EAF0] dark:border-slate-700/50 shadow-sm flex flex-col min-h-0 max-h-[50%]">
                        <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <Layout size={20} />
                            </div>
                            <div>
                                <h3 className="text-[17px] font-bold text-[#1A202C] dark:text-white">Smart Templates</h3>
                                <p className="text-[13px] text-slate-500">Escolha um modelo otimizado.</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2.5">
                            {templates.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleSelectTemplate(t)}
                                    className="w-full flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all text-left group"
                                >
                                    <div className={`p-2 bg-white dark:bg-slate-700 rounded-xl text-${t.color}-500 shadow-sm group-hover:scale-110 transition-transform`}>
                                        <t.icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[14px] font-bold text-slate-700 dark:text-slate-200 truncate">{t.name}</p>
                                        <p className="text-[11px] text-slate-400 truncate">{mainTab === 'notifications' ? t.title : t.subject}</p>
                                    </div>
                                    <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>}

                    {/* Live Mobile Preview — only for push and email tabs */}
                    {mainTab !== 'influencers' && <div className="bg-slate-900 rounded-[40px] p-3 shadow-2xl flex-1 max-w-[240px] mx-auto border-[6px] border-slate-800 relative overflow-hidden hidden md:flex flex-col min-h-0">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-b-2xl z-20"></div>
                        
                        {/* Content */}
                        <div className="h-full w-full bg-gradient-to-tr from-indigo-950 via-slate-950 to-slate-900 rounded-[24px] flex flex-col p-4 pt-8 relative overflow-hidden">
                             <div className="text-white/40 text-[10px] font-bold flex justify-between mb-8 px-2">
                                <span>21:30</span>
                                <div className="flex gap-1">
                                    <div className="w-3 h-3 rounded-full border border-white/20" />
                                    <div className="w-8 h-3 rounded-full bg-white/20" />
                                </div>
                             </div>

                             {/* Notification Mockup */}
                             {mainTab === 'notifications' ? (
                                (notifTitle || notifBody) && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[22px] p-4 shadow-2xl"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center p-1">
                                                    <img src="/faviconnovo.png" alt="P" className="w-full" />
                                                </div>
                                                <span className="text-white text-[10px] font-black uppercase tracking-widest opacity-80">ProFit</span>
                                            </div>
                                            <span className="text-white/40 text-[9px]">agora</span>
                                        </div>
                                        <h3 className="text-white font-bold text-[14px] leading-tight mb-1">{notifTitle || 'Título'}</h3>
                                        <p className="text-white/70 text-[12px] leading-snug line-clamp-3">{notifBody || 'Mensagem...'}</p>
                                    </motion.div>
                                )
                             ) : (
                                (emailSubject || emailContent) && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-white rounded-2xl overflow-hidden shadow-2xl h-[300px] flex flex-col"
                                    >
                                        <div className="bg-slate-100 p-3 border-b border-slate-200">
                                            <p className="text-[10px] font-bold text-slate-800 truncate">{emailSubject}</p>
                                        </div>
                                        <div className="bg-white p-4 flex-1 overflow-auto">
                                            <div className="w-12 h-1.5 bg-green-500 rounded-full mb-3" />
                                            <div className="space-y-2">
                                                <div className="h-2 bg-slate-100 rounded w-full" />
                                                <div className="h-2 bg-slate-100 rounded w-5/6" />
                                                <div className="h-2 bg-slate-100 rounded w-4/6" />
                                            </div>
                                            <div className="mt-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                                                <span className="text-white text-[10px] font-bold">{emailButtonText}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                             )}
                        </div>
                    </div>}
                    {mainTab !== 'influencers' && <p className="text-center text-[11px] text-slate-400 font-bold uppercase tracking-wider">Preview Real-time</p>}
                </div>
            </div>
        </div>
    );
};

export default AdminCommunication;
