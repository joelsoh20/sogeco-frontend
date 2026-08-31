import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Gauge, Satellite } from 'lucide-react';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { fuelApi } from '@/api/endpoints';
import { cn, formatKm, formatLiters, formatNumber, fuelLevelColor } from '@/lib/utils';

/**
 * Niveau de carburant estime par camion — mesure telematique quand un
 * boitier est installe, sinon estimation a partir du tout premier plein
 * enregistre (l'entreprise ne fait jamais de plein complet, donc jamais
 * de repere a 100%) et de la distance parcourue depuis
 * (Vehicle.avgFuelConsumption applique a la distance restante).
 */
export function TankLevelsTable({ cityId }: { cityId?: number }) {
  const { t } = useTranslation();
  const levels = useQuery({ queryKey: ['fuel', 'tank-levels', cityId], queryFn: () => fuelApi.tankLevels(cityId) });

  return (
    <div className="card-padded">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
        <Gauge size={16} className="text-accent" />
        {t('tankLevels.title')}
      </h2>

      {levels.isLoading ? (
        <LoadingPanel />
      ) : !levels.data?.length ? (
        <EmptyState icon={Gauge} title={t('tankLevels.emptyTitle')} />
      ) : (
        <div className="space-y-3">
          {levels.data.map((v) => (
            <div key={v.vehicleId} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{v.registrationNumber}</span>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {v.source === 'TELEMATIQUE' && <Satellite size={12} className="text-accent" />}
                  <span>{t(`tankLevels.source.${v.source}`)}</span>
                </div>
              </div>

              {v.source === 'INDISPONIBLE' ? (
                <p className="mt-1.5 text-xs text-slate-400">
                  {t('tankLevels.notEnoughData')}
                </p>
              ) : (
                <>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="tabular text-slate-500 dark:text-slate-400">
                      {formatLiters(v.estimatedFuelLiters)}
                      {v.tankCapacityLiters ? ` / ${formatLiters(v.tankCapacityLiters)}` : ''}
                    </span>
                    <span className="tabular font-medium text-slate-700 dark:text-slate-300">
                      {v.estimatedFuelPercent !== null ? `${formatNumber(v.estimatedFuelPercent, 0)} %` : '—'}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    {v.estimatedFuelPercent !== null && (
                      <div
                        className={cn('h-full', fuelLevelColor(v.estimatedFuelPercent))}
                        style={{ width: `${Math.min(v.estimatedFuelPercent, 100)}%` }}
                      />
                    )}
                  </div>
                  {v.source === 'ESTIMATION_DISTANCE' && v.distanceSinceLastFillKm !== null && (
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {t('tankLevels.distanceSinceFirstFill', { distance: formatKm(v.distanceSinceLastFillKm) })}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
