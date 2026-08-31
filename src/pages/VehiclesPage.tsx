import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Fuel, Plus, Truck, Wrench } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { DataTable } from '@/components/ui/DataTable';
import { VehicleStatusBadge } from '@/components/ui/StatusBadge';
import { Drawer } from '@/components/ui/Drawer';
import { VehicleDetailPanel } from '@/components/vehicles/VehicleDetailPanel';
import { CreateVehicleDrawer } from '@/components/vehicles/CreateVehicleDrawer';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { vehicleApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { formatConsumption, formatKm, formatPercent } from '@/lib/utils';

export function VehiclesPage() {
  const { t } = useTranslation();
  const canCreate = useAuthStore((state) => state.hasPermission('VEHICLE_CREATE'));
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Arrivee depuis une alerte ("Voir la source") : ouvre directement le camion vise.
  // Depend de searchParams (pas juste du montage) car on peut deja etre sur cette page
  // quand l'alerte est cliquee, auquel cas React Router ne remonte pas le composant.
  useEffect(() => {
    const vehicleId = searchParams.get('vehicleId');
    if (vehicleId) {
      setSelectedId(Number(vehicleId));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const stats = useQuery({ queryKey: ['vehicles', 'stats'], queryFn: vehicleApi.stats });
  const list = useQuery({
    queryKey: ['vehicles', 'list', page],
    queryFn: () => vehicleApi.list(page, 20),
  });

  return (
    <PageShell
      title={t('vehiclesPage.title')}
      subtitle={t('vehiclesPage.subtitle')}
    >
      <div className="space-y-6">
        <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label={t('vehiclesPage.statTotal')} value={String(stats.data?.total ?? '—')} icon={Truck} accent="blue" />
          <StatCard label={t('status.vehicle.EN_MISSION')} value={String(stats.data?.enMission ?? '—')} accent="blue" />
          <StatCard label={t('status.vehicle.DISPONIBLE')} value={String(stats.data?.disponible ?? '—')} accent="green" />
          <StatCard label={t('status.vehicle.EN_MAINTENANCE')} value={String(stats.data?.enMaintenance ?? '—')} icon={Wrench} accent="amber" />
          <StatCard label={t('status.vehicle.EN_PANNE')} value={String(stats.data?.enPanne ?? '—')} icon={Fuel} accent="red" />
        </StatGrid>

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {t('vehiclesPage.totalCount', { count: list.data?.totalElements ?? 0 })}
          </p>
          {canCreate && (
            <button onClick={() => setCreateOpen(true)} className="btn-primary">
              <Plus size={16} />
              {t('vehiclesPage.addVehicle')}
            </button>
          )}
        </div>

        {list.isLoading ? (
          <LoadingPanel />
        ) : !list.data?.content.length ? (
          <EmptyState
            icon={Truck}
            title={t('vehiclesPage.emptyTitle')}
            action={t('vehiclesPage.emptyAction')}
          />
        ) : (
          <DataTable
            data={list.data.content}
            keyOf={(v) => v.id}
            onRowClick={(v) => setSelectedId(v.id)}
            page={list.data.page}
            totalPages={list.data.totalPages}
            totalElements={list.data.totalElements}
            onPageChange={setPage}
            columns={[
              { header: t('vehiclesPage.colRegistration'), accessor: (v) => <span className="font-medium">{v.registrationNumber}</span> },
              { header: t('vehiclesPage.colBrandModel'), accessor: (v) => `${v.brand} ${v.model}` },
              { header: t('compliancePage.colType'), accessor: (v) => t(`vehicle.bodyType.${v.bodyType}`) },
              { header: t('driversPage.colDriver'), accessor: (v) => v.driverName ?? '—' },
              { header: t('compliancePage.colStatus'), accessor: (v) => <VehicleStatusBadge status={v.status} /> },
              { header: t('driversPage.colKm'), accessor: (v) => formatKm(v.currentKilometers), align: 'right' },
              { header: t('vehiclesPage.colConsumption'), accessor: (v) => formatConsumption(v.avgFuelConsumption), align: 'right' },
              { header: t('vehiclesPage.colFuel'), accessor: (v) => formatPercent(v.fuelLevelPercent), align: 'right' },
            ]}
          />
        )}
      </div>

      <Drawer
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={list.data?.content.find((v) => v.id === selectedId)?.registrationNumber ?? ''}
        subtitle={list.data?.content.find((v) => v.id === selectedId)?.model}
      >
        {selectedId !== null && <VehicleDetailPanel vehicleId={selectedId} />}
      </Drawer>

      <CreateVehicleDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </PageShell>
  );
}
