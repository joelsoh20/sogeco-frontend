import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { maintenanceApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import {
  MaintenanceFormFields, buildMaintenancePayload, valuesFromLog, type MaintenanceFormValues,
} from './MaintenanceFormFields';
import type { MaintenanceLog, MaintenanceRequest } from '@/types/api';

interface EditMaintenanceDrawerProps {
  open: boolean;
  onClose: () => void;
  log: MaintenanceLog;
}

/** Modification d'une intervention — memes champs que la creation, pre-remplis. */
export function EditMaintenanceDrawer({ open, onClose, log }: EditMaintenanceDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({ queryKey: ['vehicles', 'for-maintenance'], queryFn: () => vehicleApi.list(0, 200), enabled: open });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<MaintenanceFormValues>({
    defaultValues: { partChanged: false },
  });
  const category = watch('category');
  const partChanged = watch('partChanged');

  useEffect(() => {
    if (open) reset(valuesFromLog(log));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, log.id]);

  const update = useMutation({
    mutationFn: (payload: MaintenanceRequest) => maintenanceApi.update(log.id, payload),
    onSuccess: (updated) => {
      toast.success(t('maintenanceForm.editSuccess', { registration: updated.registrationNumber }));
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('maintenanceForm.editTitle')} subtitle={log.registrationNumber}>
      <form onSubmit={handleSubmit((values) => { setError(null); update.mutate(buildMaintenancePayload(values)); })} className="space-y-4">
        <MaintenanceFormFields register={register} setValue={setValue} errors={errors}
          category={category} partChanged={partChanged} vehicles={vehicles.data?.content ?? []} />

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>
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
