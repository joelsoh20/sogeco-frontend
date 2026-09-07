import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { LoadingPanel } from '@/components/ui/Spinner';
import { formatFcfa, formatFcfaCompact } from '@/lib/utils';
import type { BodyType, Vehicle } from '@/types/api';
import type { VehicleProfitability } from '@/types/compliance';

type Category = 'CAMION' | 'TRICYCLE' | 'CAMIONNETTE';

/** Regroupement des types de carrosserie en 3 familles, tel que demande pour ce classement. */
const CATEGORY_BODY_TYPES: Record<Category, BodyType[]> = {
  CAMION: ['PORTEUR', 'FOURGON', 'SEMI_REMORQUE', 'TRACTEUR', 'BENNE', 'CITERNE', 'PLATEAU'],
  TRICYCLE: ['TRICYCLE'],
  CAMIONNETTE: ['UTILITAIRE', 'VOITURE_LIVRAISON', 'MOTO'],
};

const CATEGORIES: Category[] = ['CAMION', 'TRICYCLE', 'CAMIONNETTE'];

function categoryOf(bodyType: BodyType): Category {
  return CATEGORIES.find((c) => CATEGORY_BODY_TYPES[c].includes(bodyType)) ?? 'CAMION';
}

interface Row extends VehicleProfitability {
  cityId: number | null;
  cityName: string | null;
  category: Category | null;
}

interface VehicleProfitabilityPanelProps {
  vehicles: Vehicle[];
  profitability: VehicleProfitability[];
  cities: { id: number; name: string }[];
  isLoading: boolean;
}

export function VehicleProfitabilityPanel({ vehicles, profitability, cities, isLoading }: VehicleProfitabilityPanelProps) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<number | 'ALL'>('ALL');
  const [category, setCategory] = useState<Category>('CAMION');

  const rows: Row[] = useMemo(() => {
    const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
    return profitability.map((p) => {
      const v = vehicleById.get(p.vehicleId);
      return {
        ...p,
        cityId: v?.cityId ?? null,
        cityName: v?.cityName ?? null,
        category: v ? categoryOf(v.bodyType) : null,
      };
    });
  }, [vehicles, profitability]);

  const filtered = rows.filter((r) =>
    r.category === category && (scope === 'ALL' || r.cityId === scope));

  const mostProfitable = [...filtered].sort((a, b) => b.netMargin - a.netMargin).slice(0, 5);
  const leastProfitable = [...filtered].sort((a, b) => a.netMargin - b.netMargin).slice(0, 5);

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-surface-border px-5 py-4 dark:border-slate-800">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('reportsPage.vehicleProfitability')}</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('reportsPage.vehicleProfitabilityHint')}</p>
      </div>

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

      <div className="flex flex-wrap items-center gap-2 border-b border-surface-border px-5 py-3 dark:border-slate-800">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${category === c ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
          >
            {t(`reportsPage.category${c === 'CAMION' ? 'Camion' : c === 'TRICYCLE' ? 'Tricycle' : 'Camionnette'}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingPanel />
      ) : filtered.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">{t('reportsPage.emptyProfitability')}</p>
      ) : (
        <div className="grid gap-0 divide-y divide-surface-border md:grid-cols-2 md:divide-x md:divide-y-0 dark:divide-slate-800">
          <RankingList
            title={t('reportsPage.mostProfitable')}
            icon={<TrendingUp size={15} className="text-emerald-600 dark:text-emerald-400" />}
            rows={mostProfitable}
            accent="emerald"
          />
          <RankingList
            title={t('reportsPage.leastProfitable')}
            icon={<TrendingDown size={15} className="text-red-600 dark:text-red-400" />}
            rows={leastProfitable}
            accent="red"
          />
        </div>
      )}
    </div>
  );
}

function RankingList({ title, icon, rows, accent }: {
  title: string;
  icon: ReactNode;
  rows: Row[];
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
        <p className="text-sm text-slate-400">{t('reportsPage.emptyProfitability')}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.vehicleId} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800 dark:text-slate-200">{r.registrationNumber}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {r.cityName ?? '—'} · {formatFcfaCompact(r.totalRevenue)} {t('reportsPage.revenueShort')}
                </p>
              </div>
              <span className={`shrink-0 whitespace-nowrap font-semibold tabular ${valueClass}`}>
                {formatFcfa(r.netMargin)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
