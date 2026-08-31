import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Fuel, Gauge, MapPin, Pencil, Search, TrendingDown } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { FuelLogStatusBadge } from '@/components/fuel/FuelLogStatusBadge';
import { VehicleFuelDonut } from '@/components/fuel/VehicleFuelDonut';
import { FuelConsumptionTrendChart } from '@/components/fuel/FuelConsumptionTrendChart';
import { FuelAlertsOverview } from '@/components/fuel/FuelAlertsOverview';
import { TankLevelsTable } from '@/components/fuel/TankLevelsTable';
import { WeeklyRefuelTable } from '@/components/fuel/WeeklyRefuelTable';
import { VehiclesByCityList } from '@/components/fuel/VehiclesByCityList';
import { CreateFuelLogDrawer } from '@/components/fuel/CreateFuelLogDrawer';
import { EditFuelLogDrawer } from '@/components/fuel/EditFuelLogDrawer';
import { VehicleFuelDetailPanel } from '@/components/fuel/VehicleFuelDetailPanel';
import { adminApi, alertApi, fuelApi, vehicleApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { canEditRecord } from '@/lib/editWindow';
import {
  formatConsumption, formatDateTime, formatFcfa, formatFcfaCompact, formatKm, formatLiters, formatNumber,
} from '@/lib/utils';
import type { FuelLog, FuelLogStatus } from '@/types/api';

const PAGE_SIZE = 20;
const FUEL_ALERT_TYPES = new Set(['CARBURANT_BAS', 'SIPHONNAGE', 'SURCONSOMMATION']);
/** Villes ou l'entreprise a une implantation active. */
const FUEL_CITY_NAMES = ['Douala', 'Yaoundé', 'Bafoussam'];

/**
 * Ecran Carburant.
 *
 * La repartition par camion vient directement de l'agregat SQL du
 * backend : aucun calcul de part ou de moyenne n'est refait cote
 * client, pour eviter tout ecart avec les chiffres du serveur.
 *
 * Le backend ne filtre/pagine pas les pleins par camion ou statut : on
 * recupere un lot large et le filtrage se fait cote client, comme sur
 * l'ecran Maintenance.
 */
export function FuelPage() {
  const { t } = useTranslation();
  const canCreate = useAuthStore((state) => state.hasPermission('FUEL_CREATE'));
  const canUpdate = useAuthStore((state) => state.hasPermission('FUEL_UPDATE'));
  const isAdmin = useAuthStore((state) => state.hasRole('ROLE_ADMIN'));
  const [page, setPage] = useState(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FuelLogStatus | ''>('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Arrivee depuis une alerte carburant ("Voir la source") : ouvre directement le camion vise.
  // Depend de searchParams (pas juste du montage) car on peut deja etre sur cette page
  // quand l'alerte est cliquee, auquel cas React Router ne remonte pas le composant.
  useEffect(() => {
    const vehicleId = searchParams.get('vehicleId');
    if (vehicleId) {
      setSelectedVehicleId(Number(vehicleId));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities });
  const fuelCities = (cities.data ?? []).filter((c) => FUEL_CITY_NAMES.includes(c.name));
  const cityId = cityFilter ? Number(cityFilter) : undefined;

  const vehicles = useQuery({ queryKey: ['vehicles', 'list-for-fuel'], queryFn: () => vehicleApi.list(0, 100) });
  const vehicleCityMap = new Map((vehicles.data?.content ?? []).map((v) => [v.id, v.cityId]));

  const stats = useQuery({ queryKey: ['fuel', 'stats', cityId], queryFn: () => fuelApi.stats(undefined, undefined, cityId) });
  const list = useQuery({ queryKey: ['fuel', 'list-all'], queryFn: () => fuelApi.list(0, 300) });
  const recentAlerts = useQuery({ queryKey: ['alerts', 'recent'], queryFn: alertApi.recent });

  const resetPage = () => setPage(0);

  const fuelAlerts = (recentAlerts.data ?? []).filter((a) => FUEL_ALERT_TYPES.has(a.alertType));

  // Restreint aux camions de la ville choisie, comme les autres zones de la page.
  const allLogs = (list.data?.content ?? []).filter((l) => !cityId || vehicleCityMap.get(l.vehicleId) === cityId);
  const vehicleOptions = Array.from(new Map(allLogs.map((l) => [l.vehicleId, l.registrationNumber])).entries());

  const filtered = allLogs.filter((log) => {
    if (statusFilter && log.status !== statusFilter) return false;
    if (vehicleFilter && String(log.vehicleId) !== vehicleFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        log.registrationNumber.toLowerCase().includes(q) ||
        (log.driverName ?? '').toLowerCase().includes(q) ||
        (log.stationName ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selectedBreakdown = stats.data?.repartitionParCamion.find((r) => r.vehicleId === selectedVehicleId);
  const selectedVehicleLabel = allLogs.find((l) => l.vehicleId === selectedVehicleId)?.registrationNumber;

  return (
    <PageShell
      title={t('fuelPage.title')}
      subtitle={t('fuelPage.subtitle')}
    >
      {stats.isLoading ? (
        <LoadingPanel />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-slate-400" />
            <select
              className="input w-auto"
              value={cityFilter}
              onChange={(e) => { setCityFilter(e.target.value); resetPage(); }}
            >
              <option value="">{t('fuelPage.allCities')}</option>
              {fuelCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <StatCard label={t('fuelPage.statTotalCost')} value={formatFcfaCompact(stats.data?.coutTotal)} icon={Fuel} accent="amber" />
            <StatCard label={t('fuelPage.statLitersConsumed')} value={formatLiters(stats.data?.litresConsommes)} icon={Gauge} accent="slate" />
            <StatCard label={t('fuelPage.statAvgConsumption')} value={formatConsumption(stats.data?.consommationMoyenne)} lowerIsBetter accent="blue" />
            <StatCard
              label={t('fuelPage.statAvgCostPerKm')}
              value={stats.data?.coutMoyenParKm ? formatFcfa(stats.data.coutMoyenParKm) : '—'}
              icon={TrendingDown}
              lowerIsBetter
              accent="green"
            />
            <StatCard
              label={t('fuelPage.statAnomalies')}
              value={String(stats.data?.nombreAnomalies ?? 0)}
              icon={AlertTriangle}
              accent={(stats.data?.nombreAnomalies ?? 0) > 0 ? 'red' : 'slate'}
            />
          </StatGrid>

          <div className="card-padded">
            <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">{t('fuelPage.trendTitle')}</h2>
            {stats.data && <FuelConsumptionTrendChart points={stats.data.consommationSixMois} />}
          </div>

          <TankLevelsTable cityId={cityId} />

          <WeeklyRefuelTable cityId={cityId} />

          <VehiclesByCityList
            vehicles={(vehicles.data?.content ?? []).filter((v) => v.active)}
            onSelect={setSelectedVehicleId}
          />

          {/* Repartition des couts par camion + alertes carburant */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card-padded">
              <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">{t('fuelPage.costBreakdownTitle')}</h2>
              {stats.data && stats.data.repartitionParCamion.length > 0 ? (
                <VehicleFuelDonut breakdown={stats.data.repartitionParCamion} total={stats.data.coutTotal} />
              ) : (
                <EmptyState
                  icon={Fuel}
                  title={t('fuelPage.emptyMonthTitle')}
                  action={t('fuelPage.emptyMonthAction')}
                />
              )}
            </div>

            <div className="card-padded">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                <AlertTriangle size={16} className="text-amber-600" />
                {t('fuelPage.fuelAlerts')}
              </h2>
              {recentAlerts.isLoading
                ? <p className="py-8 text-center text-sm text-slate-400">{t('common.loading')}</p>
                : <FuelAlertsOverview alerts={fuelAlerts} />}
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder={t('fuelPage.searchPlaceholder')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
              />
            </div>
            <select
              className="input w-auto"
              value={vehicleFilter}
              onChange={(e) => { setVehicleFilter(e.target.value); resetPage(); }}
            >
              <option value="">{t('fuelPage.allVehicles')}</option>
              {vehicleOptions.map(([id, reg]) => (
                <option key={id} value={id}>{reg}</option>
              ))}
            </select>
            <select
              className="input w-auto"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as FuelLogStatus | ''); resetPage(); }}
            >
              <option value="">{t('fuelPage.allStatuses')}</option>
              <option value="VALIDE">{t('fuelPage.statusValid')}</option>
              <option value="ANOMALIE">{t('fuelPage.statusAnomaly')}</option>
              <option value="ANNULE">{t('fuelPage.statusCancelled')}</option>
            </select>

            {canCreate && (
              <button onClick={() => setCreateOpen(true)} className="btn-primary ml-auto">
                <Fuel size={16} />
                {t('fuelPage.newFuelLog')}
              </button>
            )}
          </div>

          {list.isLoading ? (
            <LoadingPanel />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Fuel}
              title={t('fuelPage.emptyLogsTitle')}
              action={allLogs.length ? t('fuelPage.emptyLogsActionFiltered') : t('fuelPage.emptyLogsAction')}
            />
          ) : (
            <DataTable
              data={pageItems}
              keyOf={(l) => l.id}
              onRowClick={(l) => setSelectedVehicleId(l.vehicleId)}
              page={page}
              totalPages={totalPages}
              totalElements={filtered.length}
              onPageChange={setPage}
              columns={[
                { header: t('fuelPage.colDateTime'), accessor: (l) => formatDateTime(l.fuelDatetime) },
                { header: t('compliancePage.colVehicle'), accessor: (l) => <span className="font-medium">{l.registrationNumber}</span> },
                { header: t('driversPage.colDriver'), accessor: (l) => l.driverName ?? '—' },
                { header: t('fuelPage.colStation'), accessor: (l) => l.stationName ?? '—' },
                { header: t('fuelPage.colLiters'), accessor: (l) => `${formatNumber(l.quantityLiters)} L`, align: 'right' },
                { header: t('compliancePage.colCost'), accessor: (l) => formatFcfa(l.totalCost), align: 'right' },
                { header: t('fuelPage.colOdometerBefore'), accessor: (l) => formatKm(l.odometerBefore), align: 'right' },
                { header: t('fuelPage.colOdometerAfter'), accessor: (l) => formatKm(l.odometerAfter), align: 'right' },
                { header: t('fuelPage.colConsumption'), accessor: (l) => formatConsumption(l.computedConsumption), align: 'right' },
                { header: t('compliancePage.colStatus'), accessor: (l) => <FuelLogStatusBadge status={l.status} /> },
                {
                  header: '',
                  align: 'center',
                  accessor: (l) => canUpdate && canEditRecord(l.createdAt, isAdmin) ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingLog(l); }}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-accent dark:hover:bg-slate-800"
                    >
                      <Pencil size={14} />
                    </button>
                  ) : null,
                },
              ]}
            />
          )}

          {stats.data && stats.data.repartitionParCamion.length > 0 && (
            <div className="card overflow-hidden">
              <div className="border-b border-surface-border px-5 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('fuelPage.detailByVehicle')}</h2>
              </div>
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="table-header">{t('compliancePage.colVehicle')}</th>
                    <th className="table-header text-right">{t('fuelPage.colLiters')}</th>
                    <th className="table-header text-right">{t('compliancePage.colCost')}</th>
                    <th className="table-header text-right">{t('fuelPage.statAvgConsumption')}</th>
                    <th className="table-header text-right">{t('fuelPage.colShare')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border dark:divide-slate-800">
                  {stats.data.repartitionParCamion.map((row) => (
                    <tr
                      key={row.vehicleId}
                      className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      onClick={() => setSelectedVehicleId(row.vehicleId)}
                    >
                      <td className="table-cell font-medium">{row.registrationNumber}</td>
                      <td className="table-cell text-right tabular">{formatNumber(row.litres)} L</td>
                      <td className="table-cell text-right tabular">{formatFcfa(row.cout)}</td>
                      <td className="table-cell text-right tabular">{formatConsumption(row.consommationMoyenne)}</td>
                      <td className="table-cell text-right tabular">{formatNumber(row.partPourcent, 1)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Drawer
        open={selectedVehicleId !== null}
        onClose={() => setSelectedVehicleId(null)}
        title={t('fuelPage.vehicleDetailsTitle')}
        subtitle={selectedVehicleLabel}
      >
        {selectedVehicleId !== null && (
          <VehicleFuelDetailPanel vehicleId={selectedVehicleId} breakdown={selectedBreakdown} />
        )}
      </Drawer>

      <CreateFuelLogDrawer open={createOpen} onClose={() => setCreateOpen(false)} />

      {editingLog && (
        <EditFuelLogDrawer open={editingLog !== null} onClose={() => setEditingLog(null)} log={editingLog} />
      )}
    </PageShell>
  );
}
