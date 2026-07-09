import React, { useState, useEffect } from 'react';
import {
  Plus, Ticket, Trash2, CheckCircle, XCircle, Search,
  BarChart3, TrendingUp, Users, Calendar, Tag, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const card = 'bg-[#1E293B] border border-[#334155] rounded-2xl';
const inputCls = 'w-full bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30 transition-all';

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    code: '', discount_type: 'percent', discount_value: '',
    max_uses: '', expires_at: '', influencer_name: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [couponsRes, statsRes] = await Promise.all([
        api.coupons.list(),
        api.coupons.getInfluencerStats(),
      ]);
      setCoupons(couponsRes);
      setStats(statsRes);
    } catch {
      toast.error('Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    const tid = toast.loading('Gerando cupom...');
    try {
      await api.coupons.create({
        code: formData.code,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        expires_at: formData.expires_at || null,
        influencer_id: formData.influencer_name || null,
      });
      toast.success('Cupom criado! 🎉', { id: tid });
      setShowCreateModal(false);
      setFormData({ code: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '', influencer_name: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar cupom', { id: tid });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await api.coupons.toggleStatus(id, !current);
      toast.success(`Cupom ${!current ? 'ativado' : 'desativado'}!`);
      fetchData();
    } catch {
      toast.error('Falha ao atualizar status');
    }
  };

  const filteredCoupons = coupons.filter(c =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.influencer_name && c.influencer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-white tracking-tight flex items-center gap-3">
            <Ticket className="text-[#22C55E]" size={24} />
            Gestão de Cupons
          </h1>
          <p className="text-[14px] text-slate-400 mt-0.5">Crie promoções e rastreie o desempenho de influenciadores.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-xl font-bold text-[13px] transition-all shadow-lg shadow-[#22C55E]/20 active:scale-95"
        >
          <Plus size={16} /> Criar Cupom
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total de Usos',           value: coupons.reduce((a, c) => a + (c.used_count || 0), 0), icon: TrendingUp, color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/15' },
          { label: 'Influenciadores Ativos',  value: stats.length,                                          icon: Users,      color: 'text-blue-400',   bg: 'bg-blue-500/15'  },
          { label: 'Conversão Média',         value: '12.4%',                                               icon: BarChart3,  color: 'text-purple-400', bg: 'bg-purple-500/15'},
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`${card} p-5 flex items-center gap-4`}>
            <div className={`w-12 h-12 ${s.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
              <s.icon size={22} className={s.color} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
              <p className={`text-[26px] font-black ${s.color} leading-none mt-1`}>{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* List */}
      <div className={`${card} overflow-hidden`}>
        <div className="p-5 border-b border-[#334155] flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Buscar cupom ou influenciador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`${inputCls} pl-9`}
            />
          </div>
          <button onClick={fetchData} className="p-2.5 rounded-xl border border-[#334155] text-slate-400 hover:text-[#22C55E] hover:border-[#22C55E]/40 transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#334155]">
                {['Cupom', 'Desconto', 'Influenciador', 'Usos', 'Validade', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/50">
              {filteredCoupons.map(coupon => (
                <tr key={coupon.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#22C55E]/15 rounded-xl flex items-center justify-center text-[#22C55E] font-black text-xs">
                        {coupon.code.substring(0, 2)}
                      </div>
                      <span className="font-bold text-white tracking-wide text-[13px]">{coupon.code}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#22C55E]/15 text-[#22C55E] rounded-full text-[11px] font-bold">
                      <Tag size={11} />
                      {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `${coupon.discount_value} MZN`}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {coupon.influencer_name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 text-[10px] font-bold">
                          {coupon.influencer_name.charAt(0)}
                        </div>
                        <span className="text-[13px] font-medium text-slate-300">{coupon.influencer_name}</span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-slate-500 italic">Geral</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <span className="text-[12px] font-bold text-slate-300">
                        {coupon.used_count || 0}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''} usos
                      </span>
                      {coupon.max_uses && (
                        <div className="w-20 h-1.5 bg-[#334155] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#22C55E] rounded-full"
                            style={{ width: `${Math.min(100, (coupon.used_count / coupon.max_uses) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[12px] font-medium text-slate-400">
                      {coupon.expires_at ? dayjs(coupon.expires_at).format('DD/MM/YYYY') : 'Permanente'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggleStatus(coupon.id, coupon.active)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                        coupon.active
                          ? 'bg-[#22C55E]/15 text-[#22C55E] hover:bg-[#22C55E]/25'
                          : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                      }`}
                    >
                      {coupon.active ? <CheckCircle size={13} /> : <XCircle size={13} />}
                      {coupon.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <button className="p-2 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-[13px]">
                    {loading ? 'A carregar cupons...' : 'Nenhum cupom encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Cupom */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-lg bg-[#1E293B] border border-[#334155] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-bold text-white">Novo Cupom Promocional</h2>
                  <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white transition-colors">
                    <XCircle size={22} />
                  </button>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código</label>
                      <input required type="text" className={`${inputCls} uppercase tracking-widest font-bold`}
                        placeholder="EX: PROFIT10" value={formData.code}
                        onChange={e => setFormData({ ...formData, code: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</label>
                      <select className={inputCls} value={formData.discount_type}
                        onChange={e => setFormData({ ...formData, discount_type: e.target.value })}>
                        <option value="percent">Porcentagem (%)</option>
                        <option value="fixed">Valor Fixo (MZN)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</label>
                      <input required type="number" className={inputCls} placeholder="Ex: 10"
                        value={formData.discount_value}
                        onChange={e => setFormData({ ...formData, discount_value: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Limite de Usos</label>
                      <input type="number" className={inputCls} placeholder="Opcional"
                        value={formData.max_uses}
                        onChange={e => setFormData({ ...formData, max_uses: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validade</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                        <input type="date" className={`${inputCls} pl-9 [color-scheme:dark]`}
                          value={formData.expires_at}
                          onChange={e => setFormData({ ...formData, expires_at: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Influenciador</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                        <input type="text" className={`${inputCls} pl-9`} placeholder="Nome ou ID"
                          value={formData.influencer_name}
                          onChange={e => setFormData({ ...formData, influencer_name: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={isCreating}
                    className="w-full py-3.5 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-xl font-bold text-[14px] mt-2 shadow-lg shadow-[#22C55E]/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {isCreating
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando...</>
                      : 'Gerar Cupom Agora'
                    }
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCoupons;
