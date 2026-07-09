import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Plus, Trash2, Edit2, Clock, Save, X, Check, Dumbbell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const DAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DAYS_FULL  = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
  'Sexta-feira', 'Sábado', 'Domingo'
];

const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Pernas', 'Ombros',
  'Bíceps', 'Tríceps', 'Core', 'Glúteos', 'Full Body', 'Cardio'
];

const SETS_OPTIONS = ['2', '3', '4', '5', '6'];
const REPS_OPTIONS = ['6', '8', '10', '12', '15', '20'];
const REST_OPTIONS = ['30s', '45s', '60s', '90s', '2min'];

interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  rest: string;
}

const DRAFT_KEY = 'manual_workout_draft_v3';

export const ManualWorkoutCreator: React.FC = () => {
  const navigate = useNavigate();

  const [planName,      setPlanName]      = useState('Meu Treino');
  const [selectedDays,  setSelectedDays]  = useState<number[]>([]);
  const [workoutTime,   setWorkoutTime]   = useState('07:00');
  const [muscleGroup,   setMuscleGroup]   = useState('');
  const [exercises,     setExercises]     = useState<Exercise[]>([]);
  const [isSaving,      setIsSaving]      = useState(false);

  // bottom sheet
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [exForm, setExForm] = useState({ name: '', sets: '3', reps: '10', rest: '60s' });

  // ── Load draft or existing custom workout ────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        setPlanName(d.planName       ?? 'Meu Treino');
        setSelectedDays(d.selectedDays ?? []);
        setWorkoutTime(d.workoutTime   ?? '07:00');
        setMuscleGroup(d.muscleGroup   ?? '');
        setExercises(d.exercises       ?? []);
        return;
      } catch (_) {}
    }
    api.customWorkouts.list().then((list: any[]) => {
      if (!Array.isArray(list) || list.length === 0) return;
      const w = list[0];
      setPlanName(w.name ?? 'Meu Treino');
      setWorkoutTime(w.workout_time ?? '07:00');
      setMuscleGroup(w.muscle_group ?? '');
      if (Array.isArray(w.exercises)) setExercises(w.exercises);
      if (Array.isArray(w.days)) setSelectedDays(w.days);
    }).catch(() => {});
  }, []);

  // ── Persist draft ────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      planName, selectedDays, workoutTime, muscleGroup, exercises
    }));
  }, [planName, selectedDays, workoutTime, muscleGroup, exercises]);

  // ── Day toggle ───────────────────────────────────────────────────────────
  const toggleDay = (i: number) =>
    setSelectedDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i]);

  // ── Exercise sheet ───────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingId(null);
    setExForm({ name: '', sets: '3', reps: '10', rest: '60s' });
    setSheetOpen(true);
  };

  const openEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setExForm({ name: ex.name, sets: ex.sets, reps: ex.reps, rest: ex.rest });
    setSheetOpen(true);
  };

  const confirmExercise = () => {
    if (!exForm.name.trim()) { toast.error('Digite o nome do exercício'); return; }
    if (editingId) {
      setExercises(prev => prev.map(ex => ex.id === editingId ? { ...ex, ...exForm } : ex));
    } else {
      setExercises(prev => [...prev, { ...exForm, id: Date.now().toString() }]);
    }
    setSheetOpen(false);
  };

  const removeExercise = (id: string) =>
    setExercises(prev => prev.filter(ex => ex.id !== id));

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (selectedDays.length === 0) { toast.error('Selecione pelo menos um dia de treino'); return; }
    if (exercises.length === 0)    { toast.error('Adicione pelo menos um exercício');       return; }

    setIsSaving(true);
    try {
      await api.customWorkouts.create({
        name:         planName,
        workout_time: workoutTime,
        muscle_group: muscleGroup,
        exercises:    exercises.map(({ id, ...ex }) => ex),
        days:         selectedDays,
      } as any);

      toast.success('Treino salvo com sucesso! 💪');
      localStorage.removeItem(DRAFT_KEY);
      navigate('/workout');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao salvar treino');
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0F14] text-white pb-28 font-sans">

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-[#0A0F14]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-md mx-auto px-5 h-[60px] flex items-center gap-3">
          <button
            onClick={() => navigate('/workout')}
            className="p-2 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-[17px] font-bold leading-tight">Adicionar Treino</h1>
            <p className="text-[12px] text-slate-500">Configure sua rotina</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pt-6 space-y-7">

        {/* ── Nome do plano ── */}
        <section className="space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Nome do Plano</label>
          <input
            type="text"
            value={planName}
            onChange={e => setPlanName(e.target.value)}
            placeholder="Ex: Treino de Força"
            className="w-full h-12 bg-white/5 rounded-2xl px-4 text-[15px] font-medium border border-white/10 outline-none focus:border-[#56AB2F]/50 transition-all placeholder:text-slate-700"
          />
        </section>

        {/* ── Dias de treino ── */}
        <section className="space-y-3">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Dias de Treino</label>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS_SHORT.map((day, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`h-11 rounded-2xl text-[11px] font-black transition-all active:scale-90 flex items-center justify-center ${
                  selectedDays.includes(i)
                    ? 'bg-[#56AB2F] text-white shadow-lg shadow-[#56AB2F]/25'
                    : 'bg-white/5 text-slate-500 border border-white/10'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-slate-600 text-center">
            {selectedDays.length === 0
              ? 'Toque nos dias para selecionar'
              : `${selectedDays.length} dia${selectedDays.length > 1 ? 's' : ''} selecionado${selectedDays.length > 1 ? 's' : ''}`}
          </p>
        </section>

        {/* ── Horário do treino ── */}
        <section className="space-y-3">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Horário do Treino</label>
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 h-14 border border-white/10 focus-within:border-[#56AB2F]/50 transition-all">
            <Clock className="w-5 h-5 text-[#56AB2F] flex-shrink-0" />
            <input
              type="time"
              value={workoutTime}
              onChange={e => setWorkoutTime(e.target.value)}
              className="flex-1 bg-transparent text-[17px] font-bold outline-none [color-scheme:dark]"
            />
          </div>
        </section>

        {/* ── Grupo muscular ── */}
        <section className="space-y-3">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Grupo Muscular</label>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map(mg => (
              <button
                key={mg}
                onClick={() => setMuscleGroup(prev => prev === mg ? '' : mg)}
                className={`px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-90 ${
                  muscleGroup === mg
                    ? 'bg-[#56AB2F] text-white shadow-md shadow-[#56AB2F]/20'
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
              >
                {mg}
              </button>
            ))}
          </div>
        </section>

        {/* ── Exercícios ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Exercícios</label>
            {exercises.length > 0 && (
              <span className="text-[11px] font-bold text-[#56AB2F] bg-[#56AB2F]/10 px-2 py-0.5 rounded-lg">
                {exercises.length} adicionado{exercises.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <AnimatePresence mode="popLayout">
            {exercises.map((ex, i) => (
              <motion.div
                key={ex.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white/[0.04] rounded-2xl p-4 border border-white/[0.06] flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-[#56AB2F]/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-[12px] font-black text-[#56AB2F]">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold truncate">{ex.name}</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    {ex.sets} séries · {ex.reps} reps · {ex.rest}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => openEdit(ex)}
                    className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 active:scale-90 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeExercise(ex.id)}
                    className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 active:scale-90 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {exercises.length === 0 && (
            <div className="py-10 flex flex-col items-center gap-3 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
              <Dumbbell className="w-8 h-8 text-slate-700" />
              <p className="text-[13px] text-slate-600 font-medium">Nenhum exercício adicionado</p>
            </div>
          )}

          <button
            onClick={openAdd}
            className="w-full h-12 rounded-2xl border-2 border-dashed border-[#56AB2F]/30 text-[#56AB2F] font-bold text-[13px] flex items-center justify-center gap-2 hover:border-[#56AB2F]/60 hover:bg-[#56AB2F]/5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Adicionar Exercício
          </button>
        </section>

      </div>

      {/* ── Botão Salvar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-md mx-auto px-5 pb-6 pt-4 bg-gradient-to-t from-[#0A0F14] via-[#0A0F14]/95 to-transparent">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-[52px] bg-[#56AB2F] text-white rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-xl shadow-[#56AB2F]/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSaving
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Save className="w-5 h-5" /> Salvar Treino</>
            }
          </button>
        </div>
      </div>

      {/* ── Bottom Sheet: Adicionar/Editar Exercício ── */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D131A] rounded-t-[28px] border-t border-white/10 p-6 pb-10"
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[17px] font-bold">{editingId ? 'Editar' : 'Novo'} Exercício</h3>
                <button onClick={() => setSheetOpen(false)} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Nome */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Nome</label>
                  <input
                    type="text"
                    value={exForm.name}
                    onChange={e => setExForm({ ...exForm, name: e.target.value })}
                    placeholder="Ex: Supino Reto"
                    autoFocus
                    className="w-full h-12 bg-white/5 rounded-xl px-4 text-[15px] font-medium border border-white/10 outline-none focus:border-[#56AB2F]/50 transition-all placeholder:text-slate-700"
                  />
                </div>

                {/* Séries */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Séries</label>
                  <div className="flex gap-2">
                    {SETS_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => setExForm({ ...exForm, sets: s })}
                        className={`flex-1 h-10 rounded-xl text-[14px] font-bold transition-all active:scale-90 ${
                          exForm.sets === s
                            ? 'bg-[#56AB2F] text-white'
                            : 'bg-white/5 text-slate-400 border border-white/10'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Repetições */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Repetições</label>
                  <div className="flex gap-2">
                    {REPS_OPTIONS.map(r => (
                      <button
                        key={r}
                        onClick={() => setExForm({ ...exForm, reps: r })}
                        className={`flex-1 h-10 rounded-xl text-[13px] font-bold transition-all active:scale-90 ${
                          exForm.reps === r
                            ? 'bg-[#56AB2F] text-white'
                            : 'bg-white/5 text-slate-400 border border-white/10'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descanso */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Descanso</label>
                  <div className="flex gap-2">
                    {REST_OPTIONS.map(r => (
                      <button
                        key={r}
                        onClick={() => setExForm({ ...exForm, rest: r })}
                        className={`flex-1 h-10 rounded-xl text-[12px] font-bold transition-all active:scale-90 ${
                          exForm.rest === r
                            ? 'bg-[#56AB2F] text-white'
                            : 'bg-white/5 text-slate-400 border border-white/10'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={confirmExercise}
                  className="w-full h-12 bg-[#56AB2F] text-white rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-[#56AB2F]/20 active:scale-95 transition-all"
                >
                  <Check className="w-5 h-5" />
                  Confirmar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
