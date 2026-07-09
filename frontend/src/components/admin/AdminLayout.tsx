import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  LogOut,
  Settings,
  CircleDollarSign,
  Soup,
  MessageSquare,
  Activity,
  User,
  ChevronDown,
  Filter,
  Ticket,
  Brain,
  BarChart2,
  Share2
} from 'lucide-react';
import { api } from '../../services/api';
import { AdminProfileModal } from './AdminProfileModal';

const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // State
    const [user, setUser] = useState<any>(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserProfile();
        
        // Close dropdown when clicking outside
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.profile-container')) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUserProfile = async () => {
        try {
            const data = await api.user.getProfile();
            setUser(data);
        } catch (err) {
            console.error('Failed to fetch admin profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/admin/login');
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Painel', path: '/admin' },
        { icon: Users, label: 'Usuários', path: '/admin/users' },
        { icon: Activity, label: 'Treinos IA', path: '/admin/workouts' },
        { icon: CircleDollarSign, label: 'MRR', path: '/admin/mrr' },
        { icon: Ticket, label: 'Cupons', path: '/admin/coupons' },
        { icon: Filter, label: 'Funil', path: '/admin/funnel' },
        { icon: MessageSquare, label: 'Comunicação', path: '/admin/notifications' },
        { icon: Soup,      label: 'Pratos',       path: '/admin/dishes'    },
        { icon: Activity,  label: 'Engajamento',  path: '/admin/support'   },
        { icon: Brain,     label: 'Config. IA',   path: '/admin/ai-config' },
        { icon: BarChart2, label: 'Analytics',    path: '/admin/analytics' },
        { icon: Share2,    label: 'Social',       path: '/admin/social'    },
    ];

    const getBreadcrumb = () => {
        if (location.pathname.startsWith('/admin/users/')) {
            return 'Admin / Usuários / Perfil';
        }
        const item = navItems.find(i => i.path === location.pathname);
        return item ? `Admin / ${item.label}` : 'Admin / Painel';
    };

    return (
        <div className="flex h-screen min-w-full bg-[#F7F9FC] dark:bg-[#0F172A] overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {/* Sidebar */}
            <aside className="w-[260px] bg-[var(--bg-card)] dark:bg-[#1E293B] border-r border-[#E6EAF0] dark:border-[#334155] flex flex-col h-full z-20 flex-shrink-0 transition-colors duration-300 shadow-sm">
                <div className="p-6 border-b border-[#E6EAF0] dark:border-[#334155] flex items-center gap-2">
                    <div className="w-7 h-7 bg-[#2D3748] dark:bg-[#38A169] rounded-md flex items-center justify-center font-bold text-white text-sm">
                        P
                    </div>
                    <span className="text-[18px] font-bold tracking-tight text-[#1A202C] dark:text-white">Administrador <span className="text-[#38A169]">ProFit</span></span>
                </div>
                
                <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/admin'}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-[12px] py-[12px] rounded-[10px] transition-all duration-150 text-[14px]
                                ${isActive 
                                    ? 'bg-[#EDF2F7] dark:bg-[#334155] text-[#2D3748] dark:text-white font-semibold' 
                                    : 'text-[#718096] dark:text-slate-400 hover:bg-[#F7F9FC] dark:hover:bg-[#1E293B] hover:text-[#2D3748] dark:hover:text-white'}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon size={18} className={isActive ? 'text-[#38A169]' : 'text-[#A0AEC0] dark:text-slate-500'} />
                                    <span>{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-[#E6EAF0] dark:border-[#334155]">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-[12px] py-[12px] w-full rounded-[10px] text-[#718096] dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-colors text-[14px]"
                    >
                        <LogOut size={18} />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#F7F9FC] dark:bg-[#0F172A] transition-colors duration-300">
                {/* Header Superior */}
                <header className="h-[70px] bg-[var(--bg-card)] dark:bg-[#1E293B] border-b border-[#E6EAF0] dark:border-[#334155] flex items-center justify-between px-8 z-30 flex-shrink-0 transition-all duration-300 shadow-sm relative">
                    <div className="flex flex-col">
                        <h2 className="text-[12px] font-medium text-[#A0AEC0] dark:text-slate-500 uppercase tracking-wider">{getBreadcrumb()}</h2>
                        {user && (
                            <p className="text-[16px] font-bold text-[#1A202C] dark:text-white mt-0.5 animate-in fade-in slide-in-from-left-2 duration-500">
                                {getGreeting()}, <span className="text-[#38A169]">{user.name.split(' ')[0]} 👋</span>
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="h-8 w-[1px] bg-[#334155]" />

                        {/* Profile Section */}
                        <div className="profile-container relative">
                            <button 
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-50 dark:hover:bg-[#334155] transition-all group"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-[14px] font-bold text-[#1A202C] dark:text-white group-hover:text-[#38A169] transition-colors">{user?.name || 'Administrador'}</p>
                                    <p className="text-[11px] font-medium text-[#A0AEC0] dark:text-slate-500 group-hover:text-slate-400 transition-colors uppercase tracking-tight">{user?.role === 'admin' ? 'Administrador' : 'Equipe ProFit'}</p>
                                </div>
                                
                                <div className="relative">
                                    <div className="w-11 h-11 rounded-full bg-[#EDF2F7] dark:bg-[#334155] flex items-center justify-center border-2 border-white dark:border-[#475569] shadow-sm overflow-hidden group-hover:scale-105 transition-transform duration-200">
                                        {user?.profile_photo ? (
                                            <img src={user.profile_photo} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[14px] font-bold text-[#718096] dark:text-white">
                                                {user ? getInitials(user.name) : 'A'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#1E293B] rounded-full shadow-sm animate-pulse" />
                                </div>
                                <ChevronDown size={16} className={`text-[#A0AEC0] transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {showProfileMenu && (
                                <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 mb-2">
                                        <p className="text-[14px] font-bold text-slate-800 dark:text-white">{user?.name}</p>
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400">{user?.email}</p>
                                    </div>
                                    
                                    <button 
                                      onClick={() => { setShowProfileMenu(false); setIsProfileModalOpen(true); }}
                                      className="flex items-center gap-3 px-5 py-2.5 w-full text-[14px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#334155] hover:text-[#38A169] transition-colors text-left"
                                    >
                                        <User size={18} /> Ver Perfil
                                    </button>
                                    <button 
                                      onClick={() => { setShowProfileMenu(false); navigate('/admin/settings'); }}
                                      className="flex items-center gap-3 px-5 py-2.5 w-full text-[14px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#334155] hover:text-[#38A169] transition-colors text-left"
                                    >
                                        <Settings size={18} /> Definições
                                    </button>
                                    
                                    <div className="my-2 border-t border-slate-100 dark:border-slate-700" />
                                    
                                    <button 
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 px-5 py-2.5 w-full text-[14px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-left font-bold"
                                    >
                                        <LogOut size={18} /> Sair
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                
                {/* Área de Conteúdo Principal */}
                <main className="flex-1 overflow-y-auto p-[30px] w-full bg-[#F7F9FC] dark:bg-[#0F172A] transition-colors duration-300">
                    <div className="max-w-[1400px] mx-auto w-full">
                        <Outlet />
                    </div>
                </main>

                <AdminProfileModal 
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                    user={user}
                    onUpdateSuccess={fetchUserProfile}
                />
            </div>
        </div>
    );
};

export default AdminLayout;
