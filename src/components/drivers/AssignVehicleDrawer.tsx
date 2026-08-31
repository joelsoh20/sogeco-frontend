import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Truck } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import type { AssignmentRequest } from '@/types/api';

interface FormValues {
  vehicleId: string;
  startDate: string;
  notes: string;
}

interface AssignVehicleDrawerProps {
  open: boolean;
  onClose: () => void;
  driverId: number;
  driverName: string;
}

/**
 * Affectation standing d'un camion a un chauffeur (RG-9.x) — distincte
 * de l'affectation ponctuelle a une mission. Le camion choisi doit
 * etre libre : le backend refuse sinon (RG-9.4/RG-9.5).
 */
export function AssignVehicleDrawer({ open, onClose, driverId, driverName }: AssignVehicleDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({ queryKey: ['vehicles', 'for-assignment'], queryFn: () => vehicleApi.list(0, 200), enabled: open });
  const availableVehicles = (vehicles.data?.content ?? []).filter((v) => v.active && v.driverId == null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const assign = useMutation({
    mutationFn: ({ vehicleId, payload }: { vehicleId: number; payload: AssignmentRequest }) =>
      vehicleApi.assignDriver(vehicleId, payload),
    onSuccess: (assignment) => {
      toast.success(t('assignVehicleForm.success', { driverName, registration: assignment.registrationNumber }));
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      reset();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    assign.mutate({
      vehicleId: Number(values.vehicleId),
      payload: { driverId, startDate: values.startDate || undefined, notes: values.notes || undefined },
    });
  };

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('assignVehicleForm.title')} subtitle={driverName}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('compliancePage.colVehicle')}</label>
          <select className="input" {...register('vehicleId', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {availableVehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.registrationNumber} — {v.brand} {v.model}</option>
            ))}
          </select>
          {errors.vehicleId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehicleId.message}</p>}
          {!vehicles.isLoading && availableVehicles.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">{t('assignVehicleForm.noneAvailable')}</p>
          )}
        </div>

        <div>
          <label className="label">{t('assignVehicleForm.startDateOptional')}</label>
          <input type="date" className="input" {...register('startDate')} />
          <p className="mt-1 text-xs text-slate-400">{t('assignVehicleForm.startDateHint')}</p>
        </div>

        <div>
          <label className="label">{t('carteGriseForm.notes')}</label>
          <textarea className="input min-h-16 resize-none" {...register('notes')} />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || assign.isPending} className="btn-primary w-full">
          {(isSubmitting || assign.isPending) && <Spinner className="text-white" />}
          <Truck size={16} />
          {t('assignVehicleForm.submit')}
        </button>
      </form>
    </Drawer>
  );
}
