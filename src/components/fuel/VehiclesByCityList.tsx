import { Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatConsumption } from '@/lib/utils';
import type { Vehicle } from '@/types/api';

/** Ordre d'affichage des villes avec implantation ; toute autre ville suit, triee alphabetiquement. */
const CITY_ORDER = ['Douala', 'Yaoundé', 'Bafoussam'];

interface VehiclesByCityListProps {
  vehicles: Vehicle[];
  onSelect: (vehicleId: number) => void;
}

/**
 * Liste de tous les vehicules actifs, groupes par ville — clic sur une
 * ligne pour ouvrir le detail carburant (meme panneau que le clic sur
 * un plein dans le tableau plus bas : un seul drawer, deux points
 * d'entree).
 */
export function VehiclesByCityList({ vehicles, onSelect }: VehiclesByCityListProps) {
  const { t } = useTranslation();
  const NO_CITY_LABEL = t('vehiclesByCity.noCity');
  const groups = new Map<string, Vehicle[]>();
  for (const v of vehicles) {
    const city = v.cityName ?? NO_CITY_LABEL;
    const bucket = groups.get(city);
    if (bucket) bucket.push(v);
    else groups.set(city, [v]);
  }

  const otherCities = Array.from(groups.keys())
    .filter((c) => !CITY_ORDER.includes(c) && c !== NO_CITY_LABEL)
    .sort((a, b) => a.localeCompare(b));
  const orderedCities = [
    ...CITY_ORDER.filter((c) => groups.has(c)),
    ...otherCities,
    ...(groups.has(NO_CITY_LABEL) ? [NO_CITY_LABEL] : []),
  ];

  return (
    <div className="card-padded">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
        <Truck size={16} className="text-accent" />
        {t('vehiclesByCity.title')}
      </h2>

      {vehicles.length === 0 ? (
        <EmptyState icon={Truck} title={t('vehiclesByCity.emptyTitle')} />
      ) : (
        <div className="space-y-5">
          {orderedCities.map((city) => {
            const cityVehicles = groups.get(city) ?? [];
            return (
              <div key={city}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {city} <span className="font-normal normal-case text-slate-400">({cityVehicles.length})</span>
                </h3>
                <div className="divide-y divide-surface-border overflow-hidden rounded-lg border border-surface-border dark:divide-slate-800 dark:border-slate-800">
                  {cityVehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onSelect(v.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                          {v.registrationNumber}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {v.brand} {v.model} · {t(`vehicle.bodyType.${v.bodyType}`)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular text-slate-500 dark:text-slate-400">
                        {formatConsumption(v.avgFuelConsumption)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
