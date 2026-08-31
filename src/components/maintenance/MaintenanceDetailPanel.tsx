import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Truck, Play, CheckCircle2, Pencil, XCircle } from 'lucide-react';
import { DetailRow } from '@/components/ui/Drawer';
import { VehicleStatusBadge } from '@/components/ui/StatusBadge';
import { LoadingPanel } from '@/components/ui/Spinner';
import { maintenanceApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { canEditRecord } from '@/lib/editWindow';
import { formatDate, formatFcfa, formatKm } from '@/lib/utils';
import { MaintenanceCategoryBadge, MaintenanceStatusBadge } from './MaintenanceBadges';
import { EditMaintenanceDrawer } from './EditMaintenanceDrawer';
import type { MaintenanceLog } from '@/types/api';

export function MaintenanceDetailPanel({ log }: { log: MaintenanceLog }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canUpdate = useAuthStore((state) => state.hasPermission('MAINTENANCE_UPDATE'));
  const isAdmin = useAuthStore((state) => state.hasRole('ROLE_ADMIN'));
  const [editOpen, setEditOpen] = useState(false);

  const vehicle = useQuery({ queryKey: ['vehicles', 'detail', log.vehicleId], queryFn: () => vehicleApi.get(log.vehicleId) });

  const changeStatus = useMutation({
    mutationFn: (status: string) =>
      maintenanceApi.changeStatus(log.id, status, status === 'TERMINEE' ? new Date().toISOString().slice(0, 10) : undefined),
    onSuccess: () => {
      toast.success(t('maintenanceDetail.statusUpdated'));
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-5">
      {/* Bloc camion — coherent avec l'entete de la maquette : marque/modele, statut, km */}
      <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
        <div className="rounded-lg bg-white p-2 text-slate-400 shadow-sm dark:bg-slate-900 dark:text-slate-500">
          <Truck size={20} />
        </div>
        <div className="min-w-0 flex-1">
          {vehicle.isLoading ? (
            <p className="text-sm text-slate-400">{t('common.loading')}</p>
          ) : vehicle.data ? (
            <>
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                {vehicle.data.brand} {vehicle.data.model}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatKm(vehicle.data.currentKilometers)}
                {vehicle.data.driverName && ` · ${vehicle.data.driverName}`}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">{t('vehicleFuelDetail.notFound')}</p>
          )}
        </div>
        {vehicle.data && <VehicleStatusBadge status={vehicle.data.status} />}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaintenanceCategoryBadge category={log.category} />
          <MaintenanceStatusBadge status={log.status} />
        </div>
        {canUpdate && canEditRecord(log.createdAt, isAdmin) && (
          <button onClick={() => setEditOpen(true)} className="btn-ghost py-1 text-xs">
            <Pencil size={13} />
            {t('common.edit')}
          </button>
        )}
      </div>

      <div>
        <DetailRow label={t('claimForm.description')} value={log.description} />
        <DetailRow label={t('compliancePage.colDate')} value={formatDate(log.interventionDate)} />
        <DetailRow label={t('maintenanceDetail.garage')} value={log.garageName ?? '—'} />
        <DetailRow label={t('vehicleDetail.mileage')} value={formatKm(log.odometerKm)} />
        {log.errorCode && <DetailRow label={t('maintenanceDetail.errorCode')} value={log.errorCode} />}
        {log.isRecurrence && (
          <DetailRow label={t('maintenanceDetail.workshopReturn')} value={<span className="text-amber-600 dark:text-amber-400">{t('maintenanceDetail.workshopReturnValue')}</span>} />
        )}
        {log.nextInterventionDate && (
          <DetailRow
            label={t('maintenanceDetail.nextIntervention')}
            value={`${formatDate(log.nextInterventionDate)}${log.daysUntilNext !== null ? ` ${t('maintenanceDetail.inDays', { count: log.daysUntilNext })}` : ''}`}
          />
        )}
      </div>

      {log.items.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('maintenanceDetail.partsAndServices')}
          </p>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-surface-border dark:divide-slate-800">
              {log.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 text-slate-700 dark:text-slate-300">{item.label}</td>
                  <td className="py-2 text-right tabular text-slate-500 dark:text-slate-400">×{item.quantity}</td>
                  <td className="py-2 text-right tabular font-medium text-slate-800 dark:text-slate-200">
                    {formatFcfa(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
        <DetailRow label={t('maintenanceDetail.parts')} value={formatFcfa(log.partsCost)} />
        <DetailRow label={t('maintenanceDetail.labor')} value={formatFcfa(log.laborCost)} />
        <div className="flex items-center justify-between pt-2.5 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">{t('common.total')}</span>
          <span className="text-base font-semibold tabular text-slate-900 dark:text-slate-100">
            {formatFcfa(log.totalCost)}
          </span>
        </div>
      </div>

      {canUpdate && (log.status === 'PLANIFIEE' || log.status === 'EN_COURS') && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('driverDetail.actions')}
          </p>
          {changeStatus.isPending ? <LoadingPanel /> : (
            <div className="grid grid-cols-2 gap-2">
              {log.status === 'PLANIFIEE' && (
                <button onClick={() => changeStatus.mutate('EN_COURS')} className="btn-ghost flex-col gap-1 py-3 text-xs">
                  <Play size={18} className="text-accent" />
                  {t('maintenanceDetail.start')}
                </button>
              )}
              {log.status === 'EN_COURS' && (
                <button onClick={() => changeStatus.mutate('TERMINEE')} className="btn-ghost flex-col gap-1 py-3 text-xs">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  {t('maintenanceDetail.finish')}
                </button>
              )}
              <button onClick={() => changeStatus.mutate('ANNULEE')} className="btn-ghost flex-col gap-1 py-3 text-xs">
                <XCircle size={18} className="text-red-600" />
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      )}

      <EditMaintenanceDrawer open={editOpen} onClose={() => setEditOpen(false)} log={log} />
    </div>
  );
}
