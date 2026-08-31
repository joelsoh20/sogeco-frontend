import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Activity, AlertOctagon, CalendarClock, MapPin, Search, Wrench } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MaintenanceCategoryBadge, MaintenanceStatusBadge, CATEGORIES, STATUSES } from '@/components/maintenance/MaintenanceBadges';
import { MaintenanceCategoryDonut } from '@/components/maintenance/MaintenanceCategoryDonut';
import { MaintenanceCostTrendChart } from '@/components/maintenance/MaintenanceCostTrendChart';
import { CreateMaintenanceDrawer } from '@/components/maintenance/CreateMaintenanceDrawer';
import { MaintenanceDetailPanel } from '@/components/maintenance/MaintenanceDetailPanel';
import { MaintenanceCityStatsDrawer } from '@/components/maintenance/MaintenanceCityStatsDrawer';
import { maintenanceApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { formatDate, formatFcfa, formatFcfaCompact, formatPercent } from '@/lib/utils';
import type { MaintenanceCategory, MaintenanceStatus } from '@/types/api';

const PAGE_SIZE = 20;

export function MaintenancePage() {
  const { t } = useTranslation();
  const canCreate = useAuthStore((state) => state.hasPermission('MAINTENANCE_CREATE'));
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<MaintenanceCategory | ''>('');
  const [breakdownOnly, setBreakdownOnly] = useState(false);
  const [cityStatsOpen, setCityStatsOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Arrivee depuis une alerte maintenance ("Voir la source") : pas d'intervention precise
  // rattachee a l'alerte, seulement le camion — on pre-remplit la recherche par immatriculation.
  // Depend de searchParams (pas juste du montage) car on peut deja etre sur cette page
  // quand l'alerte est cliquee, auquel cas React Router ne remonte pas le composant.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearch(q);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const stats = useQuery({ queryKey: ['maintenance', 'stats'], queryFn: () => maintenanceApi.stats() });
  const planned = useQuery({ queryKey: ['maintenance', 'planned'], queryFn: maintenanceApi.planned });
  // Le backend ne filtre pas la liste par statut/categorie/panne : on recupere un lot large
  // et le filtrage + la pagination se font cote client (le parc reste de taille modeste).
  const list = useQuery({ queryKey: ['maintenance', 'list-all'], queryFn: () => maintenanceApi.list(0, 200) });
  const detail = useQuery({
    queryKey: ['maintenance', 'detail', selectedId],
    queryFn: () => maintenanceApi.get(selectedId!),
    enabled: selectedId !== null,
  });

  const resetPage = () => setPage(0);

  const filtered = (list.data?.content ?? []).filter((m) => {
    if (statusFilter && m.status !== statusFilter) return false;
    if (categoryFilter && m.category !== categoryFilter) return false;
    if (breakdownOnly && !m.isBreakdown) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        m.description.toLowerCase().includes(q) ||
        m.registrationNumber.toLowerCase().includes(q) ||
        (m.garageName ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <PageShell
      title={t('maintenancePage.title')}
      subtitle={t('maintenancePage.subtitle')}
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={() => setCityStatsOpen(true)} className="btn-ghost">
            <MapPin size={16} />
            {t('maintenancePage.statsByCity')}
          </button>
        </div>

        <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard label={t('maintenancePage.statTotalCost')} value={formatFcfaCompact(stats.data?.coutTotal)} icon={Wrench} accent="amber" />
          <StatCard label={t('maintenancePage.statInterventions')} value={String(stats.data?.interventions ?? '—')} accent="blue" />
          <StatCard label={t('maintenancePage.statInMaintenance')} value={String(stats.data?.camionsEnMaintenance ?? '—')} icon={Activity} accent="slate" />
          <StatCard label={t('maintenancePage.statBreakdowns')} value={String(stats.data?.pannes ?? '—')} icon={AlertOctagon} accent="red" />
          <StatCard
            label={t('maintenancePage.statUpcoming')}
            value={String(stats.data?.interventionsAVenir ?? '—')}
            icon={CalendarClock}
            accent="green"
          />
          <StatCard label={t('maintenancePage.statPlanned')} value={String(planned.data?.length ?? '—')} icon={Wrench} accent="slate" />
        </StatGrid>

        {/* Repartition des couts par categorie + ratio preventif/curatif */}
        <div className="card-padded">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">{t('maintenancePage.costsTrendTitle')}</h2>
          {stats.data && <MaintenanceCostTrendChart points={stats.data.tendanceCouts} />}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-padded">
            <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">{t('maintenancePage.costsByCategoryTitle')}</h2>
            {stats.data && <MaintenanceCategoryDonut breakdown={stats.data.repartitionParCategorie} total={stats.data.coutTotal} />}
          </div>

          {/* Le ratio preventif / curatif est l'indicateur de maturite du module :
              une flotte bien geree tend vers 70 % de preventif. */}
          <div className="card-padded flex flex-col justify-center">
            {stats.data && stats.data.interventions > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t('maintenancePage.preventiveRatio')}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {t('maintenancePage.preventiveRatioHint')}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold tabular text-slate-900 dark:text-slate-100">
                    {formatPercent(stats.data.tauxPreventif)}
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={stats.data.tauxPreventif >= 70 ? 'h-full bg-emerald-500' : 'h-full bg-amber-500'}
                    style={{ width: `${Math.min(stats.data.tauxPreventif, 100)}%` }}
                  />
                </div>
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  {t('maintenancePage.avgCostPerIntervention')} <span className="font-medium text-slate-700 dark:text-slate-300">{formatFcfa(stats.data.coutMoyenParIntervention)}</span>
                </p>
              </>
            ) : (
              <p className="text-center text-sm text-slate-400">{t('maintenancePage.emptyPeriod')}</p>
            )}
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder={t('maintenancePage.searchPlaceholder')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            />
          </div>
          <select
            className="input w-auto"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as MaintenanceStatus | ''); resetPage(); }}
          >
            <option value="">{t('fuelPage.allStatuses')}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>{t(`status.maintenanceStatus.${value}`)}</option>
            ))}
          </select>
          <select
            className="input w-auto"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value as MaintenanceCategory | ''); resetPage(); }}
          >
            <option value="">{t('maintenancePage.allTypes')}</option>
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>{t(`status.maintenanceCategory.${value}`)}</option>
            ))}
          </select>
          <button
            onClick={() => { setBreakdownOnly((v) => !v); resetPage(); }}
            className={`btn-ghost ${breakdownOnly ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400' : ''}`}
          >
            <AlertOctagon size={14} />
            {t('maintenancePage.breakdownsOnly')}
          </button>

          {canCreate && (
            <button onClick={() => setCreateOpen(true)} className="btn-primary ml-auto">
              <Wrench size={16} />
              {t('maintenancePage.newIntervention')}
            </button>
          )}
        </div>

        {list.isLoading ? (
          <LoadingPanel />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={t('maintenancePage.emptyTitle')}
            action={list.data?.content.length ? t('fuelPage.emptyLogsActionFiltered') : t('maintenancePage.emptyAction')}
          />
        ) : (
          <DataTable
            data={pageItems}
            keyOf={(m) => m.id}
            onRowClick={(m) => setSelectedId(m.id)}
            page={page}
            totalPages={totalPages}
            totalElements={filtered.length}
            onPageChange={setPage}
            columns={[
              { header: t('compliancePage.colDate'), accessor: (m) => formatDate(m.interventionDate) },
              { header: t('compliancePage.colVehicle'), accessor: (m) => <span className="font-medium">{m.registrationNumber}</span> },
              { header: t('compliancePage.colType'), accessor: (m) => <MaintenanceCategoryBadge category={m.category} /> },
              { header: t('maintenancePage.colDescription'), accessor: (m) => m.description },
              { header: t('maintenancePage.colGarage'), accessor: (m) => m.garageName ?? '—' },
              { header: t('compliancePage.colCost'), accessor: (m) => formatFcfa(m.totalCost), align: 'right' },
              {
                header: t('compliancePage.colStatus'),
                accessor: (m) => (
                  <span className="flex items-center gap-1.5">
                    <MaintenanceStatusBadge status={m.status} />
                    {m.isRecurrence && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        {t('maintenancePage.workshopReturn')}
                      </span>
                    )}
                  </span>
                ),
              },
              {
                header: t('maintenancePage.colNextIntervention'),
                accessor: (m) => m.nextInterventionDate
                  ? <span className="text-xs">{formatDate(m.nextInterventionDate)}{m.daysUntilNext !== null && ` ${t('maintenancePage.inDays', { count: m.daysUntilNext })}`}</span>
                  : <span className="text-xs text-slate-400">—</span>,
              },
            ]}
          />
        )}

        {stats.data && stats.data.comparatifGarages.length > 0 && (
          <div className="card overflow-hidden">
            <div className="border-b border-surface-border px-5 py-4 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('maintenancePage.garageComparison')}</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t('maintenancePage.garageComparisonHint')}
              </p>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="table-header">{t('maintenancePage.colGarage')}</th>
                  <th className="table-header text-right">{t('maintenancePage.statInterventions')}</th>
                  <th className="table-header text-right">{t('maintenancePage.colTotalCost')}</th>
                  <th className="table-header text-right">{t('maintenancePage.colAvgCost')}</th>
                  <th className="table-header text-right">{t('maintenancePage.colReturnRate')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border dark:divide-slate-800">
                {stats.data.comparatifGarages.map((garage) => (
                  <tr key={garage.garageId}>
                    <td className="table-cell font-medium">{garage.garageName}</td>
                    <td className="table-cell text-right tabular">{garage.interventions}</td>
                    <td className="table-cell text-right tabular">{formatFcfa(garage.totalCost)}</td>
                    <td className="table-cell text-right tabular">{formatFcfa(garage.averageCost)}</td>
                    <td className={`table-cell text-right tabular ${garage.recurrenceRate > 20 ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {formatPercent(garage.recurrenceRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Drawer
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={detail.data?.description ?? t('maintenancePage.intervention')}
        subtitle={detail.data?.registrationNumber}
      >
        {detail.isLoading ? <LoadingPanel /> : detail.data && <MaintenanceDetailPanel log={detail.data} />}
      </Drawer>

      <CreateMaintenanceDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
      <MaintenanceCityStatsDrawer open={cityStatsOpen} onClose={() => setCityStatsOpen(false)} />
    </PageShell>
  );
}
