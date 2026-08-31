import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Award, Fuel, Gauge, ShieldAlert, UserCheck, UserPlus, Users } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { DataTable } from '@/components/ui/DataTable';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { RatingDonut } from '@/components/drivers/RatingDonut';
import { BestDriversRanking } from '@/components/drivers/BestDriversRanking';
import { FuelEconomyTop5 } from '@/components/drivers/FuelEconomyTop5';
import { DriverAlertsOverview } from '@/components/drivers/DriverAlertsOverview';
import { DriverDetailPanel } from '@/components/drivers/DriverDetailPanel';
import { CreateDriverDrawer } from '@/components/drivers/CreateDriverDrawer';
import { alertApi, driverApi, fuelApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { formatConsumption, formatKm, formatNumber } from '@/lib/utils';

const STATUS_KEYS: Record<string, string> = {
  ACTIF: 'driversPage.statusActive',
  EN_CONGE: 'driversPage.statusOnLeave',
  SUSPENDU: 'driversPage.statusSuspended',
  SORTI: 'driversPage.statusLeft',
};

function firstOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DriversPage() {
  const { t } = useTranslation();
  const canCreate = useAuthStore((state) => state.hasPermission('DRIVER_CREATE'));
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Arrivee depuis une alerte ("Voir la source") : ouvre directement le chauffeur vise.
  // Depend de searchParams (pas juste du montage) car on peut deja etre sur cette page
  // quand l'alerte est cliquee, auquel cas React Router ne remonte pas le composant.
  useEffect(() => {
    const driverId = searchParams.get('driverId');
    if (driverId) {
      setSelectedId(Number(driverId));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const stats = useQuery({ queryKey: ['drivers', 'stats'], queryFn: driverApi.stats });
  const list = useQuery({
    queryKey: ['drivers', 'list', page],
    queryFn: () => driverApi.list(page, 20),
  });
  const fuelEconomy = useQuery({
    queryKey: ['drivers', 'fuel-economy'],
    queryFn: () => driverApi.fuelEconomy(firstOfMonth(), today(), 5),
  });
  const fuelStats = useQuery({
    queryKey: ['fuel', 'stats', firstOfMonth(), today()],
    queryFn: () => fuelApi.stats(firstOfMonth(), today()),
  });
  const recentAlerts = useQuery({ queryKey: ['alerts', 'recent'], queryFn: alertApi.recent });
  const driverAlerts = (recentAlerts.data ?? []).filter((a) => a.driverId !== null);

  return (
    <PageShell
      title={t('driversPage.title')}
      subtitle={t('driversPage.subtitle')}
    >
      <div className="space-y-6">
        <StatGrid className="sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard label={t('driversPage.statTotal')} value={String(stats.data?.total ?? '—')} icon={Users} accent="blue" />
          <StatCard
            label={t('driversPage.statActive')}
            value={String(stats.data?.actifs ?? '—')}
            hint={stats.data?.total ? `${Math.round((stats.data.actifs / stats.data.total) * 100)}%` : undefined}
            icon={UserCheck}
            accent="green"
          />
          <StatCard
            label={t('driversPage.statAvgPerformance')}
            value={stats.data?.averagePerformance ? `${Math.round(stats.data.averagePerformance)}/100` : '—'}
            icon={Award}
            accent="green"
          />
          <StatCard label={t('driversPage.statKm')} value={formatKm(stats.data?.totalKilometers)} icon={Gauge} accent="slate" />
          <StatCard label={t('driversPage.statAvgConsumption')} value={formatConsumption(fuelStats.data?.consommationMoyenne)} icon={Fuel} lowerIsBetter accent="slate" />
          <StatCard
            label={t('driversPage.statIncidents')}
            value={String(stats.data?.totalIncidents ?? '—')}
            icon={ShieldAlert}
            lowerIsBetter
            accent={(stats.data?.totalIncidents ?? 0) > 0 ? 'amber' : 'slate'}
          />
        </StatGrid>

        {(stats.data?.licensesExpiringSoon ?? 0) > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            <AlertTriangle size={16} />
            {t('driversPage.licensesExpiringSoon', { count: stats.data!.licensesExpiringSoon })}
          </div>
        )}

        {/* Repartition par notation + Top 5 economie de carburant */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-padded">
            <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">{t('driversPage.ratingDistribution')}</h2>
            {stats.data && <RatingDonut distribution={stats.data.ratingDistribution} />}
          </div>
          <div className="card-padded">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <Fuel size={16} className="text-emerald-600" />
              {t('driversPage.fuelEconomyTop5')}
            </h2>
            {fuelEconomy.isLoading
              ? <p className="py-8 text-center text-sm text-slate-400">{t('common.loading')}</p>
              : <FuelEconomyTop5 rows={fuelEconomy.data ?? []} />}
          </div>
        </div>

        <BestDriversRanking />

        {/* Alertes chauffeurs — extraites du flux d'alertes flotte, filtrees a celles liees a un chauffeur */}
        <div className="card-padded">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <AlertTriangle size={16} className="text-amber-600" />
            {t('driversPage.driverAlerts')}
          </h2>
          {recentAlerts.isLoading
            ? <p className="py-8 text-center text-sm text-slate-400">{t('common.loading')}</p>
            : <DriverAlertsOverview alerts={driverAlerts} />}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {t('driversPage.totalCount', { count: list.data?.totalElements ?? 0 })}
          </p>
          {canCreate && (
            <button onClick={() => setCreateOpen(true)} className="btn-primary">
              <UserPlus size={16} />
              {t('driversPage.newDriver')}
            </button>
          )}
        </div>

        {!list.data?.content.length && !list.isLoading ? (
          <EmptyState
            icon={Users}
            title={t('driversPage.emptyTitle')}
            action={t('driversPage.emptyAction')}
          />
        ) : (
          <DataTable
            data={list.data?.content ?? []}
            keyOf={(d) => d.id}
            onRowClick={(d) => setSelectedId(d.id)}
            page={list.data?.page}
            totalPages={list.data?.totalPages}
            totalElements={list.data?.totalElements}
            onPageChange={setPage}
            loading={list.isLoading}
            columns={[
              { header: t('driversPage.colMatricule'), accessor: (d) => <span className="tabular font-medium">{d.matricule}</span> },
              { header: t('driversPage.colDriver'), accessor: (d) => d.fullName },
              { header: t('compliancePage.colVehicle'), accessor: (d) => d.registrationNumber ?? '—' },
              { header: t('compliancePage.colStatus'), accessor: (d) => t(STATUS_KEYS[d.status] ?? d.status) },
              { header: t('driversPage.colMissions'), accessor: (d) => formatNumber(d.totalMissions), align: 'right' },
              { header: t('driversPage.colKm'), accessor: (d) => formatKm(d.totalKilometers), align: 'right' },
              { header: t('driversPage.colIncidents'), accessor: (d) => formatNumber(d.incidentsCount), align: 'right' },
              { header: t('driversPage.colPerformance'), accessor: (d) => <ScoreBadge score={d.performanceScore} ratingClass={d.ratingClass} /> },
            ]}
          />
        )}
      </div>

      <Drawer
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={list.data?.content.find((d) => d.id === selectedId)?.fullName ?? ''}
        subtitle={list.data?.content.find((d) => d.id === selectedId)?.matricule}
      >
        {selectedId !== null && <DriverDetailPanel driverId={selectedId} />}
      </Drawer>

      <CreateDriverDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </PageShell>
  );
}
