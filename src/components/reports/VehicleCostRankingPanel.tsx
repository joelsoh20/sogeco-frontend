import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { LoadingPanel } from '@/components/ui/Spinner';
import { formatFcfa, formatFcfaCompact } from '@/lib/utils';
import type { VehicleExpenseSummary } from '@/types/compliance';

function currentMonthAmount(vehicle: VehicleExpenseSummary): number {
  const month = new Date().getMonth() + 1;
  return vehicle.monthly.find((m) => m.month === month)?.amount ?? 0;
}

interface VehicleCostRankingPanelProps {
  vehicles: VehicleExpenseSummary[];
  cities: { id: number; name: string }[];
  isLoading: boolean;
}

/**
 * Classement cout total (carburant + entretien/maintenance + missions,
 * cf. ReportingService.vehicleExpenses) — contrairement a la
 * rentabilite (VehicleProfitabilityPanel), ne demande aucune donnee de
 * chiffre d'affaires : reste utile meme quand l'usage reel ne passe
 * pas par des missions facturees. Reutilise les donnees deja chargees
 * pour le tableau "Charges par camion" plus haut sur la page, aucun
 * appel reseau supplementaire.
 */
export function VehicleCostRankingPanel({ vehicles, cities, isLoading }: VehicleCostRankingPanelProps) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<number | 'ALL'>('ALL');

  const filtered = useMemo(
    () => vehicles.filter((v) => scope === 'ALL' || v.cityId === scope),
    [vehicles, scope],
  );

  const costliest = [...filtered].sort((a, b) => b.yearTotal - a.yearTotal).slice(0, 5);
  const cheapest = [...filtered].sort((a, b) => a.yearTotal - b.yearTotal).slice(0, 5);

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-surface-border px-5 py-4 dark:border-slate-800">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('reportsPage.costRanking')}</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('reportsPage.costRankingHint')}</p>
      </div>

      {cities.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-surface-border px-5 py-3 dark:border-slate-800">
          <button
            onClick={() => setScope('ALL')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${scope === 'ALL' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
          >
            {t('reportsPage.wholeFleet')}
          </button>
          {cities.map((c) => (
            <button
              key={c.id}
              onClick={() => setScope(c.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${scope === c.id ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <LoadingPanel />
      ) : filtered.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">{t('reportsPage.emptyVehicleExpenses')}</p>
      ) : (
        <div className="grid gap-0 divide-y divide-surface-border md:grid-cols-2 md:divide-x md:divide-y-0 dark:divide-slate-800">
          <RankingList
            title={t('reportsPage.mostCostly')}
            icon={<TrendingUp size={15} className="text-red-600 dark:text-red-400" />}
            rows={costliest}
            accent="red"
          />
          <RankingList
            title={t('reportsPage.leastCostly')}
            icon={<TrendingDown size={15} className="text-emerald-600 dark:text-emerald-400" />}
            rows={cheapest}
            accent="emerald"
          />
        </div>
      )}
    </div>
  );
}

function RankingList({ title, icon, rows, accent }: {
  title: string;
  icon: ReactNode;
  rows: VehicleExpenseSummary[];
  accent: 'emerald' | 'red';
}) {
  const { t } = useTranslation();
  const valueClass = accent === 'emerald'
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-red-700 dark:text-red-400';

  return (
    <div className="px-5 py-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
        {icon}
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">{t('reportsPage.emptyVehicleExpenses')}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((v) => (
            <li key={v.vehicleId} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800 dark:text-slate-200">{v.registrationNumber}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {v.cityName ?? '—'} · {formatFcfaCompact(currentMonthAmount(v))} {t('reportsPage.thisMonthShort')}
                </p>
              </div>
              <span className={`shrink-0 whitespace-nowrap font-semibold tabular ${valueClass}`}>
                {formatFcfa(v.yearTotal)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
