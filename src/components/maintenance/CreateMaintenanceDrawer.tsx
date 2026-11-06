import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Wrench } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { maintenanceApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import {
  MaintenanceFormFields, buildMaintenancePayload, isRepairCategory, type MaintenanceFormValues,
} from './MaintenanceFormFields';
import type { MaintenanceRequest } from '@/types/api';

interface CreateMaintenanceDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Creation d'une intervention. Une reparation (mecanique, pneumatique, electricite)
 * suppose un camion declare en panne ; laverie, autres et preventif non (RG-7.11).
 */
export function CreateMaintenanceDrawer({ open, onClose }: CreateMaintenanceDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({ queryKey: ['vehicles', 'for-maintenance'], queryFn: () => vehicleApi.list(0, 200), enabled: open });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<MaintenanceFormValues>({
    defaultValues: { partChanged: false },
  });
  const category = watch('category');
  const partChanged = watch('partChanged');
  const repair = isRepairCategory(category);
  const selectable = (vehicles.data?.content ?? [])
    .filter((v) => !repair || v.status === 'EN_PANNE' || v.status === 'EN_MAINTENANCE');

  const create = useMutation({
    mutationFn: (payload: MaintenanceRequest) => maintenanceApi.create(payload),
    onSuccess: (log) => {
      toast.success(t('maintenanceForm.createSuccess', { registration: log.registrationNumber }));
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      reset();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('maintenanceForm.createTitle')} subtitle={t('maintenanceForm.createSubtitle')}>
      <form onSubmit={handleSubmit((values) => { setError(null); create.mutate(buildMaintenancePayload(values)); })} className="space-y-4">
        <MaintenanceFormFields register={register} setValue={setValue} errors={errors}
          category={category} partChanged={partChanged} vehicles={selectable} repairHint />

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>
        )}

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <Wrench size={16} />
          {t('maintenanceForm.createSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
