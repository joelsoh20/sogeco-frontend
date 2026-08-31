import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { complianceApi } from '@/api/compliance';
import { toast } from '@/store/toastStore';
import { partnerApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { BODY_TYPES } from '@/lib/bodyTypeLabels';
import type { BodyType } from '@/types/api';
import type { InsuranceCoverageType, InsurancePolicyRequest } from '@/types/compliance';

interface FormValues {
  policyNumber: string;
  partnerId: string;
  coverageType: InsuranceCoverageType;
  category: BodyType | '';
  vehicleRegistration: string;
  startDate: string;
  endDate: string;
  notes: string;
}

const COVERAGE_TYPES: InsuranceCoverageType[] = ['TOUS_RISQUES', 'TIERS', 'TIERS_VOL_INCENDIE'];

export function CreatePolicyDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const insurers = useQuery({
    queryKey: ['partners', 'ASSUREUR'],
    queryFn: () => partnerApi.active('ASSUREUR'),
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const create = useMutation({
    mutationFn: (payload: InsurancePolicyRequest) => complianceApi.createPolicy(payload),
    onSuccess: () => {
      toast.success(t('policyForm.success'));
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      reset();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    create.mutate({
      policyNumber: values.policyNumber,
      partnerId: Number(values.partnerId),
      coverageType: values.coverageType,
      category: values.category || undefined,
      vehicleRegistration: values.vehicleRegistration || undefined,
      startDate: values.startDate,
      endDate: values.endDate,
      notes: values.notes || undefined,
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('policyForm.title')}
            subtitle={t('policyForm.subtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('policyForm.policyNumber')}</label>
          <input className="input" placeholder="ASS-2026-04471"
                 {...register('policyNumber', { required: t('common.requiredField') })} />
          {errors.policyNumber && <p className="mt-1 text-xs text-red-600">{errors.policyNumber.message}</p>}
        </div>

        <div>
          <label className="label">{t('compliancePage.colInsurer')}</label>
          <select className="input" {...register('partnerId', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {insurers.data?.map((partner) => (
              <option key={partner.id} value={partner.id}>{partner.name}</option>
            ))}
          </select>
          {insurers.data?.length === 0 && (
            <p className="mt-1.5 text-xs text-slate-500">
              {t('policyForm.noInsurers')}
            </p>
          )}
          {errors.partnerId && <p className="mt-1 text-xs text-red-600">{errors.partnerId.message}</p>}
        </div>

        <div>
          <label className="label">{t('policyForm.coverageType')}</label>
          <select className="input" {...register('coverageType', { required: true })}>
            {COVERAGE_TYPES.map((value) => (
              <option key={value} value={value}>{t(`status.coverageType.${value}`)}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('policyForm.category')}</label>
            <select className="input" {...register('category')}>
              <option value="">{t('vehicleForm.notProvided')}</option>
              {BODY_TYPES.map((value) => (
                <option key={value} value={value}>{t(`vehicle.bodyType.${value}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('carteGriseForm.genre')}</label>
            <input className="input" placeholder="LT-236-AA" {...register('vehicleRegistration')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('policyForm.startDate')}</label>
            <input type="date" className="input" {...register('startDate', { required: t('common.requiredField') })} />
          </div>
          <div>
            <label className="label">{t('policyForm.endDate')}</label>
            <input type="date" className="input" {...register('endDate', { required: t('common.requiredField') })} />
          </div>
        </div>

        <div>
          <label className="label">{t('carteGriseForm.notes')}</label>
          <textarea className="input min-h-16 resize-none" {...register('notes')} />
        </div>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <ShieldCheck size={16} />
          {t('policyForm.createSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
