import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types/compliance';

const STYLES: Record<DocumentStatus, string> = {
  VALIDE:         'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
  A_RENOUVELER:   'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
  EXPIRE:         'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
  SANS_ECHEANCE:  'bg-slate-100 text-slate-500 ring-slate-400/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30',
};

export function DeadlineBadge({ status }: { status: DocumentStatus }) {
  const { t } = useTranslation();
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
      STYLES[status],
    )}>
      {t(`status.documentStatus.${status}`)}
    </span>
  );
}
