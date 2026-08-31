import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Award, GraduationCap, PartyPopper, TriangleAlert, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { driverApi } from '@/api/endpoints';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatFcfa } from '@/lib/utils';
import type { DriverActionType } from '@/types/driver-performance';

const ACTION_ICONS: Record<DriverActionType, LucideIcon> = {
  PRIME: Award,
  AVERTISSEMENT: TriangleAlert,
  FORMATION: GraduationCap,
  ENTRETIEN: Wrench,
  FELICITATION: PartyPopper,
};

interface TimelineEntry {
  id: string;
  date: string;
  icon: LucideIcon;
  label: string;
  detail: string;
}

/** Historique complet d'un chauffeur : fusionne actions RH et primes, deux flux distincts cote API, en une seule chronologie. */
export function DriverHistoryPanel({ driverId }: { driverId: number }) {
  const { t } = useTranslation();
  const actions = useQuery({ queryKey: ['drivers', 'actions', driverId], queryFn: () => driverApi.actions(driverId) });
  const bonuses = useQuery({ queryKey: ['drivers', 'bonuses', driverId], queryFn: () => driverApi.bonuses(driverId) });

  if (actions.isLoading || bonuses.isLoading) {
    return <LoadingPanel />;
  }

  const entries: TimelineEntry[] = [
    ...(actions.data ?? []).map((a) => ({
      id: `action-${a.id}`,
      date: a.actionDate,
      icon: ACTION_ICONS[a.actionType],
      label: t(`driverHistory.actionType.${a.actionType}`),
      detail: a.motif,
    })),
    ...(bonuses.data ?? []).map((b) => ({
      id: `bonus-${b.id}`,
      date: b.grantedAt,
      icon: Award,
      label: t('driverHistory.bonusLabel', { status: t(`driverHistory.bonusStatus.${b.status}`) }),
      detail: `${formatFcfa(b.amount)}${b.reason ? ` — ${b.reason}` : ''}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  if (entries.length === 0) {
    return <EmptyState icon={Award} title={t('driverHistory.emptyTitle')} action={t('driverHistory.emptyAction')} />;
  }

  return (
    <ul className="divide-y divide-surface-border dark:divide-slate-800">
      {entries.map((entry) => {
        const Icon = entry.icon;
        return (
          <li key={entry.id} className="flex items-start gap-3 py-3">
            <div className="mt-0.5 rounded-lg bg-slate-100 p-1.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Icon size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{entry.label}</p>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatDate(entry.date)}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{entry.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
