import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/motion';

interface StatCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  /** Variation en pourcentage par rapport a la periode precedente. */
  variation?: number | null;
  /** Vrai si une baisse est une bonne nouvelle : couts, consommation. */
  lowerIsBetter?: boolean;
  hint?: string;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
}

const ACCENTS = {
  blue:  'bg-accent-soft text-accent dark:bg-accent/15',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  red:   'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
};

/**
 * Carte d'indicateur des tetes d'ecran.
 *
 * La variation porte un sens metier : une baisse de consommation est
 * une bonne nouvelle, une baisse de chiffre d'affaires non. D'ou
 * lowerIsBetter, qui inverse la couleur sans changer la fleche.
 *
 * L'entree utilise fadeInUp : place plusieurs StatCard dans un
 * conteneur portant staggerContainer (voir lib/motion.ts) pour qu'elles
 * apparaissent l'une apres l'autre plutot que toutes en meme temps —
 * c'est ce petit decalage qui rend un tableau de bord vivant sans
 * qu'aucun element individuel n'attire l'oeil pour de mauvaises raisons.
 */
export function StatCard({
  label, value, icon: Icon, variation, lowerIsBetter = false, hint, accent = 'blue',
}: StatCardProps) {
  const { t } = useTranslation();
  const hasVariation = variation !== null && variation !== undefined && variation !== 0;
  const isUp = (variation ?? 0) > 0;
  const isGood = lowerIsBetter ? !isUp : isUp;

  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -2 }}
      transition={{ y: { duration: 0.15 } }}
      className="card-padded"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tabular text-slate-900 dark:text-slate-100">{value}</p>

          {hasVariation && (
            <p className={cn(
              'mt-1.5 flex items-center gap-1 text-xs font-medium',
              isGood ? 'text-emerald-600' : 'text-red-600',
            )}>
              {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {t('statCard.vsPreviousPeriod', { value: Math.abs(variation!).toFixed(1).replace('.', t('statCard.decimalSeparator')) })}
            </p>
          )}

          {hint && !hasVariation && <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
        </div>

        {Icon && (
          <div className={cn('rounded-lg p-2.5', ACCENTS[accent])}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
