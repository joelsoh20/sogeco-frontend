import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Fuel, Gauge, Pencil, Wrench } from 'lucide-react';
import { vehicleApi } from '@/api/endpoints';
import { VehicleStatusBadge } from '@/components/ui/StatusBadge';
import { DetailRow } from '@/components/ui/Drawer';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EditVehicleDrawer } from './EditVehicleDrawer';
import { useAuthStore } from '@/store/authStore';
import { canEditRecord } from '@/lib/editWindow';
import { formatConsumption, formatKm, formatPercent } from '@/lib/utils';

export function VehicleDetailPanel({ vehicleId }: { vehicleId: number }) {
  const { t } = useTranslation();
  const canUpdate = useAuthStore((state) => state.hasPermission('VEHICLE_UPDATE'));
  const isAdmin = useAuthStore((state) => state.hasRole('ROLE_ADMIN'));
  const [editOpen, setEditOpen] = useState(false);

  const detail = useQuery({ queryKey: ['vehicles', 'detail', vehicleId], queryFn: () => vehicleApi.get(vehicleId) });

  if (detail.isLoading || !detail.data) {
    return <LoadingPanel />;
  }

  const vehicle = detail.data;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <VehicleStatusBadge status={vehicle.status} />
        <div className="flex items-center gap-3">
          {!vehicle.active && (
            <span className="text-xs font-medium text-slate-400">{t('vehicleDetail.deactivated')}</span>
          )}
          {canUpdate && canEditRecord(vehicle.createdAt, isAdmin) && (
            <button onClick={() => setEditOpen(true)} className="btn-ghost py-1 text-xs">
              <Pencil size={13} />
              {t('common.edit')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50">
          <Gauge size={16} className="mx-auto text-slate-400" />
          <p className="mt-1.5 text-sm font-semibold tabular text-slate-800 dark:text-slate-200">
            {formatKm(vehicle.currentKilometers)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('vehicleDetail.mileage')}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50">
          <Fuel size={16} className="mx-auto text-slate-400" />
          <p className="mt-1.5 text-sm font-semibold tabular text-slate-800 dark:text-slate-200">
            {formatConsumption(vehicle.avgFuelConsumption)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('fuelPage.statAvgConsumption')}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50">
          <Wrench size={16} className="mx-auto text-slate-400" />
          <p className="mt-1.5 text-sm font-semibold tabular text-slate-800 dark:text-slate-200">
            {formatPercent(vehicle.fuelLevelPercent)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('vehiclesPage.colFuel')}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('vehicleDetail.generalInfo')}
        </h3>
        <DetailRow label={t('vehiclesPage.colBrandModel')} value={`${vehicle.brand} ${vehicle.model}`} />
        <DetailRow label={t('compliancePage.colType')} value={t(`vehicle.bodyType.${vehicle.bodyType}`)} />
        <DetailRow label={t('vehicleDetail.capacity')} value={vehicle.capacityTons ? `${vehicle.capacityTons} T` : '—'} />
        <DetailRow label={t('reportsPage.colCity')} value={vehicle.cityName ?? '—'} />
        <DetailRow label={t('vehicleDetail.assignedDriver')} value={vehicle.driverName ?? t('common.none')} />
        <DetailRow label={t('vehicleDetail.dailyKm')} value={formatKm(vehicle.dailyKm)} />
        {vehicle.avgFuelConsumptionLoaded != null && (
          <DetailRow label={t('vehicleDetail.avgConsumptionLoaded')} value={formatConsumption(vehicle.avgFuelConsumptionLoaded)} />
        )}
      </div>

      <EditVehicleDrawer open={editOpen} onClose={() => setEditOpen(false)} vehicle={vehicle} />
    </div>
  );
}
