import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Bell, MoreVertical, Droplets, Footprints, Camera, Target, Flame, Clock, Crown, Sparkles, Trash2, Edit3, AlertCircle, X, UserPlus, Gift, CheckCircle2, User, Star } from 'lucide-react';
import { AppLayout } from '../components/AppLayout';
import { BottomNav } from '../components/BottomNav';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api, getImagePath } from '../services/api';
import { socketService } from '../services/socket';

import { CalendarModal } from '../components/CalendarModal';
import { EditMealModal } from '../components/EditMealModal';
import { InviteModal } from '../components/InviteModal';
import { PremiumBanner } from '../components/PremiumBanner';
import { MilestonePopUp } from '../components/MilestonePopUp';
import { appService } from '../services/appService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import { NotificationCenter } from '../components/NotificationCenter';
import { formatMaputoTime, formatMaputoLongDate, getMaputoNow, isMaputoToday, getMaputoDayName } from '../utils/dateUtils';
import { notificationService } from '../services/notificationService';


const formatDateHeader = (date: Date, langData: any) => {
  const nowMaputo = getMaputoNow().toDate();
  if (date.getDate() === nowMaputo.getDate() && date.getMonth() === nowMaputo.getMonth() && date.getFullYear() === nowMaputo.getFullYear()) {
    return langData.dash_today;
  }
  return formatMaputoLongDate(date);
};

const CalendarSlider = ({ selectedDate, onSelectDate, onOpenCalendar }: { selectedDate: Date, onSelectDate: (d: Date) => void, onOpenCalendar: () => void }) => {
  const { langData } = useLanguage();
  const dayLabels = langData.dash_days_short;
  const [calendarDays, setCalendarDays] = useState<{date: Date, day: string, dayNum: number}[]>([]);

  useEffect(() => {
    const now = getMaputoNow().toDate();
    now.setHours(0, 0, 0, 0);
    const generated = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      generated.push({
        date: d,
        day: dayLabels[d.getDay()],
        dayNum: d.getDate()
      });
    }
    setCalendarDays(generated);
  }, []);

  return (
    <div className="bg-[var(--bg-accent-soft)] rounded-[32px] p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <div 
          onClick={onOpenCalendar}
          className="flex items-center space-x-2 cursor-pointer active:scale-95 transition-transform bg-[var(--bg-app)]/50 px-3 py-1.5 rounded-full shadow-sm"
        >
          <span className="font-bold text-lg text-[var(--text-main)]">{formatDateHeader(selectedDate, langData)}</span>
          <ChevronRight className="w-4 h-4 text-[var(--text-main)] rotate-90" />
        </div>
        <div className="flex space-x-2">
          <button className="w-8 h-8 flex justify-center items-center bg-[var(--bg-card)] rounded-full shadow-sm active:scale-95 transition-all text-[var(--text-main)]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex justify-center items-center border-2 border-[var(--border-main)] bg-[var(--bg-app)]/50 rounded-full cursor-not-allowed">
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>
      <div className="flex justify-between items-end">
        {calendarDays.map((item, i) => {
          const isSelected = selectedDate.getDate() === item.date.getDate() && selectedDate.getMonth() === item.date.getMonth() && selectedDate.getFullYear() === item.date.getFullYear();
          const isToday = i === 6;
          return (
            <div 
              key={i} 
              onClick={() => onSelectDate(item.date)}
              className="flex flex-col items-center group cursor-pointer active:scale-95 transition-all"
            >
              <span translate="no" className={`text-[11px] font-bold mb-3 ${isSelected ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                {item.day}
              </span>
              <div className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 relative ${
                isSelected 
                  ? 'bg-gradient-to-r from-[#22C55E] to-[#22C55E] shadow-md shadow-primary/20 text-white' 
                  : 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm'
              }`}>
                <span className={`text-sm font-bold`}>{item.dayNum}</span>
                {isToday && !isSelected && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-[#56AB2F] rounded-full"></div>
                )}
                {isToday && isSelected && (
                  <div className="absolute top-1 right-1 w-2 border border-white h-2 bg-gradient-to-r from-[#22C55E] to-[#22C55E] rounded-full"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};





const SummaryCard = ({ total, target, summary, meals, weeklyData, dailyTotals }: any) => {
  const { langData } = useLanguage();
  const safeTarget = target > 0 ? target : 2000;
  const percent = Math.min((total / safeTarget) * 100, 100);
  
  // 1. Use backend aggregate if available
  // 2. Fallback: Calculation from summary grouping
  // 3. Last resort: Sum the meals array directly (most robust)
  let protein = dailyTotals?.protein || (summary || []).reduce((acc: number, s: any) => acc + (Number(s.protein) || 0), 0);
  let carbs = dailyTotals?.carbs || (summary || []).reduce((acc: number, s: any) => acc + (Number(s.carbs) || 0), 0);
  let fat = dailyTotals?.fat || (summary || []).reduce((acc: number, s: any) => acc + (Number(s.fat) || 0), 0);
  
  // If we have meals but macros are still 0, it means the summary query might have mismatched dates
  // but the meals list matches (or vice versa). Let's sum from meals as a hard fallback.
  if (protein === 0 && carbs === 0 && fat === 0 && Array.isArray(meals) && meals.length > 0) {
    meals.forEach((m: any) => {
      protein += (Number(m.protein) || 0);
      carbs += (Number(m.carbs) || 0);
      fat += (Number(m.fat) || 0);
    });
  }

  const days = langData.dash_days_short;
  const todayIndex = getMaputoNow().day();

  return (
    <div className="card-premium mb-8">
      {/* Header Info */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-[var(--bg-accent-soft)] rounded-2xl flex items-center justify-center text-[#56AB2F]">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-black text-[var(--text-main)] leading-none">{total}</span>
              <span className="text-sm font-bold text-[var(--text-muted)]">kcal</span>
            </div>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{langData.dash_consumed_today}</p>
          </div>
        </div>
        <div className="text-right pt-1">
          <p className="text-[13px] font-medium text-[var(--text-muted)]">{langData.dash_goal}: <span className="font-bold text-[var(--text-main)]">{target}</span> kcal</p>
          <div className="mt-1 inline-flex items-center px-2 py-0.5 bg-[var(--bg-accent-soft)] rounded-full">
            <span className="text-[10px] font-black text-[#56AB2F]">{Math.round(percent)}% {langData.dash_of_goal}</span>
          </div>
        </div>
      </div>

      {/* Vertical Chart Section */}
      <div className="flex justify-between items-end h-32 mb-8 px-1 relative">
        {/* Target dashed line */}
        <div className="absolute top-[30%] left-0 w-full border-t border-dashed border-[var(--border-main)]/30 z-0"></div>
        
        {days.map((day: any, i: number) => {
          const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
          const dayData = (weeklyData || []).find((d: any) => d?.day?.toLowerCase() === dayKeys[i]) || { calories: 0 };
          const isActive = i === todayIndex;
          const calories = Number(dayData?.calories) || 0;
          const safeTarget = target > 0 ? target : 2000;
          const barHeight = Math.min((calories / safeTarget) * 100, 100);
          const barPercent = Math.round(barHeight);

          return (
            <div key={i} className="flex flex-col items-center flex-1 h-full relative z-10">
              {barPercent > 0 && (
                <div className={`absolute -top-7 ${isActive ? 'bg-[#1A1A1A] scale-110 z-20' : 'bg-gray-400/20 text-[var(--text-muted)] scale-90'} text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow-sm transition-all`}>
                  {barPercent}%
                  {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1A1A1A] rotate-45"></div>}
                </div>
              )}
              <div className="w-[16px] bg-[var(--bg-surface)] rounded-full flex-1 mb-2 relative overflow-hidden flex flex-col justify-end border border-[var(--border-main)]/20 shadow-inner">
                <motion.div 
                   initial={{ height: 0 }}
                   animate={{ height: `${barHeight}%` }}
                   transition={{ duration: 1, ease: "easeOut", delay: i * 0.05 }}
                   className={`w-full rounded-full ${isActive ? 'bg-gradient-to-t from-[#22C55E] to-[#4ADE80] shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-[var(--bg-accent-soft)] opacity-40'}`}
                />
              </div>
              <span translate="no" className={`text-[9px] font-bold uppercase tracking-tighter ${isActive ? 'text-[var(--text-main)] font-black' : 'text-[var(--text-muted)] opacity-50'}`}>{day}</span>
            </div>
          );
        })}
      </div>


      {/* Macros Row */}
      <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[var(--border-main)]">
        <div className="bg-[var(--bg-orange-soft)] rounded-2xl p-3 text-center">
          <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">{langData.dash_protein}</p>
          <p className="text-base font-black text-[var(--text-main)]">{Math.round(Number(protein) || 0)}g</p>
        </div>
        <div className="bg-[var(--bg-blue-soft)] rounded-2xl p-3 text-center">
          <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">{langData.dash_carbs}</p>
          <p className="text-base font-black text-[var(--text-main)]">{Math.round(Number(carbs) || 0)}g</p>
        </div>
        <div className="bg-[var(--bg-red-soft)] rounded-2xl p-3 text-center">
          <p className="text-[10px] font-bold text-red-400 uppercase mb-1">{langData.dash_fat}</p>
          <p className="text-base font-black text-[var(--text-main)]">{Math.round(Number(fat) || 0)}g</p>
        </div>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { langData } = useLanguage();
  const { totalUsersCount, user } = useAuth();
  const [recentMeals, setRecentMeals] = useState<any[]>([]);
  const [userName, setUserName] = useState(langData.PT ? 'Usuário' : 'User');
  const [userGoal, setUserGoal] = useState('');
  const [meals, setMeals] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [steps, setSteps] = useState(0);
  const [water, setWater] = useState(0);
  const [totalToday, setTotalToday] = useState(0);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [profile, setProfile] = useState<any>(null);
  const [calorieHistory, setCalorieHistory] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getMaputoNow().toDate());
  const [dailyCache, setDailyCache] = useState<Record<string, any>>({});
  const [dailyTotals, setDailyTotals] = useState<any>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [activeWorkout, setActiveWorkout] = useState<any>(null);
  const [mealToDelete, setMealToDelete] = useState<string | null>(null);
  const [appStatus, setAppStatus] = useState({ totalUsers: 0, monetizationEnabled: false });
  const [showMilestone, setShowMilestone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    api.subscription.getStatus().then((s: any) => {
      setIsTrial(s?.is_trial ?? false);
      setTrialDaysLeft(typeof s?.trial_days_left === 'number' ? s.trial_days_left : null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      const status = await appService.getStatus();
      setAppStatus(status);
      
      const milestoneSeen = localStorage.getItem('milestone_20_users_seen');
      if (status.monetizationEnabled && !milestoneSeen) {
        setShowMilestone(true);
      }
    };
    fetchStatus();
  }, []);

  const handleCloseMilestone = () => {
    localStorage.setItem('milestone_20_users_seen', 'true');
    setShowMilestone(false);
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      // Don't set loading if we have cache, unless it's today (to ensure fresh scan results)
      const dateStr = [
        selectedDate.getFullYear(),
        String(selectedDate.getMonth() + 1).padStart(2, '0'),
        String(selectedDate.getDate()).padStart(2, '0')
      ].join('-');
      const isToday = isMaputoToday(selectedDate);

      if (!dailyCache[dateStr] || isToday) {
        setIsLoading(true);
      }

      try {
        const data = await api.user.getDashboardBootstrap(dateStr);
        
        // Populate all states from the single bootstrap response
        setProfile(data.profile);
        const fullName = data.profile?.name || data.profile?.first_name;
        if (fullName) {
          setUserName(fullName.split(' ')[0]);
        }
        setTargetCalories(Number(data.profile.daily_calorie_target) || 2000);
        setUserGoal(data.profile.goal || '');
        setUnreadNotifications(data.unreadNotificationsCount);
        setRecentMeals(data.recentMeals);
        setWeeklyData(data.weeklyStats);
        setActiveWorkout(data.activeWorkout);

        const ds = data.dailySummary;
        setSummary(ds.summary || []);
        setMeals(ds.meals || []);
        setSteps(ds.steps || 0);
        setWater(ds.water || 0);
        setDailyTotals(ds.totals || null);
        
        const total = ds.totals?.calories || (ds.summary || []).reduce((acc: number, item: any) => acc + (Number(item.calories) || 0), 0);
        setTotalToday(total);
        
        setDailyCache(prev => ({ ...prev, [dateStr]: ds }));

        // Only show prompt on initial mount (if needed)
        const promptDismissed = localStorage.getItem('notification_prompt_dismissed');
        if (data.profile && (data.profile.notifications_enabled === false || data.profile.notifications_enabled === null) && !promptDismissed) {
          setShowNotificationPrompt(true);
        }
      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        // We only show full error screen if we don't have cached data
        if (!dailyCache[dateStr]) {
          setError(err.message || langData.dash_load_error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Separate effect for one-time setup (sockets, events) - must come after refreshData is defined above
  useEffect(() => {
    
    socketService.connect();
    
    // Socket Integration
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'undefined' && userStr !== 'null') {
        try {
          const user = JSON.parse(userStr);
          if (user && user.id) {
            socketService.connect();
            const socket = socketService.getSocket();
            
            socket?.emit('join_user', user.id);
  
            socket?.on('new_notification', (notif: any) => {
                setUnreadNotifications(prev => prev + 1);
                console.log('New notification received:', notif);
            });
  
            socket?.on('meal_added', (data: any) => {
                console.log('Real-time sync: Meal added, refreshing...', data);
                refreshData();
            });

            socket?.on('workout_plan_added', (data: any) => {
                console.log('Real-time sync: Workout plan added, refreshing...', data);
                refreshData();
            });
          }
        } catch (parseError) {
          console.error("Failed to parse user from localStorage", parseError);
        }
      }
    } catch (e) {
      console.error("Socket connection failed", e);
    }

    // Refresh on focus / visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App became visible, refreshing data...');
        refreshData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshData);

    return () => {
        socketService.disconnect();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', refreshData);
    };
  }, []);

  // Define refreshData before the effects that reference it
  const refreshData = async () => {
    const dateStr = [
      selectedDate.getFullYear(),
      String(selectedDate.getMonth() + 1).padStart(2, '0'),
      String(selectedDate.getDate()).padStart(2, '0')
    ].join('-');
    
    try {
      const data = await api.user.getDashboardBootstrap(dateStr);
      
      setProfile(data.profile);
      setRecentMeals(data.recentMeals);
      setWeeklyData(data.weeklyStats);
      
      const ds = data.dailySummary;
      setSummary(ds.summary || []);
      setMeals(ds.meals || []);
      setSteps(ds.steps || 0);
      setWater(ds.water || 0);
      setDailyTotals(ds.totals || null);
      
      const total = ds.totals?.calories || (ds.summary || []).reduce((acc: number, item: any) => acc + (Number(item.calories) || 0), 0);
      setTotalToday(total);
      setUnreadNotifications(data.unreadNotificationsCount);
      
      setDailyCache(prev => ({ ...prev, [dateStr]: ds }));
    } catch (err) {
      console.error("Failed to refresh data", err);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const success = await notificationService.subscribe();
      
      if (success) {
        console.log('[Dashboard] Native notifications activated successfully');
        localStorage.setItem('notification_prompt_dismissed', 'true');
        setShowNotificationPrompt(false);
      } else {
        console.warn('[Dashboard] Could not activate native push');
      }
    } catch (err) {
      console.error("Failed to enable notifications", err);
      setShowNotificationPrompt(false);
    }
  };

  const handleDismissNotifications = () => {
    localStorage.setItem('notification_prompt_dismissed', 'true');
    setShowNotificationPrompt(false);
  };

  const handleEditMeal = (meal: any) => {
    setSelectedMeal(meal);
    setIsEditModalOpen(true);
  };

  const handleSaveMeal = async (id: string, data: any) => {
    try {
      await api.meals.update(id, data);
      await refreshData();
    } catch (err) {
      console.error("Failed to update meal", err);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      await api.meals.delete(id);
      await refreshData();
      setMealToDelete(null);
    } catch (err) {
      console.error("Failed to delete meal", err);
    }
  };

  const getMealTotal = (type: string) => {
    if (!summary || !Array.isArray(summary)) return 0;
    const meal = summary.find(s => s && s.meal_type && s.meal_type.toLowerCase() === (type || '').toLowerCase());
    return meal ? Number(meal.calories) || 0 : 0;
  };

  const CoachMessageCard = ({ workout }: { workout: any }) => {
    if (!workout || !workout.structured_plan || workout.goal === 'Manual') return null;
    const plan = typeof workout.structured_plan === 'string' ? JSON.parse(workout.structured_plan) : workout.structured_plan;
    const [showAnalysis, setShowAnalysis] = useState(false);
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium mb-8 border-2 border-[#56AB2F]/10 relative overflow-hidden"
      >
        <div className="flex items-start space-x-4 relative z-10">
          <div className="w-14 h-14 bg-gradient-to-br from-[#22C55E] to-[#22C55E] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 flex-shrink-0">
            <UserPlus className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-[#22C55E] uppercase tracking-widest bg-[var(--bg-accent-soft)] px-2 py-0.5 rounded-md">Master Coach IA</span>
              {workout.body_analysis && (
                <button 
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100 transition-colors"
                >
                  {showAnalysis ? langData.dash_analysis_message : langData.dash_body_analysis}
                </button>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              {showAnalysis && workout.body_analysis ? (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-2"
                >
                  <p className="text-[var(--text-main)] font-bold text-sm leading-relaxed">
                    {workout.body_analysis}
                  </p>
                  <div className="flex items-center text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {langData.dash_ai_vision}
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key="message"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-[var(--text-main)] font-bold text-base leading-tight"
                >
                  "{plan.message || plan.title}"
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#56AB2F]/5 to-transparent rounded-full -mr-16 -mt-16 blur-2xl"></div>
      </motion.div>
    );
  };

  const WorkoutCard = ({ workout }: { workout: any }) => {
    if (!workout) {
      return (
        <div className="card-premium border border-[var(--border-main)] text-center mb-8">
           <div className="w-16 h-16 bg-[var(--bg-app)] rounded-full flex items-center justify-center mx-auto mb-4">
             <Clock className="w-8 h-8 text-[var(--text-muted)]" />
           </div>
           <p className="text-[var(--text-muted)] font-bold mb-4">Você ainda não tem um plano de treino.</p>
           <button 
             onClick={() => navigate('/workout')}
             className="px-6 py-2 bg-[#22C55E] text-white rounded-xl font-bold shadow-md shadow-primary/10"
           >
             Criar meu plano
           </button>
        </div>
      );
    }

    const plan = typeof workout.structured_plan === 'string' ? JSON.parse(workout.structured_plan) : workout.structured_plan;
    const capitalizedTodayName = getMaputoDayName(getMaputoNow().toDate());
    
    // Find today's workout in daily_workouts.
    // GPT sometimes returns "segunda-feira" or "Segunda-feira".
    const todayWorkout = plan.daily_workouts?.find((w: any) => 
      w.day.toLowerCase() === capitalizedTodayName.toLowerCase() || 
      w.day.toLowerCase().includes(capitalizedTodayName.toLowerCase())
    );

    return (
      <div 
        onClick={() => navigate('/workout')}
        className="bg-[var(--bg-card)] rounded-[32px] p-6 shadow-xl mb-8 border border-white/5 relative overflow-hidden group cursor-pointer"
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[10px] font-black text-[#22C55E] uppercase tracking-[0.2em]">{langData.dash_workout_today}</span>
              <h3 className="text-white text-xl font-black mt-1">{todayWorkout?.muscles || (langData.PT ? 'Descanso Ativo' : 'Active Rest')}</h3>
            </div>
            <div className="w-10 h-10 bg-[var(--bg-card)]/10 rounded-xl flex items-center justify-center text-[#22C55E]">
              <Target className="w-6 h-6" />
            </div>
          </div>
          
          {todayWorkout ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1 bg-[var(--bg-card)]/10 rounded-lg">
                  <span className="text-white/60 text-[10px] font-bold block uppercase tracking-wider">{langData.dash_workout_exercises}</span>
                  <span className="text-white font-black">{todayWorkout.exercises?.length || 0}</span>
                </div>
                <div className="px-3 py-1 bg-[var(--bg-card)]/10 rounded-lg">
                  <span className="text-white/60 text-[10px] font-bold block uppercase tracking-wider">{langData.dash_workout_focus}</span>
                  <span className="text-white font-black truncate max-w-[120px] inline-block">{todayWorkout.muscles}</span>
                </div>
              </div>
              {todayWorkout.coach_tip && (
                <p className="text-white/40 text-[11px] font-medium italic">"{todayWorkout.coach_tip}"</p>
              )}
            </div>
          ) : (
            <p className="text-white/60 text-sm font-bold">{langData.dash_workout_rest}</p>
          )}

          <div className="mt-6 flex items-center text-[#22C55E] text-sm font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">
            {langData.dash_workout_view_all}
            <ChevronRight className="w-4 h-4 ml-1" />
          </div>
        </div>
        {/* Background glow */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#22C55E]/20 rounded-full blur-[80px] group-hover:bg-[#22C55E]/30 transition-colors"></div>
      </div>
    );
  };

  const RecentMealCard = ({ meal }: { meal: any }) => {
    const formattedTime = formatMaputoTime(meal.created_at || getMaputoNow().toDate());
    const imageSource = meal?.image_url ? getImagePath(meal.image_url) : null;
    
    return (
      <div className="card-premium mb-4 hover:shadow-md transition-all group">
        <div className="flex items-center space-x-4 mb-4 relative">
          <div className="w-[85px] h-[85px] rounded-[22px] overflow-hidden bg-[var(--bg-app)] flex-shrink-0 flex items-center justify-center border border-[var(--border-main)]">
            {imageSource ? (
              <img 
                src={imageSource} 
                alt={meal.meal_name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-3xl">🥗</span>';
                }}
              />
            ) : (
              <span className="text-3xl">🥗</span>
            )}
          </div>
          <div className="flex-grow">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-black text-[var(--text-main)] line-clamp-1 text-base tracking-tight">{meal.meal_name}</h4>
              <div className="flex items-center space-x-2 shrink-0 ml-2">
                <span className="text-[10px] font-black text-[var(--text-muted)] bg-[var(--bg-surface)] px-2.5 py-1 rounded-full flex items-center uppercase tracking-widest">
                  <Clock className="w-3 h-3 mr-1" />
                  {formattedTime}
                </span>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditMeal(meal)}
                    className="w-7 h-7 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center active:scale-90 transition-all font-bold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setMealToDelete(meal.id)}
                    className="w-7 h-7 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center active:scale-90 transition-all font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 mb-3">
              <div className="flex items-center bg-[var(--bg-orange-soft)] px-2 py-0.5 rounded-md">
                <Flame className="w-3.5 h-3.5 text-[#22C55E] fill-current mr-1" />
                <span className="text-sm font-black text-[var(--text-main)]">{meal.calories}</span>
                <span className="text-[10px] font-bold text-[var(--text-muted)] ml-0.5">kcal</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
               <div className="flex items-center space-x-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                 <span className="text-[11px] font-bold text-[var(--text-main)]">{Math.round(meal.protein)}g {langData.dash_protein.toLowerCase()}</span>
               </div>
               <div className="flex items-center space-x-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                 <span className="text-[11px] font-bold text-[var(--text-main)]">{Math.round(meal.carbs)}g {langData.dash_carbs.toLowerCase()}</span>
               </div>
            </div>
          </div>

          <AnimatePresence>
            {mealToDelete === meal.id && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-x-0 inset-y-[-20px] bg-[var(--bg-card)]/95 backdrop-blur-sm z-20 flex items-center justify-between px-2"
              >
                <div className="flex items-center space-x-2">
                   <div className="w-8 h-8 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-[var(--text-main)]">{langData.dash_delete_meal}</span>
                </div>
                <div className="flex space-x-1">
                  <button onClick={() => setMealToDelete(null)} className="px-3 py-1.5 rounded-lg text-[var(--text-muted)] font-bold text-[10px] uppercase">{langData.dash_no}</button>
                  <button onClick={() => handleDeleteMeal(meal.id)} className="px-3 py-1.5 bg-rose-500 text-white rounded-lg font-bold text-[10px] uppercase shadow-md shadow-rose-500/20">{langData.dash_yes}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ingredients & Observations */}
        <div className="space-y-3 pt-4 border-t border-[var(--border-main)]">
          {(() => {
            try {
              const ingredients = typeof meal.ingredients === 'string' ? JSON.parse(meal.ingredients) : meal.ingredients;
              if (Array.isArray(ingredients) && ingredients.length > 0) {
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {ingredients.map((ing: any, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-[var(--bg-app)] text-[var(--text-muted)] text-[10px] font-bold rounded-md uppercase tracking-wider border border-[var(--border-main)]">
                        {typeof ing === 'string' ? ing : ing.name}
                      </span>
                    ))}
                  </div>
                );
              }
            } catch (e) {
              return null;
            }
            return null;
          })()}
          
          {(meal.nutrition_observation || meal.recommendation) && (
            <div className="bg-[var(--bg-accent-soft)] p-3 rounded-2xl border border-[var(--border-main)]">
              <p className="text-[11px] text-[#22C55E] font-medium leading-relaxed italic">
                 "{meal.nutrition_observation || meal.recommendation}"
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const SkeletonLoader = () => (
    <div className="animate-pulse">
      <div className="mb-5 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="card-premium h-[140px] opacity-50">
            <div className="flex justify-between items-center mb-[10px]">
              <div className="h-6 w-32 bg-[var(--bg-skeleton)] rounded-lg"></div>
              <div className="h-5 w-5 bg-[var(--bg-skeleton)] rounded-full"></div>
            </div>
            <div className="h-8 w-24 bg-[var(--bg-skeleton)] rounded-lg mb-[10px]"></div>
            <div className="h-[10px] w-full bg-[var(--bg-skeleton)] rounded-[20px] mb-[12px]"></div>
            <div className="h-4 w-20 bg-[var(--bg-skeleton)] rounded-lg"></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-[var(--bg-card)] rounded-[22px] p-4 border border-[var(--border-main)] h-[120px]">
             <div className="flex justify-between items-start mb-4">
               <div className="h-5 w-20 bg-[var(--bg-skeleton)] rounded-lg"></div>
               <div className="w-8 h-8 rounded-full bg-[var(--bg-skeleton)]"></div>
             </div>
             <div className="h-8 w-16 bg-[var(--bg-skeleton)] rounded-lg"></div>
          </div>
        ))}
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-app)] p-6 text-center">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">{langData.dash_error_title}</h2>
        <p className="text-[var(--text-muted)] mb-6">{error}</p>
        <button 
          onClick={() => { setError(null); setIsLoading(true); window.location.reload(); }}
          className="btn-primary"
        >
          {langData.dash_retry}
        </button>
      </div>
    );
  }

  if (isLoading) return <SkeletonLoader />;

  return (
    <div className="main-wrapper">
      <div className="app-container pb-28 min-h-screen">
      <div className="px-6 pt-12">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm text-[var(--text-muted)] font-medium tracking-wide mb-1">
              {(() => {
                const hour = getMaputoNow().hour();
                if (hour >= 5 && hour < 12) return langData.dash_hello_morning;
                if (hour >= 12 && hour < 18) return langData.dash_hello_afternoon;
                return langData.dash_hello_night;
              })()} 👋
            </p>
            <div className="flex items-center space-x-2">
              <h1 className="text-[28px] font-bold text-[var(--text-main)] leading-tight">{userName}</h1>
              {profile?.subscription_status === 'ativo' && (profile?.plan === 'pro' || profile?.plan === 'premium') && (
                <div className="flex flex-col items-start mt-1">
                  <div className="plan-badge-pill">
                    {profile?.is_early_adopter || profile?.is_influencer ? 'FREE' : 'PRO'}
                  </div>
                  {profile?.plan_expiration && (
                    <span className="text-[8px] font-black text-[var(--text-muted)] mt-0.5 uppercase tracking-tighter">
                      {langData.dash_valid_until}: {new Date(profile.plan_expiration).toLocaleDateString(langData.PT ? 'pt-BR' : 'en-ZA')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <NotificationCenter />
          </div>
        </div>

        {/* Banner de Plano/Pagamento */}
        {(() => {
          const isPro = profile?.subscription_status === 'ativo' && (profile?.plan === 'pro' || profile?.plan === 'premium');
          const isInfluencer = profile?.is_influencer;

          // ── Free trial countdown ──────────────────────────────────────────
          const FREE_TRIAL_DAYS = 3;
          const createdAt = user?.created_at ? new Date(user.created_at) : null;
          const localDaysUsed = createdAt
            ? Math.floor((Date.now() - createdAt.getTime()) / 86_400_000)
            : FREE_TRIAL_DAYS;
          const daysLeft = trialDaysLeft !== null
            ? trialDaysLeft
            : Math.max(0, FREE_TRIAL_DAYS - localDaysUsed);
          const daysUsed = Math.max(0, FREE_TRIAL_DAYS - daysLeft);
          const isOnFreeTrial = (trialDaysLeft !== null ? isTrial : daysLeft > 0) && daysLeft > 0 && !isPro && !isInfluencer;

          if (isOnFreeTrial) {
            const barPct = Math.min(100, (daysUsed / FREE_TRIAL_DAYS) * 100);
            return (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-6 rounded-3xl p-4 bg-amber-500/10 border border-amber-500/20 cursor-pointer active:scale-[0.98] transition-all"
                onClick={() => navigate('/plans')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-amber-400 leading-tight">
                      Teste gratuito — {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Assine o Pro para manter o acesso</p>
                  </div>
                  <span className="text-[11px] font-black text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                    Ver Planos
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-amber-400 rounded-full"
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-slate-600">Dia 1</span>
                  <span className="text-[9px] text-slate-600">Dia {FREE_TRIAL_DAYS}</span>
                </div>
              </motion.div>
            );
          }

          // ── Not Pro (trial expired or never started) ──────────────────────
          if (!isPro && !isInfluencer) {
            return (
              <div className="mb-8">
                <PremiumBanner onUpgrade={() => navigate('/plans')} />
              </div>
            );
          }

          // ── Pro with expiration soon ──────────────────────────────────────
          if (isPro && profile?.plan_expiration) {
            const expDate = new Date(profile.plan_expiration);
            const diffDays = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 3 && diffDays > 0) {
              return (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 rounded-3xl p-4 bg-amber-500/10 border border-amber-500/20 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
                  onClick={() => navigate('/plans')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                      <AlertCircle size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="font-bold text-amber-400 text-[14px] leading-tight">
                        {langData.dash_plan_expires_in} {diffDays} {diffDays === 1 ? langData.dash_day : langData.dash_days}
                      </p>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">{langData.dash_renew_now}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-amber-400 flex-shrink-0" />
                </motion.div>
              );
            }
          }

          return null;
        })()}



        {/* content sections animated up */}
        <motion.div
           initial={{ opacity: 0, y: 15 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
           key={selectedDate.toISOString()} // Force re-animation when date changes
        >
          <CalendarSlider 
            selectedDate={selectedDate} 
            onSelectDate={setSelectedDate} 
            onOpenCalendar={() => setIsCalendarOpen(true)} 
          />

          <CoachMessageCard workout={activeWorkout} />
          <WorkoutCard workout={activeWorkout} />

          {isLoading ? (
            <SkeletonLoader />
          ) : (
            <>
              <SummaryCard 
                total={totalToday} 
                target={targetCalories} 
                summary={summary} 
                meals={meals}
                goal={userGoal} 
                weeklyData={weeklyData}
                dailyTotals={dailyTotals}
              />

              <div className="mt-8 mb-8">
                <div className="flex justify-between items-center px-2 mb-4">
                  <h3 className="text-lg font-black text-[var(--text-main)]">{langData.dash_meals_title}</h3>
                  <button className="text-sm font-bold text-[#22C55E]" onClick={() => navigate('/history')}>{langData.dash_view_all}</button>
                </div>
                
                {recentMeals.length > 0 ? (
                  <div className="space-y-3">
                    {recentMeals.slice(0, 3).map((meal, idx) => (
                      <RecentMealCard key={meal.id || idx} meal={meal} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-[var(--bg-card)] rounded-[32px] p-8 border border-[var(--border-main)] text-center">
                    <p className="text-[var(--text-muted)] text-sm font-bold">{langData.dash_no_meals}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>

      <CalendarModal 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
        selectedDate={selectedDate} 
        onSelectDate={(d) => {
          setSelectedDate(d);
          setIsCalendarOpen(false);
        }} 
      />

      <EditMealModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveMeal}
        meal={selectedMeal}
      />

      <InviteModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      <MilestonePopUp 
        isOpen={showMilestone}
        onClose={handleCloseMilestone}
      />

      <BottomNav />
      </div>
    </div>
  );
};
