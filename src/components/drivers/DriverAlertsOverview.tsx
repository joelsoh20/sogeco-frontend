import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Fuel, Gauge, IdCard, KeyRound, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertLevelBadge } from '@/components/ui/StatusBadge';
import { formatAge } from '@/lib/utils';
import { alertSourceRoute } from '@/lib/alertNavigation';
import type { Alert } from '@/types/api';

/** Cf. AlertType (backend) — seuls les types pertinents pour un chauffeur ont une icone dediee, les autres retombent sur TriangleAlert. */
const TYPE_ICONS: Record<string, LucideIcon> = {
  VITESSE_EXCESSIVE: Gauge,
  SURCONSOMMATION: Fuel,
  PERMIS_ECHEANCE: IdCard,
  DEMARRAGE_NON_AUTORISE: KeyRound,
};

function iconFor(alertType: string): LucideIcon {
  return TYPE_ICONS[alertType] ?? TriangleAlert;
}

/** Alertes recentes tous chauffeurs confondus — vue de synthese sur l'ecran Chauffeurs, distincte du flux par chauffeur du tiroir de detail. */
export function DriverAlertsOverview({ alerts }: { alerts: Alert[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={t('driverAlertsOverview.emptyTitle')}
        action={t('driverAlertsOverview.emptyAction')}
      />
    );
  }

  return (
    <ul className="divide-y divide-surface-border dark:divide-slate-800">
      {alerts.map((alert) => {
        const Icon = iconFor(alert.alertType);
        const route = alertSourceRoute(alert);
        return (
          <li
            key={alert.id}
            onClick={route ? () => navigate(route) : undefined}
            className={`flex items-start gap-3 py-3 ${route ? 'cursor-pointer rounded-lg px-2 -mx-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60' : ''}`}
          >
            <div className="mt-0.5 rounded-lg bg-slate-100 p-1.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Icon size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{alert.title}</p>
                <AlertLevelBadge level={alert.level} />
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {alert.driverName ?? t('driverAlertsOverview.unidentifiedDriver')}
                {alert.occurrences > 1 && ` · ${t('driverAlertsOverview.driversConcerned', { count: alert.occurrences })}`}
              </p>
            </div>
            <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
              {alert.status === 'RESOLUE' ? t('driverAlertsFeed.resolved') : formatAge(alert.ageMinutes)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
