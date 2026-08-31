import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Fuel } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { driverApi, fuelApi, partnerApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { suspiciousFuelThreshold } from '@/lib/tankCapacityReference';
import { formatNumber } from '@/lib/utils';
import type { FuelLogRequest } from '@/types/api';

interface FormValues {
  vehicleId: string;
  driverId: string;
  partnerId: string;
  fuelDatetime: string;
  quantityLiters: string;
  unitPrice: string;
  odometerAfter: string;
  fullTank: boolean;
  receiptNumber: string;
}

interface CreateFuelLogDrawerProps {
  open: boolean;
  onClose: () => void;
}

function nowLocal(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

/**
 * Saisie d'un plein. POST /fuel-logs existait deja cote backend
 * (FuelController.create) mais la page Carburant n'affichait que des
 * stats agregees — aucun formulaire ne l'appelait.
 */
export function CreateFuelLogDrawer({ open, onClose }: CreateFuelLogDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({ queryKey: ['vehicles', 'for-fuel'], queryFn: () => vehicleApi.list(0, 200), enabled: open });
  const drivers = useQuery({ queryKey: ['drivers', 'for-fuel'], queryFn: () => driverApi.list(0, 200), enabled: open });
  const stations = useQuery({ queryKey: ['partners', 'stations'], queryFn: () => partnerApi.active('STATION_SERVICE'), enabled: open });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { fuelDatetime: nowLocal(), fullTank: true },
  });

  const selectedVehicleId = watch('vehicleId');
  const quantityLiters = watch('quantityLiters');
  const selectedVehicle = vehicles.data?.content.find((v) => String(v.id) === selectedVehicleId);

  // Le chauffeur du camion selectionne (affectation standing) se propose automatiquement —
  // le champ reste modifiable pour le cas ou une autre personne a fait le plein.
  useEffect(() => {
    setValue('driverId', selectedVehicle?.driverId ? String(selectedVehicle.driverId) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId]);

  const threshold = selectedVehicle
    ? suspiciousFuelThreshold(selectedVehicle.bodyType, selectedVehicle.tankCapacityLiters)
    : null;
  const suspiciousQuantity = threshold !== null && quantityLiters !== '' && Number(quantityLiters) > threshold;

  const create = useMutation({
    mutationFn: (payload: FuelLogRequest) => fuelApi.create(payload),
    onSuccess: (log) => {
      toast.success(t('fuelForm.createSuccess', { registration: log.registrationNumber }));
      queryClient.invalidateQueries({ queryKey: ['fuel'] });
      reset({ fuelDatetime: nowLocal(), fullTank: true });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    create.mutate({
      vehicleId: Number(values.vehicleId),
      driverId: values.driverId ? Number(values.driverId) : undefined,
      partnerId: values.partnerId ? Number(values.partnerId) : undefined,
      fuelDatetime: new Date(values.fuelDatetime).toISOString(),
      quantityLiters: Number(values.quantityLiters),
      unitPrice: Number(values.unitPrice),
      // Pas de "Km avant" saisi : le backend reprend automatiquement le
      // dernier kilometrage connu du camion (FuelService.create), qui est
      // deja affiche a titre indicatif sous le champ "Km après" ci-dessous —
      // demander de le retaper serait une redondance pure.
      odometerAfter: Number(values.odometerAfter),
      fullTank: values.fullTank,
      receiptNumber: values.receiptNumber || undefined,
    });
  };

  const handleClose = () => {
    setError(null);
    reset({ fuelDatetime: nowLocal(), fullTank: true });
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('fuelForm.createTitle')} subtitle={t('fuelForm.createSubtitle')}>
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
            {selectedVehicle?.driverName && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('fuelForm.assignedDriver', { name: selectedVehicle.driverName })}
              </p>
            )}
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

        <div>
          <label className="label">{t('fuelForm.odometerReading')}</label>
          <input type="number" className="input" {...register('odometerAfter', { required: t('common.requiredField') })} />
          {errors.odometerAfter ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.odometerAfter.message}</p>
          ) : selectedVehicle?.currentKilometers != null && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('fuelForm.lastKnownOdometer', { km: formatNumber(selectedVehicle.currentKilometers) })}
            </p>
          )}
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

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <Fuel size={16} />
          {t('fuelForm.createSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
