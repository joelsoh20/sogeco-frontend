import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Wrench } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { complianceApi } from '@/api/compliance';
import { toast } from '@/store/toastStore';
import { partnerApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { InspectionResult, TechnicalInspectionRequest } from '@/types/compliance';

interface FormValues {
  vehicleId: string;
  partnerId: string;
  inspectionDate: string;
  nextInspectionDate: string;
  result: InspectionResult;
  defectsNoted: string;
  cost: string;
}

export function CreateInspectionDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({
    queryKey: ['vehicles', 'list-for-inspection'],
    queryFn: () => vehicleApi.list(0, 100),
    enabled: open,
  });
  const centers = useQuery({
    queryKey: ['partners', 'CENTRE_VISITE'],
    queryFn: () => partnerApi.active('CENTRE_VISITE'),
    enabled: open,
  });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { result: 'CONFORME' },
  });
  const result = watch('result');

  const create = useMutation({
    mutationFn: (payload: TechnicalInspectionRequest) => complianceApi.createInspection(payload),
    onSuccess: () => {
      toast.success(t('inspectionForm.success'));
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      reset();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    create.mutate({
      vehicleId: Number(values.vehicleId),
      partnerId: values.partnerId ? Number(values.partnerId) : undefined,
      inspectionDate: values.inspectionDate,
      nextInspectionDate: values.nextInspectionDate || undefined,
      result: values.result,
      defectsNoted: values.defectsNoted || undefined,
      cost: values.cost ? Number(values.cost) : undefined,
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('inspectionForm.title')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('compliancePage.colVehicle')}</label>
          <select className="input" {...register('vehicleId', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {vehicles.data?.content.map((v) => (
              <option key={v.id} value={v.id}>{v.registrationNumber}</option>
            ))}
          </select>
          {errors.vehicleId && <p className="mt-1 text-xs text-red-600">{errors.vehicleId.message}</p>}
        </div>

        <div>
          <label className="label">{t('inspectionForm.centerOptional')}</label>
          <select className="input" {...register('partnerId')}>
            <option value="">{t('inspectionForm.centerUnspecified')}</option>
            {centers.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('inspectionForm.controlDate')}</label>
            <input type="date" className="input" {...register('inspectionDate', { required: t('common.requiredField') })} />
          </div>
          <div>
            <label className="label">{t('inspectionForm.nextDeadline')}</label>
            <input type="date" className="input" {...register('nextInspectionDate')} />
            <p className="mt-1 text-xs text-slate-500">{t('inspectionForm.nextDeadlineHint')}</p>
          </div>
        </div>

        <div>
          <label className="label">{t('inspectionForm.result')}</label>
          <select className="input" {...register('result', { required: true })}>
            <option value="CONFORME">{t('inspectionForm.resultConforme')}</option>
            <option value="CONFORME_AVEC_RESERVES">{t('inspectionForm.resultConformeReserves')}</option>
            <option value="NON_CONFORME">{t('inspectionForm.resultNonConforme')}</option>
          </select>
          {result === 'NON_CONFORME' && (
            <p className="mt-1.5 text-xs text-amber-700">
              {t('inspectionForm.blockedWarning')}
            </p>
          )}
        </div>

        {result !== 'CONFORME' && (
          <div>
            <label className="label">{t('inspectionForm.defectsNoted')}</label>
            <textarea className="input min-h-16 resize-none" {...register('defectsNoted')} />
          </div>
        )}

        <div>
          <label className="label">{t('inspectionForm.cost')}</label>
          <input type="number" className="input" {...register('cost')} />
        </div>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <Wrench size={16} />
          {t('common.save')}
        </button>
      </form>
    </Drawer>
  );
}
