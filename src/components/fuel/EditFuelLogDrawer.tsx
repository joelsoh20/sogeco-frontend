import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Save } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { driverApi, fuelApi, partnerApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { suspiciousFuelThreshold } from '@/lib/tankCapacityReference';
import { formatNumber } from '@/lib/utils';
import type { FuelLog, FuelLogRequest } from '@/types/api';

interface FormValues {
  vehicleId: string;
  driverId: string;
  partnerId: string;
  fuelDatetime: string;
  quantityLiters: string;
  unitPrice: string;
  odometerBefore: string;
  odometerAfter: string;
  fullTank: boolean;
  receiptNumber: string;
}

interface EditFuelLogDrawerProps {
  open: boolean;
  onClose: () => void;
  log: FuelLog;
}

/** Instant ISO (UTC) -> chaine locale pour un input datetime-local. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Modification d'un plein — memes champs que la creation, pre-remplis. */
export function EditFuelLogDrawer({ open, onClose, log }: EditFuelLogDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({ queryKey: ['vehicles', 'for-fuel'], queryFn: () => vehicleApi.list(0, 200), enabled: open });
  const drivers = useQuery({ queryKey: ['drivers', 'for-fuel'], queryFn: () => driverApi.list(0, 200), enabled: open });
  const stations = useQuery({ queryKey: ['partners', 'stations'], queryFn: () => partnerApi.active('STATION_SERVICE'), enabled: open });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const selectedVehicleId = watch('vehicleId');
  const quantityLiters = watch('quantityLiters');
  const selectedVehicle = vehicles.data?.content.find((v) => String(v.id) === selectedVehicleId);

  const threshold = selectedVehicle
    ? suspiciousFuelThreshold(selectedVehicle.bodyType, selectedVehicle.tankCapacityLiters)
    : null;
  const suspiciousQuantity = threshold !== null && quantityLiters !== '' && Number(quantityLiters) > threshold;

  useEffect(() => {
    if (open) {
      reset({
        vehicleId: log.vehicleId.toString(),
        driverId: log.driverId?.toString() ?? '',
        partnerId: log.stationId?.toString() ?? '',
        fuelDatetime: toLocalInput(log.fuelDatetime),
        quantityLiters: log.quantityLiters.toString(),
        unitPrice: log.unitPrice.toString(),
        odometerBefore: log.odometerBefore?.toString() ?? '',
        odometerAfter: log.odometerAfter.toString(),
        fullTank: log.fullTank,
        receiptNumber: log.receiptNumber ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, log.id]);

  const update = useMutation({
    mutationFn: (payload: FuelLogRequest) => fuelApi.update(log.id, payload),
    onSuccess: (updated) => {
      toast.success(t('fuelForm.editSuccess', { registration: updated.registrationNumber }));
      queryClient.invalidateQueries({ queryKey: ['fuel'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    update.mutate({
      vehicleId: Number(values.vehicleId),
      driverId: values.driverId ? Number(values.driverId) : undefined,
      partnerId: values.partnerId ? Number(values.partnerId) : undefined,
      fuelDatetime: new Date(values.fuelDatetime).toISOString(),
      quantityLiters: Number(values.quantityLiters),
      unitPrice: Number(values.unitPrice),
      odometerBefore: values.odometerBefore ? Number(values.odometerBefore) : undefined,
      odometerAfter: Number(values.odometerAfter),
      fullTank: values.fullTank,
      receiptNumber: values.receiptNumber || undefined,
    });
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('fuelForm.editTitle')} subtitle={log.registrationNumber}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('compliancePage.colVehicle')}</label>
          <select className="input" {...register('vehicleId', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {vehicles.data?.content.map((v) => (
              <option key={v.id} value={v.id}>{v.registrationNumber} — {v.brand} {v.model}</option>
            ))}
          </select>
          {errors.vehicleId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehicleId.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('fuelForm.driverOptional')}</label>
            <select className="input" {...register('driverId')}>
              <option value="">{t('common.none')}</option>
              {drivers.data?.content.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('fuelForm.stationOptional')}</label>
            <select className="input" {...register('partnerId')}>
              <option value="">{t('fuelForm.noneFeminine')}</option>
              {stations.data?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">{t('fuelForm.dateTime')}</label>
          <input type="datetime-local" className="input" {...register('fuelDatetime', { required: t('common.requiredField') })} />
          {errors.fuelDatetime && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.fuelDatetime.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('fuelForm.quantity')}</label>
            <input type="number" step="0.01" className="input" {...register('quantityLiters', { required: t('common.requiredField') })} />
            {errors.quantityLiters && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.quantityLiters.message}</p>}
          </div>
          <div>
            <label className="label">{t('fuelForm.unitPrice')}</label>
            <input type="number" step="0.01" className="input" {...register('unitPrice', { required: t('common.requiredField') })} />
            {errors.unitPrice && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.unitPrice.message}</p>}
          </div>
        </div>

        {suspiciousQuantity && (
          <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 px-3.5 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              {t('fuelForm.suspiciousQuantity', {
                liters: formatNumber(Number(quantityLiters)),
                bodyType: selectedVehicle ? t(`vehicle.bodyType.${selectedVehicle.bodyType}`).toLowerCase() : '',
              })}
              {selectedVehicle?.tankCapacityLiters
                ? ` ${t('fuelForm.suspiciousQuantityTankHint', { liters: formatNumber(selectedVehicle.tankCapacityLiters) })}`
                : ` ${t('fuelForm.suspiciousQuantityDefaultHint')}`}
              {' '}{t('fuelForm.suspiciousQuantityCheck')}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('fuelPage.colOdometerBefore')} ({t('common.optional')})</label>
            <input type="number" className="input" {...register('odometerBefore')} />
          </div>
          <div>
            <label className="label">{t('fuelPage.colOdometerAfter')}</label>
            <input type="number" className="input" {...register('odometerAfter', { required: t('common.requiredField') })} />
            {errors.odometerAfter && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.odometerAfter.message}</p>}
          </div>
        </div>

        <div className="rounded-lg border border-surface-border p-3 dark:border-slate-700">
          <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" className="rounded" {...register('fullTank')} />
            {t('fuelForm.fullTank')}
          </label>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('fuelForm.fullTankHint')}
          </p>
        </div>

        <div>
          <label className="label">{t('fuelForm.receiptNumber')}</label>
          <input className="input" {...register('receiptNumber')} />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || update.isPending} className="btn-primary w-full">
          {(isSubmitting || update.isPending) && <Spinner className="text-white" />}
          <Save size={16} />
          {t('maintenanceForm.editSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
