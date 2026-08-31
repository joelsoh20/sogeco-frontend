import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { Alert } from '@/types/api';
import { AlertLevelBadge } from '@/components/ui/StatusBadge';
import { DetailRow } from '@/components/ui/Drawer';
import { AlertActions } from './AlertActions';
import { alertSourceRoute } from '@/lib/alertNavigation';
import { formatAge, formatDateTime } from '@/lib/utils';

export function AlertDetailPanel({ alert }: { alert: Alert }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sourceRoute = alertSourceRoute(alert);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <AlertLevelBadge level={alert.level} />
        <span className="text-xs text-slate-500">
          {alert.status === 'NON_RESOLUE' && t('alertDetail.unresolvedSince', { age: formatAge(alert.ageMinutes) })}
          {alert.status === 'EN_COURS' && t('alertDetail.inProgressSince', { age: formatAge(alert.ageMinutes) })}
        </span>
      </div>

      <p className="text-sm text-slate-700">{alert.description}</p>

      <div>
        <DetailRow label={t('alertsPage.colVehicle')} value={alert.registrationNumber ?? '—'} />
        <DetailRow label={t('driversPage.colDriver')} value={alert.driverName ?? '—'} />
        <DetailRow label={t('alertsPage.colLocation')} value={alert.locationLabel ?? '—'} />
        <DetailRow label={t('alertDetail.triggeredOn')} value={formatDateTime(alert.triggeredAt)} />
        {alert.occurrences > 1 && (
          <DetailRow label={t('alertDetail.occurrences')} value={t('alertDetail.occurrencesCount', { count: alert.occurrences })} />
        )}
      </div>

      {sourceRoute && (
        <button onClick={() => navigate(sourceRoute)} className="btn-ghost w-full">
          {t('alertDetail.viewSource')}
          <ArrowRight size={14} />
        </button>
      )}

      <AlertActions alert={alert} />
    </div>
  );
}
