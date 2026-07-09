import axios, { AxiosError } from 'axios';

export const API_URL = 'https://profit.areauflashbrasiltv.com/api';
export const SOCKET_URL = (import.meta.env.VITE_API_URL || 'https://profit.areauflashbrasiltv.com/').replace(/\/api$/, '');

const http = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  // Avoid assigning a plain object directly to Axios headers type.
  config.headers = ({
    ...(config.headers as any || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  } as any);
  return config;
});

const handleAxiosError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const responseData = error.response?.data || {};
    const message = responseData?.message || responseData?.error || error.message || 'Erro de rede. Verifique sua conexão ou CORS.';
    throw { status, message };
  }

  if (error instanceof TypeError || (error as any)?.message?.includes('Failed to fetch')) {
    throw { status: null, message: (error as any)?.message || 'Erro de rede. Verifique sua conexão ou CORS.' };
  }

  throw error;
};


/**
 * Retorna o caminho completo da imagem.
 * Ajusta caminhos relativos para apontar para o servidor de uploads.
 */
export const getImagePath = (path: string | null | undefined) => {
  if (!path) return '/placeholder-dish.png';
  if (path.startsWith('http')) return path;
  
  // Ensure we have a leading slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Try to use VITE_API_URL as base
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl.startsWith('http')) {
    const baseUrl = apiUrl.replace(/\/api$/, '');
    return `${baseUrl}${cleanPath}`;
  }
  
  // Fallback to absolute path on the same host
  // This helps when running on local IP addresses
  return cleanPath;
};


const getHeaders = (extraHeaders: Record<string, string> = {}) => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

const safeFetch = async (input: RequestInfo, init?: RequestInit) => {
  try {
    const response = await fetch(input, init);
    return await handleResponse(response);
  } catch (error: any) {
    if (error instanceof TypeError || error?.message?.includes('Failed to fetch')) {
      throw { status: null, message: error.message || 'Erro de rede. Verifique sua conexão ou CORS.' };
    }
    throw error;
  }
};

const handleResponse = async (res: Response) => {
  let data;
  try {
    data = await res.json();
  } catch (err) {
    data = {};
  }
  
  if (!res.ok) {
    const isPublicRoute = ['/login', '/register', '/onboarding', '/quiz', '/checkout', '/forgot-password', '/reset-password', '/auth/invite', '/activate', '/accept-invite', '/register-password'].some(path => window.location.pathname.startsWith(path));
    
    // Redirect to login if unauthorized or if user/profile is not found
    const isPaywallError = res.status === 403 && data.code === 'PAYWALL_ACTIVE';
    
    if ((res.status === 401 || (res.status === 403 && !isPaywallError) || (res.status === 404 && res.url.includes('/user/profile'))) && !isPublicRoute) {
      console.warn(`Auth session invalid (Status ${res.status}). Redirecting to login...`);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const errorMessage = data.message || `HTTP Error ${res.status}: ${res.statusText}`;
    throw { status: res.status, message: errorMessage };
  }
  return data;
};

export const api = {
  auth: {
    register: (name: string, email: string, password: string, referralCode?: string, extraData: any = {}) =>
      http.post('/auth/register', { name, email, password, referralCode, ...extraData })
        .then(res => res.data)
        .catch(handleAxiosError),

    login: (email: string, password: string) =>
      http.post('/auth/login', { email, password })
        .then(res => res.data)
        .catch(handleAxiosError),

    forgotPassword: (email: string) =>
      http.post('/auth/forgot-password', { email })
        .then(res => res.data)
        .catch(handleAxiosError),

    resetPassword: (payload: any) =>
      http.post('/auth/reset-password', payload)
        .then(res => res.data)
        .catch(handleAxiosError),

    createInvite: (name: string, email: string) =>
      http.post('/auth/invite/create', { name, email })
        .then(res => res.data)
        .catch(handleAxiosError),

    verifyInvite: (token: string) =>
      http.get(`/auth/invite/${token}`)
        .then(res => res.data)
        .catch(handleAxiosError),

    activateInvite: (payload: any) =>
      http.post('/auth/invite/activate', payload)
        .then(res => res.data)
        .catch(handleAxiosError),
    
    verify: () =>
      http.get('/auth/verify')
        .then(res => res.data)
        .catch(handleAxiosError),

    // Influencer System
    verifyInfluencerInvite: (token: string) =>
      http.get(`/auth/influencer/verify?token=${token}`)
        .then(res => res.data)
        .catch(handleAxiosError),

    acceptInfluencerInvite: (payload: any) =>
      http.post('/auth/influencer/accept', payload)
        .then(res => res.data)
        .catch(handleAxiosError),

    getPromotionStatus: () =>
      http.get('/auth/promotion-status')
        .then(res => res.data)
        .catch(handleAxiosError)
  },

  foods: {
    getAll: () => fetch(`${API_URL}/foods`).then(handleResponse),
    search: (query: string) => fetch(`${API_URL}/foods/search?q=${query}`).then(handleResponse)
  },

  meals: {
    add: (data: any) => fetch(`${API_URL}/meals/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

    getSummary: (date?: string) => {
      const url = new URL(`${API_URL}/meals/summary`, window.location.origin);
      if (date) url.searchParams.append('date', date);
      return fetch(url.toString(), {
        headers: getHeaders()
      }).then(handleResponse);
    },

    getWeeklyStats: () => fetch(`${API_URL}/meals/stats/weekly`, {
      headers: getHeaders()
    }).then(handleResponse),

    getHistory: (date?: string) => {
      const url = new URL(`${API_URL}/meals/history`, window.location.origin);
      if (date) url.searchParams.append('date', date);
      return fetch(url.toString(), {
        headers: getHeaders()
      }).then(handleResponse);
    },
    getRecentMeals: () => fetch(`${API_URL}/meals/recent`, {
      headers: getHeaders()
    }).then(handleResponse),
    getCalorieHistory: () => fetch(`${API_URL}/meals/history/calories`, {
      headers: getHeaders()
    }).then(handleResponse),
    scan: (imageFile: File) => {
      const formData = new FormData();
      formData.append('image', imageFile);
      const headers = getHeaders();
      delete headers['Content-Type']; // Let browser set boundary
      return fetch(`${API_URL}/meals/scan`, {
        method: 'POST',
        headers,
        body: formData
      }).then(handleResponse);
    },
    update: (id: string, data: any) => fetch(`${API_URL}/meals/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    delete: (id: string) => fetch(`${API_URL}/meals/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse)
  },

  quiz: {
    saveAnswer: (data: { question: string, answer: any, current_step?: string, is_complete?: boolean }) => fetch(`${API_URL}/quiz/answer`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

    getResponses: () => fetch(`${API_URL}/quiz/responses`, {
      headers: getHeaders()
    }).then(handleResponse),
    
    syncLead: (data: { id: string, responses: any, current_step: number, is_completed?: boolean }) => fetch(`${API_URL}/quiz/sync`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

    getSync: async () => fetch(`${API_URL}/quiz/sync`, {
      headers: getHeaders()
    }).then(handleResponse)
  },

  activity: {
    log: (action: string, details?: any) => fetch(`${API_URL}/activity/log`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action, details })
    }).then(handleResponse)
  },

  app: {
    getStatus: () => fetch(`${API_URL}/auth/promotion-status`).then(handleResponse)
  },

  payments: {
    create: (data: { amount: number, method: string, phone: string, name?: string, couponCode?: string, email?: string, plan?: string }) => fetch(`${API_URL}/payment/initiate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getStatus: (id: string) => fetch(`${API_URL}/payment/status/${id}`, {
      headers: getHeaders()
    }).then(handleResponse),
    lojouCheckout: (data: { plan_type: 'monthly' | 'annual'; phone?: string; coupon_code?: string }) =>
      fetch(`${API_URL}/payment/lojou/checkout`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse)
  },

  coupons: {
    list: () => fetch(`${API_URL}/admin/coupons`, {
      headers: getHeaders()
    }).then(handleResponse),

    create: (data: any) => fetch(`${API_URL}/admin/coupons`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

    validate: (code: string) => fetch(`${API_URL}/coupons/validate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code })
    }).then(handleResponse),

    toggleStatus: (id: string, active: boolean) => fetch(`${API_URL}/admin/coupons/toggle/${id}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ active })
    }).then(handleResponse),

    getInfluencerStats: () => fetch(`${API_URL}/admin/coupons/influencer-stats`, {
      headers: getHeaders()
    }).then(handleResponse)
  },

  user: {
    getProfile: () => fetch(`${API_URL}/user/profile`, {
      headers: getHeaders()
    }).then(handleResponse),
    
    getDashboardBootstrap: (date?: string) => {
      const url = new URL(`${API_URL}/user/dashboard-bootstrap`, window.location.origin);
      if (date) url.searchParams.append('date', date);
      return fetch(url.toString(), {
        headers: getHeaders()
      }).then(handleResponse);
    },

    update: (data: any) => fetch(`${API_URL}/user/update`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

    updateFunnelStep: (step: string) => fetch(`${API_URL}/user/funnel-step`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ step })
    }).then(handleResponse),

    updateAccount: (data: any) => fetch(`${API_URL}/user/update`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

    submitQuiz: (data: any) => fetch(`${API_URL}/user/quiz`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

    uploadProfilePhoto: (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      const headers = getHeaders();
      delete headers['Content-Type'];
      return fetch(`${API_URL}/user/photo-upload`, {
        method: 'POST',
        headers,
        body: formData
      }).then(handleResponse);
    },
    updateNotificationSettings: (notifications_enabled: boolean) => fetch(`${API_URL}/user/notifications`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ notifications_enabled })
    }).then(handleResponse),
    getPreferences: () => fetch(`${API_URL}/user/preferences`, {
      headers: getHeaders()
    }).then(handleResponse),
    updatePreferences: (theme_mode: string) => fetch(`${API_URL}/user/preferences`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ theme_mode })
    }).then(handleResponse),
    getReferrals: () => fetch(`${API_URL}/user/referrals`, {
      headers: getHeaders()
    }).then(handleResponse),
    completeOnboarding: () => fetch(`${API_URL}/user/update`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ onboarding_completed: true })
    }).then(handleResponse)
  },

  notifications: {
    getAll: () => fetch(`${API_URL}/notifications`, {
      headers: getHeaders()
    }).then(handleResponse),

    getNotifications: () => fetch(`${API_URL}/notifications`, {
      headers: getHeaders()
    }).then(handleResponse),

    markAsRead: (id: string) => fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders()
    }).then(handleResponse),

    markAllAsRead: () => fetch(`${API_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: getHeaders()
    }).then(handleResponse),
    
    registerDevice: (subscription: any, device_type: string = 'web') => fetch(`${API_URL}/notifications/register-device`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ subscription, device_type })
    }).then(handleResponse),

    getHistory: () => fetch(`${API_URL}/notifications/history`, {
      headers: getHeaders()
    }).then(handleResponse),

    getSettings: () => fetch(`${API_URL}/notifications/settings`, {
      headers: getHeaders()
    }).then(handleResponse),

    updateSettings: (data: { notification_time?: string; [key: string]: any }) =>
      fetch(`${API_URL}/notifications/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    removeDevice: () => fetch(`${API_URL}/notifications/device`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),
  },
  workouts: {
    generate: (data: any) => {
      const isFormData = data instanceof FormData;
      const headers = getHeaders();
      if (isFormData) delete headers['Content-Type'];
      
      return fetch(`${API_URL}/workouts/generate`, {
        method: 'POST',
        headers,
        body: isFormData ? data : JSON.stringify(data)
      }).then(handleResponse);
    },
    saveManual: (structuredPlan: any) => fetch(`${API_URL}/workouts/manual`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ structuredPlan })
    }).then(handleResponse),
    getActive: () => fetch(`${API_URL}/workouts/active`, {
      headers: getHeaders()
    }).then(handleResponse),
    getDetails: (id: string) => fetch(`${API_URL}/workouts/details/${id}`, {
      headers: getHeaders()
    }).then(handleResponse),
    markComplete: (workout_plan_id: string, day_of_week: string) => fetch(`${API_URL}/workouts/progress`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ workout_plan_id, day_of_week })
    }).then(handleResponse),
    getProgress: (workout_plan_id: string) => fetch(`${API_URL}/workouts/progress?workout_plan_id=${workout_plan_id}`, {
      headers: getHeaders()
    }).then(handleResponse),
    markExerciseComplete: (workout_plan_id: string, exercise_name: string, workout_day: string, completed: boolean, completed_sets: number[]) => fetch(`${API_URL}/workouts/exercise/complete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ workout_plan_id, exercise_name, workout_day, completed, completed_sets })
    }).then(handleResponse),
    getExerciseProgress: (workout_plan_id: string, workout_day: string) => fetch(`${API_URL}/workouts/exercise/progress?workout_plan_id=${workout_plan_id}&workout_day=${workout_day}`, {
      headers: getHeaders()
    }).then(handleResponse),
    reset: () => fetch(`${API_URL}/workouts/reset`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),
    startSession: (data: { plan_id: string, workout_type: string, workout_day: string }) => fetch(`${API_URL}/workouts/sessions/start`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    endSession: (data: { session_id: string, status: string, duration: number, calories: number }) => fetch(`${API_URL}/workouts/sessions/end`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
    getSessionsHistory: () => fetch(`${API_URL}/workouts/sessions/history`, {
      headers: getHeaders()
    }).then(handleResponse)
  },
  admin: {
    getDashboardData: () => fetch(`${API_URL}/admin/dashboard`, {
      headers: getHeaders()
    }).then(handleResponse),
    getPreferences: () => fetch(`${API_URL}/admin/preferences`, {
      headers: getHeaders()
    }).then(handleResponse),
    updatePreferences: (theme_mode: string) => fetch(`${API_URL}/admin/preferences`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ theme_mode })
    }).then(handleResponse),

    getUsers: () => fetch(`${API_URL}/admin/users`, {
      headers: getHeaders()
    }).then(handleResponse),

    getAdmins: () => fetch(`${API_URL}/admin/admins`, {
      headers: getHeaders()
    }).then(handleResponse),

    exportUsers: (country: string = 'all', status: string = 'all') => {
      const url = new URL(`${API_URL}/admin/users/export`, window.location.origin);
      if (country !== 'all') url.searchParams.append('country', country);
      if (status !== 'all') url.searchParams.append('status', status);
      
      return fetch(url.toString(), {
        headers: getHeaders()
      }).then(res => {
        if (!res.ok) throw new Error('Falha ao exportar');
        return res.blob();
      });
    },

    getUsersActivity: () => fetch(`${API_URL}/admin/users/activity`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    sendAdminNotification: (data: any) => fetch(`${API_URL}/admin/notifications/send`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify(data)
    }).then(handleResponse),

    getNotificationTemplates: () => fetch(`${API_URL}/admin/notifications/templates`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    scheduleAdminNotification: (data: any) => fetch(`${API_URL}/admin/notifications/schedule`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    }).then(handleResponse),

    getScheduledNotifications: () => fetch(`${API_URL}/admin/notifications/scheduled`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    deleteScheduledNotification: (id: string) => fetch(`${API_URL}/admin/notifications/scheduled/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    getUser: (id: string) => fetch(`${API_URL}/admin/users/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    toggleUserStatus: (id: string, is_active: boolean) => fetch(`${API_URL}/admin/users/status/${id}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ is_active })
    }).then(handleResponse),

    updateUserScanLimit: (id: string, scan_limit: number) => fetch(`${API_URL}/admin/users/limits/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ scan_limit })
    }).then(handleResponse),

    deleteUser: (id: string) => fetch(`${API_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    inviteUser: (data: any) => fetch(`${API_URL}/admin/users/invite`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    }).then(handleResponse),

    getScannedDishes: (search?: string, period?: string) => {
      const url = new URL(`${API_URL}/admin/scanned-dishes`, window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (period) url.searchParams.append('period', period);
      return fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(handleResponse);
    },

    updateScannedDish: (id: string, data: any) => fetch(`${API_URL}/admin/scanned-dishes/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    }).then(handleResponse),

    deleteScannedDish: (id: string) => fetch(`${API_URL}/admin/scanned-dishes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    getFoods: () => fetch(`${API_URL}/admin/foods`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    updateFood: (id: string, data: any) => fetch(`${API_URL}/admin/foods/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    }).then(handleResponse),

    deleteFood: (id: string) => fetch(`${API_URL}/admin/foods/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    getMRRStats: () => fetch(`${API_URL}/admin/mrr/stats`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    getMRRChart: () => fetch(`${API_URL}/admin/mrr/chart`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),
    
    getWorkoutActivity: (params: { search?: string, status?: string, type?: string, date?: string, page?: number, limit?: number }) => {
      const url = new URL(`${API_URL}/admin/workouts/activity`, window.location.origin);
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) url.searchParams.append(key, val.toString());
      });
      return fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(handleResponse);
    },
    getWorkoutStats: () => fetch(`${API_URL}/admin/workouts/stats`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),
    getWorkoutSessionDetails: (id: string) => fetch(`${API_URL}/admin/workouts/session/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    migrateWorkouts: () => fetch(`${API_URL}/admin/workouts/migrate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    getAIDetectedFoods: (search: string = '', sortBy: string = 'count') => 
      fetch(`${API_URL}/admin/ai-foods?search=${search}&sortBy=${sortBy}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(handleResponse),

    migrateAIFoods: () => fetch(`${API_URL}/admin/ai-foods/migrate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    inviteInfluencer: (email: string, name?: string) => fetch(`${API_URL}/admin/influencers/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ email, name })
    }).then(handleResponse),

    // Coupons Management
    getCoupons: () => fetch(`${API_URL}/admin/coupons`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),
    
    createCoupon: (data: any) => fetch(`${API_URL}/admin/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    }).then(handleResponse),

    toggleCoupon: (id: string, active: boolean) => fetch(`${API_URL}/admin/coupons/toggle/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ active })
    }).then(handleResponse),

    getInfluencerStats: () => fetch(`${API_URL}/admin/coupons/influencer-stats`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),

    getAIConfig: () => fetch(`${API_URL}/admin/ai-config`, {
      headers: getHeaders()
    }).then(handleResponse),

    updateAIConfig: (data: any) => fetch(`${API_URL}/admin/ai-config`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

    getAILogs: () => fetch(`${API_URL}/admin/ai-config/logs`, {
      headers: getHeaders()
    }).then(handleResponse),

    getAITokenStats: () => fetch(`${API_URL}/admin/ai-config/token-stats`, {
      headers: getHeaders()
    }).then(handleResponse),

    getSocialRanking: () => fetch(`${API_URL}/admin/social/ranking`, {
      headers: getHeaders()
    }).then(handleResponse),

    getSocialSharing: () => fetch(`${API_URL}/admin/social/sharing`, {
      headers: getHeaders()
    }).then(handleResponse),

    getSocialWeightHistory: () => fetch(`${API_URL}/admin/social/weight-history`, {
      headers: getHeaders()
    }).then(handleResponse),

    getSocialFoodStats: () => fetch(`${API_URL}/admin/social/food-stats`, {
      headers: getHeaders()
    }).then(handleResponse),

    getSocialWorkoutStats: () => fetch(`${API_URL}/admin/social/workout-stats`, {
      headers: getHeaders()
    }).then(handleResponse),

    getSocialWidgetStats: () => fetch(`${API_URL}/admin/social/widget-stats`, {
      headers: getHeaders()
    }).then(handleResponse),

    getAnalyticsSeries: (period: string) => fetch(`${API_URL}/admin/analytics?period=${period}`, {
      headers: getHeaders()
    }).then(handleResponse),

    getAnalyticsScreens: () => fetch(`${API_URL}/admin/analytics/screens`, {
      headers: getHeaders()
    }).then(handleResponse),

    getAnalyticsFeatures: () => fetch(`${API_URL}/admin/analytics/features`, {
      headers: getHeaders()
    }).then(handleResponse),

    getFunnelStats: () => fetch(`${API_URL}/admin/funnel-stats`, {
      headers: getHeaders()
    }).then(handleResponse),
  },
  ai: {
    getConversations: () => fetch(`${API_URL}/ai/conversations`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),
    getMessages: (id: string) => fetch(`${API_URL}/ai/messages/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),
    sendMessage: (conversationId: string | null, message: string) => fetch(`${API_URL}/ai/message`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ conversationId, message })
    }).then(handleResponse),
    newConversation: () => fetch(`${API_URL}/ai/new`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),
    
    // Admin AI
    adminGetConversations: () => fetch(`${API_URL}/ai/admin/conversations`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),
    adminReply: (conversationId: string, message: string) => fetch(`${API_URL}/ai/admin/reply`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ conversationId, message })
    }).then(handleResponse)
  },
  customWorkouts: {
    list: () => fetch(`${API_URL}/custom-workouts`, {
      headers: getHeaders()
    }).then(handleResponse),

    create: (data: { name: string; workout_time?: string; muscle_group?: string; exercises: any[] }) =>
      fetch(`${API_URL}/custom-workouts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    get: (id: string) => fetch(`${API_URL}/custom-workouts/${id}`, {
      headers: getHeaders()
    }).then(handleResponse),

    update: (id: string, data: any) => fetch(`${API_URL}/custom-workouts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

    remove: (id: string) => fetch(`${API_URL}/custom-workouts/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

    getByDay: (day: number) => fetch(`${API_URL}/custom-workouts/day/${day}`, {
      headers: getHeaders()
    }).then(handleResponse),

    getHistory: (id: string) => fetch(`${API_URL}/custom-workouts/${id}/history`, {
      headers: getHeaders()
    }).then(handleResponse),

    addExercise: (id: string, exercise: any) => fetch(`${API_URL}/custom-workouts/${id}/exercises`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(exercise)
    }).then(handleResponse),

    updateExercise: (id: string, eid: string, data: any) => fetch(`${API_URL}/custom-workouts/${id}/exercises/${eid}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

    removeExercise: (id: string, eid: string) => fetch(`${API_URL}/custom-workouts/${id}/exercises/${eid}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),
  },

  subscription: {
    getStatus: () => fetch(`${API_URL}/subscription/status`, {
      headers: getHeaders()
    }).then(handleResponse),

    activateTrial: () => fetch(`${API_URL}/subscription/trial`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),

    activate: (data: { payment_ref?: string; plan?: string }) => fetch(`${API_URL}/subscription/activate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

    renew: (data?: any) => fetch(`${API_URL}/subscription/renew`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data ?? {})
    }).then(handleResponse),

    cancel: () => fetch(`${API_URL}/subscription/cancel`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),

    getHistory: () => fetch(`${API_URL}/subscription/history`, {
      headers: getHeaders()
    }).then(handleResponse),

    validate: () => fetch(`${API_URL}/subscription/validate`, {
      headers: getHeaders()
    }).then(handleResponse),
  },

  emailPreferences: {
    get: () => fetch(`${API_URL}/email-preferences`, {
      headers: getHeaders()
    }).then(handleResponse),

    update: (data: Record<string, boolean>) => fetch(`${API_URL}/email-preferences`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),
  },

  achievements: {
    getMy: () => fetch(`${API_URL}/achievements/my`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse),
    getAll: () => fetch(`${API_URL}/achievements/all`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse)
  },
  billing: {
    sendEmail: (userId: string) => fetch(`${API_URL}/admin/billing/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ userId })
    }).then(handleResponse),
    getStatus: () => fetch(`${API_URL}/admin/billing/status`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(handleResponse)
  }
};

export default api;

