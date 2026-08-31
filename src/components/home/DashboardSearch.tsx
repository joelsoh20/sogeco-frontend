import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, Truck, User, X } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { VehicleDetailPanel } from '@/components/vehicles/VehicleDetailPanel';
import { DriverDetailPanel } from '@/components/drivers/DriverDetailPanel';
import { vehicleApi, driverApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import type { Driver, Vehicle } from '@/types/api';

/**
 * Recherche d'un camion ou d'un chauffeur depuis le tableau de bord, pour
 * accéder directement à ses statistiques — sans passer par les listes
 * paginées Camions/Chauffeurs. Réutilise les mêmes panneaux de détail
 * que ces écrans (VehicleDetailPanel/DriverDetailPanel dans un Drawer),
 * plutôt que de dupliquer l'affichage des statistiques ici.
 */
export function DashboardSearch() {
  const { t } = useTranslation();
  const canSeeVehicles = useAuthStore((state) => state.hasPermission('VEHICLE_READ'));
  const canSeeDrivers = useAuthStore((state) => state.hasPermission('DRIVER_READ'));

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const searchEnabled = debouncedQuery.length >= 2;

  const vehicles = useQuery({
    queryKey: ['vehicles', 'search', debouncedQuery],
    queryFn: () => vehicleApi.search(debouncedQuery),
    enabled: searchEnabled && canSeeVehicles,
  });
  const drivers = useQuery({
    queryKey: ['drivers', 'search', debouncedQuery],
    queryFn: () => driverApi.search(debouncedQuery),
    enabled: searchEnabled && canSeeDrivers,
  });

  const hasResults = Boolean(vehicles.data?.length || drivers.data?.length);
  const isLoading = (canSeeVehicles && vehicles.isLoading) || (canSeeDrivers && drivers.isLoading);

  const clear = () => {
    setQuery('');
    setDebouncedQuery('');
    setOpen(false);
  };

  const pickVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    clear();
  };
  const pickDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    clear();
  };

  if (!canSeeVehicles && !canSeeDrivers) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9 pr-9"
          placeholder={t('dashboardSearch.placeholder')}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {open && searchEnabled && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-surface-border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {isLoading ? (
            <p className="px-4 py-3 text-sm text-slate-400">{t('dashboardSearch.searching')}</p>
          ) : !hasResults ? (
            <p className="px-4 py-3 text-sm text-slate-400">{t('dashboardSearch.noResults', { query: debouncedQuery })}</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {canSeeVehicles && vehicles.data && vehicles.data.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('dashboardSearch.vehicles')}</p>
                  <ul>
                    {vehicles.data.map((v) => (
                      <li key={v.id}>
                        <button
                          onClick={() => pickVehicle(v)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Truck size={16} className="shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                              {v.registrationNumber}
                            </span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              {v.brand} {v.model}{v.driverName ? ` · ${v.driverName}` : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {canSeeDrivers && drivers.data && drivers.data.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('dashboardSearch.drivers')}</p>
                  <ul>
                    {drivers.data.map((d) => (
                      <li key={d.id}>
                        <button
                          onClick={() => pickDriver(d)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <User size={16} className="shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                              {d.fullName}
                            </span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              {d.matricule}{d.registrationNumber ? ` · ${d.registrationNumber}` : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Drawer
        open={selectedVehicle !== null}
        onClose={() => setSelectedVehicle(null)}
        title={selectedVehicle?.registrationNumber ?? ''}
        subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : undefined}
      >
        {selectedVehicle && <VehicleDetailPanel vehicleId={selectedVehicle.id} />}
      </Drawer>

      <Drawer
        open={selectedDriver !== null}
        onClose={() => setSelectedDriver(null)}
        title={selectedDriver?.fullName ?? ''}
        subtitle={selectedDriver?.matricule}
      >
        {selectedDriver && <DriverDetailPanel driverId={selectedDriver.id} />}
      </Drawer>
    </div>
  );
}
