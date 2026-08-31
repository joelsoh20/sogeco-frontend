import { useTranslation } from 'react-i18next';
import { ShieldCheck, Wrench, IdCard, CreditCard, Car, FileBadge } from 'lucide-react';
import type { DeadlineItem } from '@/types/compliance';
import { DeadlineBadge } from '@/components/ui/DeadlineBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';

const CATEGORY_ICON: Record<DeadlineItem['category'], typeof ShieldCheck> = {
  ASSURANCE: ShieldCheck,
  VISITE_TECHNIQUE: Wrench,
  PERMIS: IdCard,
  CARTE_BLEUE: CreditCard,
  CARTE_GRISE: Car,
  LICENCE_TRANSPORT: FileBadge,
};

/**
 * Echeancier unifie : assurances, visites techniques, permis, une
 * seule liste triee par urgence. C'est la piece que le backend a ete
 * concu pour produire — trois sources sans table commune, combinees
 * ici sans que leurs modeles n'aient eu a fusionner.
 */
export function UnifiedSchedule({ items }: { items: DeadlineItem[] }) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title={t('unifiedSchedule.emptyTitle')}
        action={t('unifiedSchedule.emptyAction')}
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-surface-border px-5 py-4">
        <h2 className="font-semibold text-slate-900">{t('unifiedSchedule.title')}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{t('unifiedSchedule.subtitle')}</p>
      </div>
      <ul className="divide-y divide-surface-border">
        {items.map((item) => {
          const Icon = CATEGORY_ICON[item.category];
          return (
            <li key={`${item.category}-${item.entityId}-${item.dueDate}`}
                className="flex items-center gap-3 px-5 py-3.5">
              <div className="rounded-lg bg-slate-50 p-2 text-slate-400">
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{item.entityLabel}</p>
                <p className="truncate text-xs text-slate-500">{item.documentLabel}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-500">{formatDate(item.dueDate)}</p>
                <p className={`text-xs font-medium ${item.daysRemaining < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                  {item.daysRemaining < 0
                    ? t('unifiedSchedule.overdueBy', { count: Math.abs(item.daysRemaining) })
                    : t('unifiedSchedule.dueIn', { count: item.daysRemaining })}
                </p>
              </div>
              <DeadlineBadge status={item.status} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
