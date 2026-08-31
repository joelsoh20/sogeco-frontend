import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { complianceApi } from '@/api/compliance';
import { toast } from '@/store/toastStore';
import { vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { ClaimRequest, ClaimType } from '@/types/compliance';

interface FormValues {
  vehicleId: string;
  incidentDate: string;
  claimType: ClaimType;
  description: string;
  locationLabel: string;
  policeReportNumber: string;
  estimatedCost: string;
}

const CLAIM_TYPES: ClaimType[] = ['COLLISION', 'VOL', 'INCENDIE', 'DEGATS_MATERIELS', 'DOMMAGES_CORPORELS', 'AUTRE'];

export function CreateClaimDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({
    queryKey: ['vehicles', 'list-for-claim'],
    queryFn: () => vehicleApi.list(0, 100),
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const create = useMutation({
    mutationFn: (payload: ClaimRequest) => complianceApi.createClaim(payload),
    onSuccess: () => {
      toast.success(t('claimForm.createSuccess'));
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
      incidentDate: values.incidentDate,
      claimType: values.claimType,
      description: values.description,
      locationLabel: values.locationLabel || undefined,
      policeReportNumber: values.policeReportNumber || undefined,
      estimatedCost: values.estimatedCost ? Number(values.estimatedCost) : undefined,
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('claimForm.createTitle')}>
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('claimForm.incidentDate')}</label>
            <input type="date" className="input" {...register('incidentDate', { required: t('common.requiredField') })} />
          </div>
          <div>
            <label className="label">{t('claimForm.type')}</label>
            <select className="input" {...register('claimType', { required: true })}>
              {CLAIM_TYPES.map((value) => (
                <option key={value} value={value}>{t(`status.claimType.${value}`)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">{t('claimForm.description')}</label>
          <textarea className="input min-h-20 resize-none"
                    {...register('description', { required: t('common.requiredField') })} />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <div>
          <label className="label">{t('claimForm.locationOptional')}</label>
          <input className="input" {...register('locationLabel')} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('claimForm.policeReportOptional')}</label>
            <input className="input" {...register('policeReportNumber')} />
          </div>
          <div>
            <label className="label">{t('claimForm.estimatedCost')}</label>
            <input type="number" className="input" {...register('estimatedCost')} />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          {t('claimForm.policyAttachHint')}
        </p>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <AlertTriangle size={16} />
          {t('claimForm.createSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
