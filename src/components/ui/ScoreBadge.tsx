import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { RatingClass } from '@/types/api';

const STYLES: Record<RatingClass, string> = {
  EXCELLENT: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
  BON: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30',
  MOYEN: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
  FAIBLE: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
};

/**
 * Score de performance sur 100.
 *
 * Un score absent n'est pas un zero : c'est le cas d'un chauffeur avec
 * moins de trois missions dans le mois, pour lequel le backend refuse
 * volontairement de calculer une note (RG-9.8).
 */
export function ScoreBadge({ score, ratingClass }: { score: number | null; ratingClass: RatingClass }) {
  const { t } = useTranslation();
  if (score === null) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">{t('status.ratingClass.insufficientActivity')}</span>;
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
      STYLES[ratingClass],
    )}>
      <span className="tabular">{Math.round(score)}/100</span>
      <span className="opacity-70">{t(`status.ratingClass.${ratingClass}`)}</span>
    </span>
  );
}
