import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { FuelLogStatus } from '@/types/api';

const STYLES: Record<FuelLogStatus, string> = {
  VALIDE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
  ANOMALIE: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
  ANNULE: 'bg-slate-100 text-slate-500 ring-slate-400/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30',
};

export function FuelLogStatusBadge({ status }: { status: FuelLogStatus }) {
  const { t } = useTranslation();
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
      STYLES[status],
    )}>
      {t(`status.fuelLogStatus.${status}`)}
    </span>
  );
}
