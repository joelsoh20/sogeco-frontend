import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, Package, ShieldCheck, Truck } from 'lucide-react';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { adminApi, driverApi } from '@/api/endpoints';
import { formatNumber } from '@/lib/utils';
import type { DriverSemesterRanking, UsageType } from '@/types/api';

/** Villes ou l'entreprise a une implantation active. */
const RANKING_CITY_NAMES = ['Douala', 'Yaoundé', 'Bafoussam'];

function RankingList({ rows, valueLabel, icon: Icon }: {
  rows: { driver: DriverSemesterRanking; value: number }[];
  valueLabel: (value: number) => string;
  icon: typeof Package;
}) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <p className="py-6 text-center text-xs text-slate-400">{t('bestDrivers.noDeliveries')}</p>;
  }

  return (
    <ul className="space-y-2">
      {rows.map(({ driver, value }, index) => (
        <li key={driver.driverId} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent dark:bg-accent/15">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{driver.driverName}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{driver.registrationNumber ?? '—'}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular text-slate-900 dark:text-slate-100">
            <Icon size={13} className="text-slate-400" />
            {valueLabel(value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Meilleurs chauffeurs sur le semestre ecoule, groupes par ville et par
 * type d'usage du camion actuellement affecte (tour de ville / voyage)
 * — deux criteres cote a cote : le plus de livraisons, et le moins de
 * pannes subies avec le camion. Seuls les chauffeurs ayant realise au
 * moins une livraison sur la periode sont classes : un chauffeur inactif
 * a zero panne n'est pas pour autant "le plus fiable".
 */
export function BestDriversRanking() {
  const { t } = useTranslation();
  const [cityFilter, setCityFilter] = useState('');
  const [usageFilter, setUsageFilter] = useState<UsageType>('TOUR_VILLE');

  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities });
  const rankingCities = (cities.data ?? []).filter((c) => RANKING_CITY_NAMES.includes(c.name));

  const ranking = useQuery({ queryKey: ['drivers', 'semester-ranking'], queryFn: driverApi.semesterRanking });

  const group = (ranking.data ?? []).filter((d) => {
    if (d.usageType !== usageFilter) return false;
    if (cityFilter && String(d.cityId) !== cityFilter) return false;
    return d.deliveries > 0;
  });

  const topDeliveries = [...group]
    .sort((a, b) => b.deliveries - a.deliveries)
    .slice(0, 5)
    .map((driver) => ({ driver, value: driver.deliveries }));

  const topReliability = [...group]
    .sort((a, b) => a.breakdowns - b.breakdowns || b.deliveries - a.deliveries)
    .slice(0, 5)
    .map((driver) => ({ driver, value: driver.breakdowns }));

  return (
    <div className="card-padded">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('bestDrivers.title')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {(['TOUR_VILLE', 'VOYAGE'] as UsageType[]).map((type) => (
              <button
                key={type}
                onClick={() => setUsageFilter(type)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  usageFilter === type ? 'bg-white text-accent shadow-sm dark:bg-slate-700' : 'text-slate-500'
                }`}
              >
                {t(`bestDrivers.usage.${type}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={14} className="text-slate-400" />
            <select className="input w-auto" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
              <option value="">{t('clientForm.allCities')}</option>
              {rankingCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {ranking.isLoading ? (
        <LoadingPanel />
      ) : group.length === 0 ? (
        <EmptyState icon={Truck} title={t('bestDrivers.emptyTitle')} action={t('bestDrivers.emptyAction')} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Package size={14} className="text-accent" />
              {t('bestDrivers.topDeliveries')}
            </h3>
            <RankingList rows={topDeliveries} valueLabel={(v) => formatNumber(v)} icon={Package} />
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              <ShieldCheck size={14} className="text-emerald-600" />
              {t('bestDrivers.topReliability')}
            </h3>
            <RankingList rows={topReliability} valueLabel={(v) => t('bestDrivers.breakdownCount', { count: v })} icon={ShieldCheck} />
          </div>
        </div>
      )}
    </div>
  );
}
