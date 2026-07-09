import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Onboarding } from './pages/Onboarding';
import { Login } from './pages/Login';
import { Quiz } from './pages/Quiz';
import { Dashboard } from './pages/Dashboard';
import { FoodSearch } from './pages/FoodSearch';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { AddMeal } from './pages/AddMeal';
import { WorkoutPlanner } from './pages/WorkoutPlanner';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { FoodScanner } from './pages/Scanner';
import { ScanResult } from './pages/ScanResult';
import { Notifications } from './pages/Notifications';
import { NotificationSettings } from './pages/NotificationSettings';
import { Account } from './pages/Account';
import { WorkoutSession } from './pages/WorkoutSession';
import { NotificationPrompt } from './components/NotificationPrompt';
import { ThemeProvider } from './context/ThemeContext';
import { Preferences } from './pages/Preferences';
import { AIChat } from './pages/AIChat';
import LandingPage from './pages/LandingPage';
import { AcceptInvite } from './pages/AcceptInvite';
import ActivateAccount from './pages/ActivateAccount';
import { Plans } from './pages/Plans';
import Checkout from './pages/Checkout';
import { Achievements } from './pages/Achievements';
import { Invitations } from './pages/Invitations';
import { Upgrade } from './pages/Upgrade';
import { ManualWorkoutCreator } from './pages/ManualWorkoutCreator';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import Welcome from './pages/Welcome';
import InfluencerAccept from './pages/InfluencerAccept';
import RenovarPlano from './pages/RenovarPlano';
import RegisterPassword from './pages/RegisterPassword';

// Admin Imports
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPlans from './pages/admin/AdminPlans';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminMRR from './pages/admin/AdminMRR';
import AdminCommunication from './pages/admin/AdminCommunication';
import AdminDishes from './pages/admin/AdminDishes';
import { AdminSupport } from './pages/admin/AdminSupport';
import { AdminThemeProvider } from './context/AdminThemeContext';
import AdminWorkouts from './pages/admin/AdminWorkouts';
import AdminFunnel from './pages/admin/AdminFunnel';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminAIConfig from './pages/admin/AdminAIConfig';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSocial from './pages/admin/AdminSocial';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isAuthenticated, isLoading, authLoading, checkOnboardingStatus, totalUsersCount } = useAuth();
  
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-[var(--bg-app)] transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Subscription & Block Check (ERRA 5, 6 & 9)
  const isBlocked = user?.is_blocked === true;
  const isExpired = user?.end_date && new Date(user.end_date) < new Date();
  
  // Free trial: 3 days from account creation
  const getDaysSinceCreation = () => {
    if (!user?.created_at) return 0;
    const date = new Date(user.created_at);
    if (isNaN(date.getTime())) return 0;
    return (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  };

  const daysSinceCreation = getDaysSinceCreation();
  const FREE_TRIAL_DAYS = 3;
  const isOnFreeTrial = daysSinceCreation < FREE_TRIAL_DAYS;

  const isServerActive = user?.subscription_status === 'ativo';
  const isUnderLimit = totalUsersCount > 0 ? totalUsersCount <= 20 : true;
  const isPromoActive = isServerActive || isUnderLimit || user?.is_early_adopter || isOnFreeTrial;
  
  const isInactive = !isPromoActive && (user?.subscription_status !== 'ativo' || isExpired) && user?.role !== 'admin' && !user?.is_influencer;
  
  const allowedWhenBlocked = ['/renovar-plano', '/checkout', '/plans', '/profile', '/account', '/quiz', '/onboarding'];
  const currentPath = window.location.pathname;

  if ((isBlocked || isInactive) && !allowedWhenBlocked.some(path => currentPath.startsWith(path))) {
    return <Navigate to="/renovar-plano" replace />;
  }

  // Onboarding Check: Force users to quiz if not completed
  const isOnboardingCompleted = checkOnboardingStatus();
  
  if (!isOnboardingCompleted && currentPath !== '/quiz' && !currentPath.startsWith('/quiz/') && currentPath !== '/onboarding' && user?.role !== 'admin') {
    return <Navigate to="/quiz" replace />;
  }

  return children;
};

const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading, authLoading, checkOnboardingStatus, user } = useAuth();
  
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-[var(--bg-app)] transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-[#56AB2F] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (!checkOnboardingStatus() && user?.role !== 'admin') {
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/quiz') || currentPath === '/onboarding') {
          return children;
        }
        return <Navigate to="/quiz" replace />;
    }
    if (user?.role === 'admin') {
        return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return children;
};

const AdminProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isAuthenticated, isLoading, authLoading } = useAuth();
  
  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-[var(--bg-app)] transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-[#56AB2F] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const RootRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-[var(--bg-app)]">
        <div className="w-12 h-12 border-4 border-[#56AB2F] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Se já estiver logado, redireciona conforme o papel
  if (isAuthenticated) {
    if (user?.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  // Se for PWA (standalone) mas não estiver logado, vai para o login (nunca mostra a página de vendas)
  if (isStandalone) {
    return <Navigate to="/login" replace />;
  }

  // Caso contrário (navegador + deslogado), mostra a tela de boas-vindas
  return <Welcome />;
};



import { LanguageProvider } from './context/LanguageContext';

import { QuizProvider } from './context/QuizContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
      <LanguageProvider>
      <QuizProvider>
      <ThemeProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/onboarding" element={<PublicRoute><Onboarding /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/quiz/*" element={<PublicRoute><Quiz /></PublicRoute>} />
          <Route path="/oferta" element={<LandingPage />} />
          <Route path="/activate" element={<PublicRoute><ActivateAccount /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
          <Route path="/accept-invite" element={<PublicRoute><AcceptInvite /></PublicRoute>} />
          <Route path="/register-password" element={<PublicRoute><RegisterPassword /></PublicRoute>} />
          <Route path="/checkout" element={<PublicRoute><Checkout /></PublicRoute>} />
          
          {/* Protected Routes */}
          {/* Main Entry Points */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/home" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/add-meal" element={<ProtectedRoute><FoodSearch /></ProtectedRoute>} />
          <Route path="/log-meal" element={<ProtectedRoute><AddMeal /></ProtectedRoute>} />
          <Route path="/workout" element={<ProtectedRoute><WorkoutPlanner /></ProtectedRoute>} />
          <Route path="/workout/manual" element={<ProtectedRoute><ManualWorkoutCreator /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="/scanner" element={<ProtectedRoute><FoodScanner /></ProtectedRoute>} />
          <Route path="/scan-result" element={<ProtectedRoute><ScanResult /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
          <Route path="/workout/session/:day" element={<ProtectedRoute><WorkoutSession /></ProtectedRoute>} />
          <Route path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />
          <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
          <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
          <Route path="/convites" element={<ProtectedRoute><Invitations /></ProtectedRoute>} />
          <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
          <Route path="/renovar-plano" element={<RenovarPlano />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminProtectedRoute><AdminThemeProvider><AdminLayout /></AdminThemeProvider></AdminProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="workouts" element={<AdminWorkouts />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="mrr" element={<AdminMRR />} />
            <Route path="funnel" element={<AdminFunnel />} />
            <Route path="notifications" element={<AdminCommunication />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="dishes" element={<AdminDishes />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="ai-config" element={<AdminAIConfig />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="social" element={<AdminSocial />} />
          </Route>

          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <NotificationPrompt />
        <PWAInstallPrompt />
        <Toaster position="top-center" />
        </BrowserRouter>
      </ThemeProvider>
      </QuizProvider>
      </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
