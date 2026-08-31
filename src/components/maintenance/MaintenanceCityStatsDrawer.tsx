import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, MapPin } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { maintenanceApi } from '@/api/endpoints';
import { formatFcfa } from '@/lib/utils';

interface MaintenanceCityStatsDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** Couts et interventions de maintenance cumules par ville, pour comparer les 3 implantations d'un coup d'oeil. */
export function MaintenanceCityStatsDrawer({ open, onClose }: MaintenanceCityStatsDrawerProps) {
  const { t } = useTranslation();
  const stats = useQuery({
    queryKey: ['maintenance', 'stats-by-city'],
    queryFn: () => maintenanceApi.statsByCity(),
    enabled: open,
  });

  const rows = stats.data ?? [];
  const maxCost = Math.max(1, ...rows.map((r) => r.coutTotal));

  return (
    <Drawer open={open} onClose={onClose} title={t('maintenanceCityStats.title')} subtitle={t('maintenanceCityStats.subtitle')}>
      {stats.isLoading ? (
        <LoadingPanel />
      ) : rows.length === 0 ? (
        <EmptyState icon={MapPin} title={t('maintenanceCityStats.empty')} />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.cityId} className="rounded-lg border border-surface-border p-3 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                  <MapPin size={14} className="text-accent" />
                  {row.cityName}
                </span>
                <span className="font-semibold tabular text-slate-900 dark:text-slate-100">{formatFcfa(row.coutTotal)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full bg-accent" style={{ width: `${(row.coutTotal / maxCost) * 100}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{t('maintenanceCityStats.interventionCount', { count: row.interventions })}</span>
                {row.pannes > 0 && (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                    <AlertOctagon size={12} />
                    {t('maintenanceCityStats.breakdownCount', { count: row.pannes })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
