import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { AlertLevelBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatAge } from '@/lib/utils';
import type { Alert } from '@/types/api';

/** Alertes recentes d'un chauffeur — tous statuts confondus, contrairement au flux operationnel general. */
export function DriverAlertsFeed({ alerts }: { alerts: Alert[] }) {
  const { t } = useTranslation();
  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={t('driverAlertsFeed.emptyTitle')}
        action={t('driverAlertsFeed.emptyAction')}
      />
    );
  }

  return (
    <ul className="divide-y divide-surface-border dark:divide-slate-800">
      {alerts.map((alert) => (
        <li key={alert.id} className="flex items-start gap-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{alert.title}</p>
              <AlertLevelBadge level={alert.level} />
            </div>
            {alert.description && (
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{alert.description}</p>
            )}
          </div>
          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
            {alert.status === 'RESOLUE' ? t('driverAlertsFeed.resolved') : formatAge(alert.ageMinutes)}
          </span>
        </li>
      ))}
    </ul>
  );
}
