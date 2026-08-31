import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Droplets } from 'lucide-react';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { fuelApi } from '@/api/endpoints';
import { formatConsumption, formatKm, formatLiters } from '@/lib/utils';

/**
 * Km parcourus et carburant a ajouter sur la semaine en cours, pour le
 * plein du samedi — pense pour les vehicules a suivi allege (moto,
 * tricycle, voiture de livraison) : pas de mission a rapprocher, juste
 * de quoi savoir combien mettre dans le reservoir.
 */
export function WeeklyRefuelTable({ cityId }: { cityId?: number }) {
  const { t } = useTranslation();
  const refuel = useQuery({
    queryKey: ['fuel', 'weekly-refuel', cityId],
    queryFn: () => fuelApi.weeklyRefuel(undefined, undefined, cityId),
  });

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-surface-border px-5 py-4 dark:border-slate-800">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
          <Droplets size={16} className="text-accent" />
          {t('weeklyRefuel.title')}
        </h2>
        <p className="mt-0.5 text-xs text-slate-400">
          {t('weeklyRefuel.subtitle')}
        </p>
      </div>

      {refuel.isLoading ? (
        <LoadingPanel />
      ) : !refuel.data?.length ? (
        <EmptyState icon={Droplets} title={t('weeklyRefuel.emptyTitle')} />
      ) : (
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="table-header">{t('weeklyRefuel.colVehicle')}</th>
              <th className="table-header">{t('compliancePage.colType')}</th>
              <th className="table-header text-right">{t('weeklyRefuel.colWeekKm')}</th>
              <th className="table-header text-right">{t('fuelPage.statAvgConsumption')}</th>
              <th className="table-header text-right">{t('weeklyRefuel.colToAdd')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border dark:divide-slate-800">
            {refuel.data.map((v) => (
              <tr key={v.vehicleId}>
                <td className="table-cell font-medium">{v.registrationNumber}</td>
                <td className="table-cell text-slate-500 dark:text-slate-400">{t(`vehicle.bodyType.${v.bodyType}`)}</td>
                <td className="table-cell text-right tabular">{formatKm(v.distanceKm)}</td>
                <td className="table-cell text-right tabular">{formatConsumption(v.avgConsumptionPer100km)}</td>
                <td className="table-cell text-right">
                  {v.source === 'INDISPONIBLE' ? (
                    <span className="text-xs text-slate-400">{t(`weeklyRefuel.source.${v.source}`)}</span>
                  ) : (
                    <span className="tabular font-semibold text-accent">
                      {v.suggestedRefillLiters !== null ? formatLiters(v.suggestedRefillLiters) : '—'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
