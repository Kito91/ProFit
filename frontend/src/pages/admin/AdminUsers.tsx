import React, { useEffect, useState } from 'react';
import { 
  Search, 
  MoreVertical, 
  Eye, 
  Trash2, 
  Ban, 
  CheckCircle,
  Clock,
  Mail,
  Filter,
  UserX,
  UserCheck,
  X,
  Settings,
  Star,
  Award,
  User,
  UserPlus,
  CreditCard,
  FileDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../../components/ConfirmModal';
import { api } from '../../services/api';

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [admins, setAdmins] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'users' | 'admins' | 'influencers'>('users');
    const [activities, setActivities] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modals
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [newLimit, setNewLimit] = useState(3);
    const [inviteForm, setInviteForm] = useState({ name: '', email: '', limit: 3, type: 'normal' as 'normal' | 'influencer' });
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
    const [sendingBillingId, setSendingBillingId] = useState<string | null>(null);
    const [countryFilter, setCountryFilter] = useState<string>('all');
    const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');

    const navigate = useNavigate();

    const [confirmOptions, setConfirmOptions] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'danger' as 'danger' | 'warning' | 'info' | 'success',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: async () => {}
    });

    const closeConfirm = () => setConfirmOptions(prev => ({ ...prev, isOpen: false }));

    useEffect(() => {
        fetchData();
        fetchActivities();

        const interval = setInterval(fetchActivities, 30000); // 30s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersData, adminsData] = await Promise.all([
                api.admin.getUsers(),
                api.admin.getAdmins()
            ]);
            setUsers(usersData);
            setAdmins(adminsData);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivities = async () => {
        try {
            const data = await api.admin.getUsersActivity();
            const activityMap: Record<string, any> = {};
            data.forEach((a: any) => {
                activityMap[a.id] = a;
            });
            setActivities(activityMap);
        } catch (err) {
            console.error('Error fetching activities:', err);
        }
    };

    const handleSendBilling = async (userId: string) => {
      setSendingBillingId(userId);
      try {
        await api.billing.sendEmail(userId);
        setConfirmOptions({
          isOpen: true,
          title: 'Sucesso',
          message: 'E-mail de cobrança enviado com sucesso para o usuário!',
          type: 'success',
          confirmText: 'OK',
          showCancel: false,
          onConfirm: async () => closeConfirm()
        });
      } catch (err) {
        console.error('Error sending billing email:', err);
        setConfirmOptions({
          isOpen: true,
          title: 'Erro',
          message: 'Falha ao enviar e-mail de cobrança.',
          type: 'danger',
          confirmText: 'Sair',
          showCancel: false,
          onConfirm: async () => closeConfirm()
        });
      } finally {
        setSendingBillingId(null);
      }
    };

    const handleDelete = async (id: string) => {
        setConfirmOptions({
            isOpen: true,
            title: 'Confirmar exclusão',
            message: 'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.',
            type: 'danger',
            confirmText: 'Excluir',
            showCancel: true,
            onConfirm: async () => {
                try {
                    await api.admin.deleteUser(id);
                    fetchData();
                } catch (err) {
                    console.error('Error deleting user:', err);
                }
            }
        });
    };

    const handleUpdateLimit = async () => {
        if (!selectedUser) return;
        try {
            await api.admin.updateUserScanLimit(selectedUser.id, newLimit);
            fetchData();
            setIsLimitModalOpen(false);
        } catch (err) {
            console.error('Error updating limit:', err);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (inviteForm.type === 'influencer') {
                await api.admin.inviteInfluencer(inviteForm.email, inviteForm.name);
                setInviteSuccess('E-mail enviado! O influenciador receberá um link de ativação VIP.');
            } else {
                const data = await api.admin.inviteUser({ 
                    name: inviteForm.name, 
                    email: inviteForm.email, 
                    scan_limit: inviteForm.limit 
                });
                setInviteSuccess(data.inviteLink);
            }
            fetchData();
        } catch (err: any) {
            console.error('Error sending invite:', err);
            // Handle error message for user
        }
    };

    const handleMakeInfluencer = async (user: any) => {
        setConfirmOptions({
            isOpen: true,
            title: 'Tornar Influenciador',
            message: `Deseja transformar ${user.name} em um Influenciador VIP? Ele receberá um e-mail de ativação e terá acesso PRO vitalício.`,
            type: 'warning',
            confirmText: 'Confirmar',
            showCancel: true,
            onConfirm: async () => {
                try {
                    await api.admin.inviteInfluencer(user.email, user.name || '');
                    setConfirmOptions({
                        isOpen: true,
                        title: 'Sucesso',
                        message: 'Convite de Influenciador enviado! O status será atualizado assim que ele aceitar.',
                        type: 'success',
                        confirmText: 'OK',
                        showCancel: false,
                        onConfirm: async () => {
                            closeConfirm();
                            fetchData();
                        }
                    });
                } catch (err: any) {
                    setConfirmOptions({
                        isOpen: true,
                        title: 'Erro',
                        message: err.message || 'Falha ao processar convite.',
                        type: 'danger',
                        confirmText: 'Sair',
                        showCancel: false,
                        onConfirm: async () => closeConfirm()
                    });
                }
            }
        });
    };

    const handleRemoveInfluencer = (user: any) => {
        setConfirmOptions({
            isOpen: true,
            title: 'Remover Influenciador',
            message: `Deseja remover ${user.name || user.email} da lista de influenciadores? A conta continuará ativa, mas perderá os privilégios de Influenciador VIP.`,
            type: 'danger',
            confirmText: 'Remover',
            showCancel: true,
            onConfirm: async () => {
                try {
                    await api.admin.removeInfluencer(user.id);
                    setUsers(currentUsers => currentUsers.map(currentUser => (
                        currentUser.id === user.id
                            ? { ...currentUser, is_influencer: false }
                            : currentUser
                    )));
                } catch (err: any) {
                    console.error('Error removing influencer:', err);
                    window.setTimeout(() => {
                        setConfirmOptions({
                            isOpen: true,
                            title: 'Erro',
                            message: err?.message || 'Não foi possível remover o status de influenciador.',
                            type: 'danger',
                            confirmText: 'Fechar',
                            showCancel: false,
                            onConfirm: async () => closeConfirm()
                        });
                    }, 0);
                }
            }
        });
    };
    
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const blob = await api.admin.exportUsers(countryFilter, subscriptionFilter);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            a.download = `contatos_profit_${timestamp}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            setConfirmOptions({
                isOpen: true,
                title: 'Sucesso',
                message: 'Exportação concluída! Verifique sua pasta de downloads.',
                type: 'success',
                confirmText: 'OK',
                showCancel: false,
                onConfirm: async () => closeConfirm()
            });
        } catch (err) {
            console.error('Export error:', err);
            setConfirmOptions({
                isOpen: true,
                title: 'Erro',
                message: 'Falha ao exportar contatos. Tente novamente.',
                type: 'danger',
                confirmText: 'Sair',
                showCancel: false,
                onConfirm: async () => closeConfirm()
            });
        } finally {
            setIsExporting(false);
        }
    };

    const displayList = activeTab === 'users' ? users : (activeTab === 'admins' ? admins : users.filter(u => u.is_influencer));

    const filteredUsers = displayList.filter(u => {
        const matchesSearch = u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCountry = countryFilter === 'all' || u.country_code === countryFilter;
        
        let matchesSubscription = true;
        const now = new Date();
        const isExpired = u.data_expiracao ? new Date(u.data_expiracao) < now : true;
        const isActive = u.plano_status === 'ativo' && !isExpired;

        if (subscriptionFilter === 'active') matchesSubscription = isActive;
        if (subscriptionFilter === 'expired') matchesSubscription = isExpired;
        
        return matchesSearch && matchesCountry && matchesSubscription;
    });

    const getFlag = (code: string) => {
        if (!code) return '🌍';
        const flags: Record<string, string> = {
            'MZ': '🇲🇿',
            'ZA': '🇿🇦',
            'AO': '🇦🇴'
        };
        return flags[code] || '🌍';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-[24px] font-semibold text-[#1A202C] dark:text-white tracking-tight transition-colors">Gerenciamento de Usuários</h1>
                    <p className="text-[14px] text-[#718096] dark:text-slate-400 mt-0.5 transition-colors">Visualize e gerencie as contas e limites dos usuários.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0] dark:text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-card)] dark:bg-[#1E293B] border border-[#E6EAF0] dark:border-[#334155] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#38A169]/10 transition-all text-[14px] dark:text-white"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setInviteForm({ name: '', email: '', limit: 3, type: 'normal' });
                            setInviteSuccess(null);
                            setIsInviteModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-[#38A169] text-white rounded-[10px] text-[14px] font-semibold hover:bg-[#2F855A] transition-colors shadow-sm whitespace-nowrap"
                    >
                        <UserPlus size={18} />
                        <span className="hidden sm:inline">Convidar</span>
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className={`flex items-center gap-2 px-3 py-2 ${isExporting ? 'bg-slate-400' : 'bg-[#1A202C] hover:bg-black'} text-white rounded-[10px] text-[14px] font-semibold transition-all shadow-sm whitespace-nowrap`}
                        title="Exportar contatos para Excel"
                    >
                        <FileDown size={18} className={isExporting ? 'animate-bounce' : ''} />
                        <span className="hidden sm:inline">{isExporting ? 'Exportando...' : 'Exportar'}</span>
                    </button>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0] dark:text-slate-500" size={16} />
                        <select
                            value={countryFilter}
                            onChange={(e) => setCountryFilter(e.target.value)}
                            className="pl-10 pr-8 py-2 bg-[var(--bg-card)] dark:bg-[#1E293B] border border-[#E6EAF0] dark:border-[#334155] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#38A169]/10 transition-all text-[14px] dark:text-white appearance-none cursor-pointer"
                        >
                            <option value="all">Todos Países</option>
                            <option value="MZ">🇲🇿 Moçambique</option>
                            <option value="ZA">🇿🇦 África do Sul</option>
                            <option value="AO">🇦🇴 Angola</option>
                        </select>
                    </div>
                    <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AEC0] dark:text-slate-500" size={16} />
                        <select
                            value={subscriptionFilter}
                            onChange={(e) => setSubscriptionFilter(e.target.value)}
                            className="pl-10 pr-8 py-2 bg-[var(--bg-card)] dark:bg-[#1E293B] border border-[#E6EAF0] dark:border-[#334155] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#38A169]/10 transition-all text-[14px] dark:text-white appearance-none cursor-pointer"
                        >
                            <option value="all">Todas Assinaturas</option>
                            <option value="active">🟢 Ativos</option>
                            <option value="expired">🔴 Expirados</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#E6EAF0] dark:border-[#334155] mb-2">
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`px-3 sm:px-6 py-3 text-[13px] sm:text-[14px] font-bold transition-all border-b-2 ${
                        activeTab === 'users' 
                            ? 'border-[#38A169] text-[#2D3748] dark:text-white' 
                            : 'border-transparent text-[#718096] hover:text-[#2D3748] dark:hover:text-slate-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <User size={16} />
                        Usuários
                        <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">
                            {users.length}
                        </span>
                    </div>
                </button>
                <button 
                    onClick={() => setActiveTab('admins')}
                    className={`px-3 sm:px-6 py-3 text-[13px] sm:text-[14px] font-bold transition-all border-b-2 ${
                        activeTab === 'admins' 
                            ? 'border-[#38A169] text-[#2D3748] dark:text-white' 
                            : 'border-transparent text-[#718096] hover:text-[#2D3748] dark:hover:text-slate-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Settings size={16} />
                        Administradores
                        <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">
                            {admins.length}
                        </span>
                    </div>
                </button>
                <button 
                    onClick={() => setActiveTab('influencers')}
                    className={`px-3 sm:px-6 py-3 text-[13px] sm:text-[14px] font-bold transition-all border-b-2 ${
                        activeTab === 'influencers' 
                            ? 'border-amber-500 text-[#2D3748] dark:text-white' 
                            : 'border-transparent text-[#718096] hover:text-[#2D3748] dark:hover:text-slate-200'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Star size={16} className={activeTab === 'influencers' ? 'text-amber-500 font-bold' : ''} />
                        Influenciadores
                        <span className="ml-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/40 text-amber-600 rounded text-[10px]">
                            {users.filter(u => u.is_influencer).length}
                        </span>
                    </div>
                </button>
            </div>

            <div className="bg-[var(--bg-card)] dark:bg-[#1E293B] rounded-[14px] border border-[#E6EAF0] dark:border-[#334155] overflow-hidden shadow-sm transition-colors duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-[#E6EAF0] dark:border-[#334155] transition-colors">
                                <th className="px-6 py-4 text-[12px] font-bold text-[#A0AEC0] dark:text-slate-500 uppercase tracking-wider">Usuário</th>
                                <th className="px-6 py-4 text-[12px] font-bold text-[#A0AEC0] dark:text-slate-500 uppercase tracking-wider text-center">Localização</th>
                                <th className="px-6 py-4 text-[12px] font-bold text-[#A0AEC0] dark:text-slate-500 uppercase tracking-wider text-center">Referência</th>
                                <th className="px-6 py-4 text-[12px] font-bold text-[#A0AEC0] dark:text-slate-500 uppercase tracking-wider">Atividade</th>
                                <th className="px-6 py-4 text-[12px] font-bold text-[#A0AEC0] dark:text-slate-500 uppercase tracking-wider">Limites</th>
                                <th className="px-6 py-4 text-[12px] font-bold text-[#A0AEC0] dark:text-slate-500 uppercase tracking-wider">Pagamento</th>
                                <th className="px-6 py-4 text-[12px] font-bold text-[#A0AEC0] dark:text-slate-500 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F7F9FC] dark:divide-[#334155]">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-5"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-[#EDF2F7] dark:bg-slate-800 flex items-center justify-center text-[#2D3748] dark:text-white font-bold text-[13px] border border-[#E2E8F0] dark:border-slate-700">
                                                {user.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="font-semibold text-[#2D3748] dark:text-white text-[14px]">{user.name || 'Sem Nome'}</div>
                                                    {user.is_influencer && (
                                                        <Star size={12} className="text-amber-500" fill="currentColor" />
                                                    )}
                                                </div>
                                                <div className="text-[12px] text-[#718096] dark:text-slate-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-[16px]" title={user.country || 'Desconhecido'}>
                                                {getFlag(user.country_code)}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-500 truncate max-w-[80px]">
                                                {user.city || 'Cidade N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {user.referrer_name ? (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[12px] font-semibold text-[var(--text-main)] dark:text-slate-300">{user.referrer_name}</span>
                                                <span className="text-[10px] text-[var(--text-muted)]">Padrinho</span>
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-gray-300 font-medium">Direto</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {activities[user.id] ? (
                                            <div className="flex items-center gap-2 font-medium">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    activities[user.id].tempo_formatado === 'Online agora' ? 'bg-emerald-500 animate-pulse' :
                                                    activities[user.id].last_active_at && new Date(activities[user.id].last_active_at) > new Date(Date.now() - 3600000) ? 'bg-amber-500' :
                                                    'bg-rose-500'
                                                }`} />
                                                <span className="text-[13px] dark:text-slate-300">
                                                    {activities[user.id].tempo_formatado}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[#A0AEC0] text-[13px]">Nunca ativo</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[12px] font-semibold text-[var(--text-main)] dark:text-slate-300">
                                                {user.scan_limit_per_day === -1 ? 'Ilimitado' : `${user.scan_limit_per_day} scans/dia`}
                                            </span>
                                            <span className={`text-[10px] font-medium ${user.role === 'admin' || user.role === 'super_admin' ? 'text-purple-600' : 'text-[#718096]'}`}>
                                                {user.role === 'admin' ? 'Administrador' : user.role === 'super_admin' ? 'Super Admin' : 'Usuário Padrão'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {(() => {
                                                const now = new Date();
                                                const isExpired = user.data_expiracao ? new Date(user.data_expiracao) < now : true;
                                                const isPro = user.plano_status === 'ativo';
                                                
                                                if (isPro && !isExpired) {
                                                    return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1.5 w-fit uppercase tracking-wider">🟢 PRO Ativo</span>;
                                                } else if (isPro && isExpired) {
                                                    return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-1.5 w-fit uppercase tracking-wider">🔴 PRO Expirado</span>;
                                                } else {
                                                    return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1.5 w-fit uppercase tracking-wider">⚪ Sem Plano</span>;
                                                }
                                            })()}
                                            {user.data_expiracao && (
                                                <span className="text-[10px] text-gray-400 font-medium">Exp: {new Date(user.data_expiracao).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleSendBilling(user.id)}
                                                disabled={sendingBillingId === user.id}
                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors disabled:opacity-50"
                                                title="Enviar Cobrança"
                                            >
                                                {sendingBillingId === user.id ? <Clock size={16} className="animate-spin" /> : <CreditCard size={16} />}
                                            </button>
                                            
                                            {!user.is_influencer && (
                                                <button 
                                                    onClick={() => handleMakeInfluencer(user)}
                                                    className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-colors"
                                                    title="Tornar Influenciador"
                                                >
                                                    <Star size={16} />
                                                </button>
                                            )}
                                            {user.is_influencer && (
                                                activeTab === 'influencers' ? (
                                                    <button
                                                        onClick={() => handleRemoveInfluencer(user)}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors"
                                                        title="Remover Influenciador"
                                                        aria-label={`Remover ${user.name || user.email} dos influenciadores`}
                                                    >
                                                        <UserX size={16} />
                                                    </button>
                                                ) : (
                                                    <div className="p-1.5 text-amber-500 bg-amber-50 dark:bg-amber-500/10 rounded-md" title="Influenciador VIP">
                                                        <Award size={16} />
                                                    </div>
                                                )
                                            )}

                                            <button 
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setNewLimit(user.scan_limit_per_day);
                                                    setIsLimitModalOpen(true);
                                                }}
                                                className="p-1.5 text-[#3182CE] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors" 
                                                title="Gerenciar Limites"
                                            >
                                                <Settings size={16} />
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        await api.admin.toggleUserStatus(user.id, !user.is_active);
                                                        fetchData();
                                                    } catch (err) {
                                                        console.error('Error toggling status:', err);
                                                    }
                                                }}
                                                className={`p-1.5 rounded-md transition-colors ${user.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                                title={user.is_active ? 'Bloquear' : 'Desbloquear'}
                                            >
                                                {user.is_active ? <Ban size={16} /> : <UserCheck size={16} />}
                                            </button>
                                            <button 
                                                onClick={() => navigate(`/admin/users/${user.id}`)}
                                                className="p-1.5 text-[#4A5568] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors" 
                                                title="Ver Perfil"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(user.id)}
                                                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors" 
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Limites */}
            {isLimitModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--bg-card)] dark:bg-[#1E293B] w-full max-w-md rounded-[20px] shadow-2xl p-6 border border-[#E6EAF0] dark:border-[#334155]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[#1A202C] dark:text-white">Gerenciar Limites</h2>
                            <button onClick={() => setIsLimitModalOpen(false)} className="text-[#A0AEC0] hover:text-[var(--text-muted)] transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-main)] dark:text-slate-300 mb-2">Limite de scans por dia</label>
                                <select 
                                    value={newLimit}
                                    onChange={(e) => setNewLimit(parseInt(e.target.value))}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38A169]/20"
                                >
                                    <option value={3}>3 scans (Padrão)</option>
                                    <option value={5}>5 scans</option>
                                    <option value={10}>10 scans</option>
                                    <option value={20}>20 scans</option>
                                    <option value={-1}>Ilimitado</option>
                                </select>
                            </div>
                            
                            <div className="pt-4 flex gap-3">
                                <button 
                                    onClick={() => setIsLimitModalOpen(false)}
                                    className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-[#4A5568] dark:text-slate-400 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleUpdateLimit}
                                    className="flex-1 py-3 bg-[#38A169] text-white font-bold rounded-xl hover:bg-[#2F855A] shadow-md transition-all active:scale-95"
                                >
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Convite */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--bg-card)] dark:bg-[#1E293B] w-full max-w-md rounded-[20px] shadow-2xl p-6 border border-[#E6EAF0] dark:border-[#334155]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[#1A202C] dark:text-white">Convidar Novo Usuário</h2>
                            <button onClick={() => setIsInviteModalOpen(false)} className="text-[#A0AEC0] hover:text-[var(--text-muted)] transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {!inviteSuccess ? (
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-main)] dark:text-slate-300 mb-2">Nome Completo</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={inviteForm.name}
                                        onChange={(e) => setInviteForm({...inviteForm, name: e.target.value})}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38A169]/20"
                                        placeholder="Digite o nome do usuário"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-main)] dark:text-slate-300 mb-2">Email</label>
                                    <input 
                                        type="email" 
                                        required
                                        value={inviteForm.email}
                                        onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38A169]/20"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-sm font-bold text-[var(--text-main)] dark:text-slate-300">Tipo de Conta</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setInviteForm({ ...inviteForm, type: 'normal' })}
                                            className={`p-3 rounded-xl border text-[13px] font-bold transition-all flex flex-col items-center gap-1 ${inviteForm.type === 'normal' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                        >
                                            <User size={18} />
                                            <span>Usuário Padrão</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setInviteForm({ ...inviteForm, type: 'influencer' })}
                                            className={`p-3 rounded-xl border text-[13px] font-bold transition-all flex flex-col items-center gap-1 ${inviteForm.type === 'influencer' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                        >
                                            <Star size={18} />
                                            <span>Influenciador VIP</span>
                                        </button>
                                    </div>
                                    {inviteForm.type === 'normal' && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="block text-sm font-bold text-[var(--text-main)] dark:text-slate-300 mb-2">Limite de Scans Diários</label>
                                            <select 
                                                value={inviteForm.limit}
                                                onChange={(e) => setInviteForm({...inviteForm, limit: parseInt(e.target.value)})}
                                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38A169]/20 transition-all font-semibold"
                                            >
                                                <option value={3}>3 scans (Padrão)</option>
                                                <option value={5}>5 scans</option>
                                                <option value={10}>10 scans</option>
                                                <option value={-1}>Ilimitado</option>
                                            </select>
                                        </div>
                                    )}
                                    <p className="text-[11px] text-slate-400">
                                        {inviteForm.type === 'normal' 
                                            ? `Gera um link de convite com limite de ${inviteForm.limit === -1 ? 'scans ilimitados' : inviteForm.limit + ' scans/dia'}.` 
                                            : 'Envia e-mail automático com acesso PRO vitalício e gratuito.'}
                                    </p>
                                </div>
                                
                                <div className="pt-4">
                                    <button 
                                        type="submit"
                                        className="w-full py-3 bg-[#38A169] text-white font-bold rounded-xl hover:bg-[#2F855A] shadow-md transition-all active:scale-95"
                                    >
                                        Enviar Convite
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center py-4 space-y-4">
                                <div className="w-16 h-16 bg-[#F0F9EB] text-[#38A169] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="font-bold text-lg">{inviteForm.type === 'influencer' ? 'E-mail Enviado!' : 'Convite Gerado!'}</h3>
                                <p className="text-sm text-[var(--text-muted)] dark:text-slate-400">
                                    {inviteForm.type === 'influencer' 
                                        ? 'O convite VIP foi enviado para o e-mail do influenciador com instruções de ativação.' 
                                        : 'O convite foi gerado. Copie o link abaixo para enviar manualmente caso o e-mail atrase.'}
                                </p>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 break-all text-xs font-mono">
                                    {inviteForm.type === 'influencer' ? '✅ Convite influenciador processado' : inviteSuccess}
                                </div>
                                {inviteForm.type !== 'influencer' && (
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(inviteSuccess || '');
                                            setConfirmOptions({
                                                isOpen: true,
                                                title: 'Sucesso',
                                                message: 'Link copiado!',
                                                type: 'success',
                                                confirmText: 'OK',
                                                showCancel: false,
                                                onConfirm: async () => {}
                                            });
                                        }}
                                        className="w-full py-3 bg-[#E6FFFA] text-[#38A169] font-bold rounded-xl hover:bg-[#B2F5EA] transition-colors"
                                    >
                                        Copiar Link
                                    </button>
                                )}
                                <button 
                                    onClick={() => setIsInviteModalOpen(false)}
                                    className="w-full py-3 text-[var(--text-muted)] font-semibold"
                                >
                                    Fechar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={confirmOptions.isOpen}
                onClose={closeConfirm}
                title={confirmOptions.title}
                message={confirmOptions.message}
                type={confirmOptions.type}
                confirmText={confirmOptions.confirmText}
                showCancel={confirmOptions.showCancel}
                onConfirm={confirmOptions.onConfirm}
            />
        </div>
    );
};

export default AdminUsers;
