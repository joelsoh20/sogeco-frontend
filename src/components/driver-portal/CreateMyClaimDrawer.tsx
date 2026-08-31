import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { complianceApi } from '@/api/compliance';
import { toast } from '@/store/toastStore';
import { errorMessage } from '@/api/client';
import type { ClaimRequest, ClaimType } from '@/types/compliance';

interface FormValues {
  incidentDate: string;
  claimType: ClaimType;
  description: string;
  locationLabel: string;
  policeReportNumber: string;
  estimatedCost: string;
}

const CLAIM_TYPES: ClaimType[] = ['COLLISION', 'VOL', 'INCENDIE', 'DEGATS_MATERIELS', 'DOMMAGES_CORPORELS', 'AUTRE'];

interface Props {
  open: boolean;
  onClose: () => void;
  vehicleId: number;
  registrationNumber: string;
}

/** Variante simplifiee de CreateClaimDrawer pour l'espace chauffeur : le camion (et le chauffeur) sont imposes. */
export function CreateMyClaimDrawer({ open, onClose, vehicleId, registrationNumber }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const create = useMutation({
    mutationFn: (payload: ClaimRequest) => complianceApi.createClaim(payload),
    onSuccess: () => {
      toast.success(t('claimForm.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['driver-portal'] });
      reset();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    create.mutate({
      vehicleId,
      incidentDate: values.incidentDate,
      claimType: values.claimType,
      description: values.description,
      locationLabel: values.locationLabel || undefined,
      policeReportNumber: values.policeReportNumber || undefined,
      estimatedCost: values.estimatedCost ? Number(values.estimatedCost) : undefined,
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('claimForm.createTitle')} subtitle={t('carteGriseForm.vehicleSubtitle', { registration: registrationNumber })}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('claimForm.incidentDate')}</label>
            <input type="date" className="input" {...register('incidentDate', { required: t('common.requiredField') })} />
            {errors.incidentDate && <p className="mt-1 text-xs text-red-600">{errors.incidentDate.message}</p>}
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
          {t('claimForm.driverImmutableHint')}
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
