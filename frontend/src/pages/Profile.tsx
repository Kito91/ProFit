import React, { useEffect, useState } from 'react';
import { User, Bell, ChevronRight, Settings, Shield, HelpCircle, LogOut, Award, Target, Scale, Ruler, Calendar, ArrowLeft, Edit2, Weight, Gift } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { api, getImagePath } from '../services/api';
import { supabaseAuth } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationModal } from '../components/NotificationModal';
import { useLanguage } from '../context/LanguageContext';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { notificationService } from '../services/notificationService';

export const Profile = () => {
  const { langData } = useLanguage();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showEnableModal, setShowEnableModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.user.getProfile();
        setProfile(data);
      } catch (err) {
        console.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await api.user.uploadProfilePhoto(file);
      setProfile({ ...profile, profile_photo: result.profile_photo });
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const handleLogout = async () => {
    try {
      logout();
    } catch(err) {
      console.error(err);
    }
  };

  const handleToggleNotifications = async () => {
    const browserPermission = notificationService.getPermissionStatus();

    if (profile?.notifications_enabled && browserPermission === 'granted') {
      setShowDisableModal(true);
    } else {
      confirmEnableNotifications();
    }
  };

  const confirmEnableNotifications = async () => {
    try {
      const success = await notificationService.subscribe();
      if (success) {
        setProfile({ ...profile, notifications_enabled: true });
      } else {
        setProfile({ ...profile, notifications_enabled: false });
        console.log("Permission denied or failed to subscribe");
      }
    } catch (err) {
      console.error("Failed to enable notifications", err);
    } finally {
      setShowEnableModal(false);
    }
  };

  const confirmDisableNotifications = async () => {
    try {
      await notificationService.unsubscribe();
      setProfile({ ...profile, notifications_enabled: false });
    } catch (err) {
      console.error(err);
    } finally {
      setShowDisableModal(false);
    }
  };

  const MenuItem = ({ icon: Icon, title, subtitle, color = "text-[var(--text-muted)]", onClick, rightElement }: any) => (
    <button 
      onClick={onClick}
      className="w-full flex justify-between items-center py-4 bg-[var(--bg-container)] active:scale-[0.98] transition-all last:border-none border-b border-[var(--border-main)] group"
    >
      <div className="flex items-center space-x-4">
        <div className={`w-10 h-10 rounded-2xl bg-white/[0.06] flex items-center justify-center ${color} transition-colors`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
          <p className="font-bold text-[var(--text-main)] text-[15px] leading-snug">{title}</p>
          {subtitle && <p className="text-[12px] text-[var(--text-muted)] font-medium">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {rightElement}
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--text-muted)] transition-colors" />
      </div>
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="main-wrapper bg-[var(--bg-app)]">
      <div className="app-container pb-32 bg-transparent shadow-none border-none">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 z-40 bg-[var(--bg-app)]/90 backdrop-blur-sm">
        <div className="flex-1 flex justify-start">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-[var(--bg-container)] rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] active:scale-95 transition-all text-[var(--text-main)] hover:text-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex justify-center">
          <h1 className="text-[20px] font-black text-[var(--text-main)] tracking-tight">{langData.profile_title}</h1>
        </div>
        <div className="flex-1 flex justify-end">
          <button 
            onClick={() => navigate('/convites')}
            className="w-10 h-10 bg-[var(--bg-card)] rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] active:scale-95 transition-all text-[#56AB2F] hover:text-[#4a9328]"
          >
            <Gift className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-6">
        <motion.div
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
        >
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="relative mb-4">
              <input 
                type="file" 
                id="profile-upload" 
                className="hidden" 
                accept="image/*"
                onChange={handlePhotoUpload}
              />
              <label htmlFor="profile-upload" className="block cursor-pointer group">
                <motion.div 
                  whileTap={{ scale: 0.95 }}
                  className="w-[110px] h-[110px] rounded-full border-4 border-[#56AB2F] p-0.5 shadow-[0_8px_20px_rgba(86,171,47,0.15)] relative bg-[var(--bg-container)]"
                >
                  <div className="w-full h-full rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-4xl overflow-hidden relative">
                    {(profile?.avatar_url || profile?.profile_photo) ? (
                      <img 
                        src={getImagePath(profile?.avatar_url || profile?.profile_photo)} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-gray-300" />
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Edit2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="absolute right-0 bottom-0 w-8 h-8 bg-[var(--bg-card)] rounded-full border border-[var(--border-main)] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.1)] text-[var(--text-muted)]">
                    <Edit2 className="w-3.5 h-3.5 ml-0.5" />
                  </div>
                </motion.div>
              </label>
            </div>
            
            <h2 className="text-[22px] font-black text-[var(--text-main)] leading-tight">
              {profile?.name || profile?.first_name ? `${profile.first_name || profile.name} ${profile.last_name || ''}`.trim() : langData.profile_name_placeholder}
            </h2>
            
               <div className="inline-flex items-center justify-center space-x-1.5 mt-2 px-4 py-1.5 bg-[#A8E063]/15 rounded-full relative">
                 <Target className="w-3.5 h-3.5 text-[#56AB2F]" />
                 <span className="text-[10px] font-bold text-[#56AB2F] uppercase tracking-wider">{profile?.goal || langData.profile_goal_default}</span>
                 {profile?.plan_status === 'ativo' && (
                   <div className="absolute -top-2 -right-2 bg-[#56AB2F] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-lg shadow-emerald-200 animate-pulse">
                     PRO
                   </div>
                 )}
               </div>
          </div>

          {/* Body Metrics Cards Grid */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-[var(--bg-container)] rounded-[20px] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col items-center hover:scale-[1.02] transition-transform border border-[var(--border-main)]">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center mb-2">
                 <Weight className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1 text-center">{langData.profile_weight}</span>
              <span className="text-[17px] font-black text-[var(--text-main)] leading-none">{profile?.weight ? `${profile.weight} kg` : '--'}</span>
            </div>
            <div className="bg-[var(--bg-container)] rounded-[20px] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col items-center hover:scale-[1.02] transition-transform border border-[var(--border-main)]">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center mb-2">
                 <Ruler className="w-4 h-4 text-orange-400" />
              </div>
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1 text-center">{langData.profile_height}</span>
              <span className="text-[17px] font-black text-[var(--text-main)] leading-none">{profile?.height ? `${profile.height} cm` : '--'}</span>
            </div>
            <div className="bg-[var(--bg-container)] rounded-[20px] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col items-center hover:scale-[1.02] transition-transform border border-[var(--border-main)]">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center mb-2">
                 <Calendar className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1 text-center">{langData.profile_age}</span>
              <span className="text-[17px] font-black text-[var(--text-main)] leading-none">{profile?.age ? `${profile.age} ${langData.profile_years}` : '--'}</span>
            </div>
          </div>

          {/* Settings List */}
          <div className="bg-[var(--bg-container)] rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.03)] px-5 py-2 mb-8 border border-[var(--border-main)]">
            <MenuItem 
              icon={Bell} 
              title={langData.profile_menu_notifications} 
              subtitle={langData.profile_menu_notifications_desc} 
              color="text-green-500" 
              onClick={handleToggleNotifications}
              rightElement={
                <span className={`text-[12px] font-bold ${profile?.notifications_enabled ? 'text-[#56AB2F]' : 'text-[var(--text-muted)]'}`}>
                  {profile?.notifications_enabled ? langData.profile_notif_enabled : langData.profile_notif_disabled}
                </span>
              }
            />
            <MenuItem 
              icon={Award} 
              title={langData.profile_menu_achievements} 
              subtitle={langData.profile_menu_achievements_desc} 
              color="text-[#56AB2F]" 
              onClick={() => navigate('/achievements')}
            />
            <MenuItem 
              icon={HelpCircle} 
              title={langData.profile_menu_ai_chat} 
              subtitle={langData.profile_menu_ai_chat_desc} 
              color="text-blue-500" 
              onClick={() => navigate('/ai-chat')}
            />
            <MenuItem 
              icon={Settings} 
              title={langData.profile_menu_preferences} 
              subtitle={langData.profile_menu_preferences_desc} 
              color="text-purple-500" 
              onClick={() => navigate('/preferences')}
            />
            <MenuItem 
              icon={User} 
              title={langData.profile_menu_account} 
              subtitle={langData.profile_menu_account_desc} 
              color="text-orange-500" 
              onClick={() => navigate('/account')}
            />
          </div>

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-3 py-4 bg-red-500/10 text-red-400 rounded-[24px] font-bold text-[14px] uppercase tracking-widest active:scale-95 transition-all mb-4 border border-red-500/15 hover:bg-red-500/15"
          >
            <LogOut className="w-5 h-5" />
            <span>{langData.profile_logout}</span>
          </button>
        </motion.div>
      </div>

      <BottomNav />
      
      {/* Modals */}
      <NotificationModal 
        isOpen={showDisableModal}
        title={langData.profile_modal_notif_title}
        message={langData.profile_modal_notif_msg}
        confirmLabel={langData.profile_modal_confirm}
        cancelLabel={langData.profile_modal_cancel}
        onClose={() => setShowDisableModal(false)}
        onConfirm={confirmDisableNotifications}
      />
      </div>
    </div>
  );
};
