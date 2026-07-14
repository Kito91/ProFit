import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Lock,
  RefreshCw,
  Star,
  Target,
  Trophy,
  Utensils,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

type Achievement = {
  id: string | number;
  name: string;
  description: string;
  icon_name?: string;
};

type EarnedAchievement = {
  id?: string | number;
  achievement_id?: string | number;
  earned_at?: string;
};

type AchievementIcon = React.ComponentType<{ className?: string }>;
type PaginationItem = number | 'left-ellipsis' | 'right-ellipsis';

const ACHIEVEMENTS_PER_PAGE = 6;

const iconMap: Record<string, AchievementIcon> = {
  award: Award,
  crown: Crown,
  star: Star,
  target: Target,
  trophy: Trophy,
  utensils: Utensils,
  zap: Zap,
};

const earnedIconStyles = [
  'from-emerald-400 to-green-600 shadow-emerald-500/20',
  'from-amber-300 to-orange-500 shadow-amber-500/20',
  'from-violet-400 to-indigo-600 shadow-violet-500/20',
  'from-sky-400 to-blue-600 shadow-sky-500/20',
];

const getPaginationItems = (currentPage: number, totalPages: number): PaginationItem[] => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PaginationItem[] = [1];
  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

  if (rangeStart > 2) items.push('left-ellipsis');
  for (let page = rangeStart; page <= rangeEnd; page += 1) items.push(page);
  if (rangeEnd < totalPages - 1) items.push('right-ellipsis');

  items.push(totalPages);
  return items;
};

export const Achievements = () => {
  const navigate = useNavigate();
  const collectionRef = useRef<HTMLElement>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userEarned, setUserEarned] = useState<EarnedAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [all, mine] = await Promise.all([
        api.achievements.getAll(),
        api.achievements.getMy(),
      ]);

      setAchievements(Array.isArray(all) ? all : []);
      setUserEarned(Array.isArray(mine) ? mine : []);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load achievements', err);
      setError('Não foi possível carregar as conquistas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const earnedById = useMemo(() => {
    const earnedMap = new Map<string, EarnedAchievement>();

    userEarned.forEach((earned) => {
      if (earned.achievement_id !== undefined) {
        earnedMap.set(String(earned.achievement_id), earned);
      }
      if (earned.id !== undefined) {
        earnedMap.set(String(earned.id), earned);
      }
    });

    return earnedMap;
  }, [userEarned]);

  const earnedCount = useMemo(
    () => achievements.filter((achievement) => earnedById.has(String(achievement.id))).length,
    [achievements, earnedById],
  );
  const prioritizedAchievements = useMemo(
    () => [...achievements].sort((first, second) => {
      const firstIsEarned = earnedById.has(String(first.id));
      const secondIsEarned = earnedById.has(String(second.id));

      return Number(secondIsEarned) - Number(firstIsEarned);
    }),
    [achievements, earnedById],
  );
  const lockedCount = Math.max(achievements.length - earnedCount, 0);
  const progress = achievements.length > 0
    ? Math.round((earnedCount / achievements.length) * 100)
    : 0;
  const totalPages = Math.max(1, Math.ceil(achievements.length / ACHIEVEMENTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const firstAchievementIndex = (safeCurrentPage - 1) * ACHIEVEMENTS_PER_PAGE;
  const paginatedAchievements = prioritizedAchievements.slice(
    firstAchievementIndex,
    firstAchievementIndex + ACHIEVEMENTS_PER_PAGE,
  );
  const paginationItems = getPaginationItems(safeCurrentPage, totalPages);
  const lastVisibleAchievement = Math.min(
    firstAchievementIndex + ACHIEVEMENTS_PER_PAGE,
    achievements.length,
  );

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrentPage) return;

    setCurrentPage(page);
    requestAnimationFrame(() => {
      collectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const formatEarnedDate = (earnedAt?: string) => {
    if (!earnedAt) return 'Conquista desbloqueada';

    const date = new Date(earnedAt);
    if (Number.isNaN(date.getTime())) return 'Conquista desbloqueada';

    return `Conquistada em ${date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}`;
  };

  if (isLoading) {
    return (
      <div className="main-wrapper bg-[#0A0F14]">
        <div className="app-container flex min-h-screen items-center justify-center bg-[#0A0F14]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-white/10 border-t-[#22C55E]" />
            <p className="text-[13px] font-semibold text-slate-500">A carregar conquistas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-wrapper bg-[#0A0F14]">
      <div className="app-container min-h-screen bg-[#0A0F14] pb-28 text-white shadow-none">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0A0F14]/95 px-5 pb-4 pt-10 backdrop-blur-xl">
          <div className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-[#111827] text-slate-200 transition-all active:scale-90"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="min-w-0 text-center">
              <h1 className="text-[20px] font-black tracking-tight">Conquistas</h1>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Sua jornada ProFit
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
              <Trophy className="h-5 w-5" />
            </div>
          </div>
        </header>

        <main className="space-y-7 px-5 pt-5">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-[28px] border border-emerald-400/15 bg-gradient-to-br from-[#15251E] via-[#111C18] to-[#111827] p-5 shadow-[0_20px_50px_-28px_rgba(34,197,94,0.55)]"
          >
            <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-green-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5">
                    <Award className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
                      Progresso geral
                    </span>
                  </div>
                  <h2 className="max-w-[260px] text-[23px] font-black leading-tight tracking-tight">
                    Cada hábito conta para a sua evolução.
                  </h2>
                  <p className="mt-2 max-w-[300px] text-[12px] font-medium leading-relaxed text-slate-400">
                    Continue a cumprir as suas metas para completar a coleção de emblemas.
                  </p>
                </div>

                <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 shadow-inner">
                  <span className="text-[22px] font-black text-emerald-400">{progress}%</span>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">completo</span>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 shadow-[0_0_14px_rgba(74,222,128,0.45)]"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.06] bg-black/15 p-3.5">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-[20px] font-black leading-none">{earnedCount}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Desbloqueadas</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-black/15 p-3.5">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Lock className="h-4 w-4" />
                    <span className="text-[20px] font-black leading-none">{lockedCount}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Por conquistar</p>
                </div>
              </div>
            </div>
          </motion.section>

          <section ref={collectionRef} className="scroll-mt-28">
            <div className="mb-4 flex items-end justify-between gap-4 px-1">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">Coleção</p>
                <h2 className="mt-1 text-[20px] font-black tracking-tight">Seus emblemas</h2>
              </div>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {earnedCount}/{achievements.length}
              </span>
            </div>

            {error ? (
              <div className="rounded-[24px] border border-red-400/15 bg-red-400/[0.06] p-7 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10 text-red-400">
                  <Award className="h-6 w-6" />
                </div>
                <p className="mt-4 text-[14px] font-bold text-slate-200">{error}</p>
                <button
                  type="button"
                  onClick={fetchData}
                  className="mx-auto mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-bold text-slate-300 transition-colors hover:bg-white/[0.08]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </button>
              </div>
            ) : achievements.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-[#111827]/60 p-9 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-600">
                  <Trophy className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-[15px] font-bold text-slate-300">Nenhuma conquista disponível</h3>
                <p className="mt-1 text-[12px] text-slate-500">Novos desafios aparecerão aqui.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {paginatedAchievements.map((achievement, index) => {
                  const earnedRecord = earnedById.get(String(achievement.id));
                  const isEarned = !!earnedRecord;
                  const Icon = iconMap[String(achievement.icon_name || '').toLowerCase()] || Award;
                  const absoluteIndex = firstAchievementIndex + index;
                  const earnedIconStyle = earnedIconStyles[absoluteIndex % earnedIconStyles.length];

                  return (
                    <motion.article
                      key={achievement.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.35,
                        delay: Math.min(index * 0.06, 0.42),
                        ease: 'easeOut',
                      }}
                      className={`relative overflow-hidden rounded-[24px] border p-4 transition-colors ${
                        isEarned
                          ? 'border-emerald-400/15 bg-[#111827]'
                          : 'border-white/[0.05] bg-[#0E151F]'
                      }`}
                    >
                      {isEarned && (
                        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-400/[0.07] blur-2xl" />
                      )}

                      <div className="relative flex items-start gap-4">
                        <div
                          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${
                            isEarned
                              ? `bg-gradient-to-br text-white shadow-lg ${earnedIconStyle}`
                              : 'border border-white/[0.06] bg-white/[0.03] text-slate-600'
                          }`}
                        >
                          {isEarned ? <Icon className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={`text-[15px] font-black leading-tight ${isEarned ? 'text-white' : 'text-slate-500'}`}>
                              {achievement.name}
                            </h3>
                            {isEarned && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />}
                          </div>
                          <p className={`mt-1.5 text-[12px] leading-relaxed ${isEarned ? 'text-slate-400' : 'text-slate-600'}`}>
                            {achievement.description}
                          </p>
                        </div>
                      </div>

                      <div className="relative mt-4 border-t border-white/[0.05] pt-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
                            isEarned
                              ? 'bg-emerald-400/10 text-emerald-400'
                              : 'bg-white/[0.03] text-slate-600'
                          }`}
                        >
                          {isEarned ? formatEarnedDate(earnedRecord.earned_at) : 'Bloqueada'}
                        </span>
                      </div>
                    </motion.article>
                  );
                })}
                </div>

                {totalPages > 1 && (
                  <nav className="mt-5" aria-label="Paginação das conquistas">
                    <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                      Desafios {firstAchievementIndex + 1}–{lastVisibleAchievement} de {achievements.length}
                    </p>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handlePageChange(safeCurrentPage - 1)}
                        disabled={safeCurrentPage === 1}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-[#111827] text-slate-400 transition-all hover:border-emerald-400/25 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      {paginationItems.map((item) => (
                        typeof item === 'number' ? (
                          <button
                            key={item}
                            type="button"
                            onClick={() => handlePageChange(item)}
                            aria-current={item === safeCurrentPage ? 'page' : undefined}
                            className={`h-9 min-w-9 rounded-xl px-2 text-[12px] font-black transition-all ${
                              item === safeCurrentPage
                                ? 'bg-emerald-500 text-white shadow-[0_8px_18px_-8px_rgba(34,197,94,0.8)]'
                                : 'border border-white/[0.07] bg-[#111827] text-slate-500 hover:border-emerald-400/25 hover:text-emerald-400'
                            }`}
                          >
                            {item}
                          </button>
                        ) : (
                          <span key={item} className="flex h-9 w-5 items-center justify-center text-[12px] font-bold text-slate-700">
                            ···
                          </span>
                        )
                      ))}

                      <button
                        type="button"
                        onClick={() => handlePageChange(safeCurrentPage + 1)}
                        disabled={safeCurrentPage === totalPages}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-[#111827] text-slate-400 transition-all hover:border-emerald-400/25 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Próxima página"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};
