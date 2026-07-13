import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Inbox, Zap, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket';
import { formatMaputoTime, formatMaputoDate } from '../utils/dateUtils';

export const NotificationCenter: React.FC = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            
            // Listen for real-time notifications
            const handleNewNotification = (notif: any) => {
                setNotifications(prev => [notif, ...prev]);
                setUnreadCount(prev => prev + 1);
            };

            socketService.getSocket()?.on('new_notification', handleNewNotification);
            return () => {
                socketService.getSocket()?.off('new_notification', handleNewNotification);
            };
        }
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const data = await api.notifications.getNotifications();
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await api.notifications.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.notifications.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'success':
            case 'update':
                return { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
            case 'alert':
            case 'warning':
                return { icon: <AlertTriangle className="w-4 h-4 text-rose-500" />, bg: 'bg-rose-50 dark:bg-rose-900/20' };
            case 'promotion':
                return { icon: <Zap className="w-4 h-4 text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-900/20' };
            default:
                return { icon: <Info className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-900/20' };
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-[var(--text-muted)] hover:text-[var(--text-muted)] dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[#0F172A] animate-in zoom-in duration-300">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 sm:w-96 bg-[var(--bg-card)] dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-[var(--border-main)] dark:border-slate-700 overflow-hidden z-50 origin-top-right"
                    >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-[var(--border-main)] dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-[var(--text-main)] dark:text-white flex items-center gap-2">
                                Notificações
                                {unreadCount > 0 && <span className="text-[11px] font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">{unreadCount} novas</span>}
                            </h3>
                            {unreadCount > 0 && (
                                <button 
                                    onClick={markAllRead}
                                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                                >
                                    Ler todas
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                            {loading && notifications.length === 0 ? (
                                <div className="p-10 text-center space-y-3">
                                    <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-sm text-[var(--text-muted)]">Carregando...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-10 text-center space-y-3 opacity-50">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)]">
                                        <Inbox size={32} />
                                    </div>
                                    <p className="text-sm font-medium text-[var(--text-muted)]">Nenhuma notificação por aqui.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50 dark:divide-slate-800">
                                    {notifications.map((notif) => {
                                        const styles = getTypeStyles(notif.type);
                                        return (
                                            <div 
                                                key={notif.id}
                                                className={`p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors relative group ${!notif.is_read ? 'bg-emerald-50/20' : ''}`}
                                            >
                                                {!notif.is_read && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                                                )}
                                                
                                                <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${styles.bg}`}>
                                                    {styles.icon}
                                                </div>

                                                <div className="flex-1 space-y-1">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className={`text-sm font-bold ${!notif.is_read ? 'text-[var(--text-main)] dark:text-white' : 'text-[var(--text-muted)] dark:text-slate-400'}`}>
                                                            {notif.title}
                                                        </h4>
                                                        {!notif.is_read && (
                                                            <button 
                                                                onClick={() => markAsRead(notif.id)}
                                                                className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                                title="Marcar como lida"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-[var(--text-muted)] dark:text-slate-400 leading-relaxed">
                                                        {notif.message}
                                                    </p>
                                                    <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                                        {formatMaputoTime(notif.created_at)} • {formatMaputoDate(notif.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-5 py-3 border-t border-[var(--border-main)] dark:border-slate-800 text-center">
                                <button className="text-[11px] font-bold text-[var(--text-muted)] dark:text-slate-500 hover:text-emerald-500 transition-colors uppercase tracking-wider">
                                    Ver todas as atividades
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
