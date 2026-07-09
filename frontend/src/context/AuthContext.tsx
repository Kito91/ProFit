import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { supabaseAuth } from '../services/auth';

interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  goal?: string;
  activity_level?: string;
  target_weight?: number;
  daily_calorie_target?: number;
  profile_photo?: string;
  plan_type?: string;
  referral_code?: string;
  total_referrals?: number;
  paying_referrals_count?: number;
  discount_earned?: boolean;
  discount_used?: boolean;
  active_discounts?: Array<{ id: string; percentage: number; is_used: boolean }>;
  role?: string;
  onboarding_completed?: boolean;
  theme_preference?: 'light' | 'dark' | 'system';
  ai_language?: 'auto' | 'pt' | 'en';
  plan_status?: 'active' | 'inactive';
  plan_expiration?: string;
  plan?: 'free' | 'pro' | 'premium';
  subscription_status?: string;
  end_date?: string;
  is_blocked?: boolean;
  is_early_adopter?: boolean;
  is_influencer?: boolean;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  authLoading: boolean;
  isAuthenticated: boolean;
  totalUsersCount: number;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, referralCode?: string, extraData?: any) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  checkOnboardingStatus: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  const normalizeApiError = (error: any) => {
    if (!error) return { status: null, message: 'Unknown error' };
    if (typeof error === 'string') return { status: null, message: error };
    const message = error?.message || error?.error || error?.data?.message || error?.response?.data?.message || error?.response?.message || 'Unknown error';
    const status = error?.status ?? error?.response?.status ?? null;
    return { status, message };
  };

  const refreshUser = async (): Promise<User | null> => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return null;
    }

    try {
      const profileData = await api.user.getProfile();
      setUser(profileData);
      setIsAuthenticated(true);
      // Store user safely
      localStorage.setItem('user', JSON.stringify(profileData));
      return profileData;
    } catch (error: any) {
      const normalized = normalizeApiError(error);
      console.error('Session invalid:', normalized);
      // If it's a 404 or 401, we MUST logout
      if (normalized.status === 401 || normalized.status === 403 || normalized.status === 404) {
        logout();
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      await api.auth.verify();
      setIsAuthenticated(true);
      return true;
    } catch (e) {
      setIsAuthenticated(false);
      return false;
    }
  };

  const SESSION_VERSION = 'v7';

  useEffect(() => {
    // Force clear old sessions on system reset
    const currentVersion = localStorage.getItem('session_version');
    if (currentVersion !== SESSION_VERSION) {
      console.log(`New session version detected (${SESSION_VERSION}). Clearing old session...`);
      logout();
      localStorage.setItem('session_version', SESSION_VERSION);
    }

    fetchAppStatus();
    refreshUser();

    // Listen for Supabase Auth changes (Google login)
    const { data: { subscription } } = supabaseAuth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        localStorage.setItem('token', session.access_token);
        setToken(session.access_token);
        refreshUser();
      } else if (event === 'SIGNED_OUT') {
        logout();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setAuthLoading(true);
    try {
      const data = await api.auth.login(email, password);
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);

        let currentUser = data.user as User | undefined;
        if (!currentUser) {
          currentUser = await refreshUser();
        }

        if (currentUser) {
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
          setIsAuthenticated(true);
          return currentUser;
        }

        throw { status: null, message: 'Não foi possível recuperar os dados do usuário após o login.' };
      }
      throw { status: null, message: 'Login failed' };
    } catch (error: any) {
      const normalized = normalizeApiError(error);
      throw normalized;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, referralCode?: string, extraData: any = {}) => {
    setAuthLoading(true);
    try {
      const data = await api.auth.register(name, email, password, referralCode, extraData);
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        
        // Use the user data returned from registration if available
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
          setIsAuthenticated(true);
          
          // Background refresh to get full profile if needed, but don't block
          refreshUser().catch(e => console.warn('Background refresh failed:', e));
          
          return data.user;
        } else {
          // Fallback if user data not in response
          await refreshUser();
          setIsAuthenticated(true);
          return user!;
        }
      }
      throw new Error('Registration failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    console.log("Logging out and clearing session...");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    
    // Force redirect to login to be safe
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login';
    }
  };

  const checkOnboardingStatus = () => {
    if (!user) return false;
    return !!user.onboarding_completed;
  };

  const fetchAppStatus = async () => {
    try {
      const data = await api.app.getStatus();
      setTotalUsersCount(data.total_users);
    } catch (e) {
      console.error('Error fetching app status:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, authLoading, isAuthenticated, totalUsersCount, login, register, logout, refreshUser, checkAuth, checkOnboardingStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
