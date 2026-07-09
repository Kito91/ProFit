import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, CheckCircle2, Droplets, Target, Utensils, Info, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { getMaputoNow } from '../utils/dateUtils';

export const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotifications();

    // Socket Integration
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          socketService.connect();
          const socket = socketService.getSocket();
          
          socket?.on('new_notification', (notif: any) => {
            setNotifications(prev => [notif, ...prev]);
          });
        }
      } catch (e) {
        console.error("Socket error", e);
      }
    }

    return () => {
      // Don't disconnect here if it's shared, but for simplicity:
      // socket?.off('new_notification');
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.notifications.getAll();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const getIconForType = (type: string) => {
    switch(type) {
      case 'water': return <Droplets className="w-5 h-5 text-blue-500" />;
      case 'goal': return <Target className="w-5 h-5 text-[#56AB2F]" />;
      case 'meal': return <Utensils className="w-5 h-5 text-orange-500" />;
      case 'system': return <Info className="w-5 h-5 text-purple-500" />;
      default: return <Bell className="w-5 h-5 text-[var(--text-muted)]" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = getMaputoNow();
    const diffMs = now.valueOf() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 60) return `${diffMins || 1} min atrás`;
    if (diffHrs < 24) return `${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'} atrás`;
    if (diffDays === 1) return 'Ontem';
    return `${diffDays} dias atrás`;
  };

  return (
    <div className="main-wrapper bg-[var(--bg-app)]">
      <div className="app-container bg-transparent shadow-none border-none">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 z-40 bg-[var(--bg-app)]/90 backdrop-blur-sm">
        <div className="flex-1 flex justify-start">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-[var(--bg-card)] rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] active:scale-95 transition-all text-[var(--text-main)] hover:text-[var(--text-main)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-[2] flex justify-center">
          <h1 className="text-[20px] font-black text-[var(--text-main)] tracking-tight">Notificações</h1>
        </div>
        <div className="flex-1 flex justify-end gap-2">
          <button
            onClick={() => navigate('/notification-settings')}
            className="w-10 h-10 bg-[var(--bg-card)] rounded-full flex items-center justify-center active:scale-95 transition-all text-[var(--text-muted)]"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleMarkAllAsRead}
            className="text-[11px] font-bold text-[#56AB2F] uppercase tracking-wider bg-[#A8E063]/10 px-3 py-1.5 rounded-full active:scale-95 transition-all"
          >
            Lidas
          </button>
        </div>
      </div>

      <div className="px-6 pb-24 relative">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#56AB2F]"></div>
          </div>
        ) : notifications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 space-y-4"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
              <Bell className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-[var(--text-muted)] font-medium">Nenhuma notificação ainda.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {notifications.map((n, index) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                  className={`
                    relative w-full p-4 rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-colors duration-300
                    ${!n.is_read ? 'bg-[var(--bg-card)] cursor-pointer' : 'bg-[var(--bg-surface)]'}
                  `}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                      {getIconForType(n.type)}
                    </div>
                    <div className="flex-1 text-left min-w-0 pr-6">
                      <p className={`font-bold text-[15px] truncate mb-0.5 ${!n.is_read ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                        {n.title}
                      </p>
                      <p className={`text-[13px] leading-snug ${!n.is_read ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'}`}>
                        {n.message}
                      </p>
                      <p className="text-[11px] font-semibold text-gray-300 mt-2 uppercase tracking-wide">
                        {formatTimeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  {!n.is_read && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-5">
                      <div className="w-2.5 h-2.5 bg-[#56AB2F] rounded-full shadow-[0_0_8px_rgba(86,171,47,0.4)]"></div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
