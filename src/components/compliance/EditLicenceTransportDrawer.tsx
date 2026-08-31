import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { complianceApi } from '@/api/compliance';
import { toast } from '@/store/toastStore';
import { errorMessage } from '@/api/client';
import type { TransportLicense, TransportLicenseRequest } from '@/types/compliance';

interface FormValues {
  reference: string;
  receiptNumber: string;
  power: string;
  issueDate: string;
  expiryDate: string;
  cost: string;
  notes: string;
}

interface EditLicenceTransportDrawerProps {
  open: boolean;
  onClose: () => void;
  license: TransportLicense;
}

/** Pas de sélection de camion : la licence de transport couvre toute la flotte. */
export function EditLicenceTransportDrawer({ open, onClose, license }: EditLicenceTransportDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({
        reference: license.reference,
        receiptNumber: license.receiptNumber ?? '',
        power: license.power ?? '',
        issueDate: license.issueDate,
        expiryDate: license.expiryDate,
        cost: license.cost != null ? String(license.cost) : '',
        notes: license.notes ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, license.id]);

  const update = useMutation({
    mutationFn: (payload: TransportLicenseRequest) => complianceApi.updateTransportLicense(license.id, payload),
    onSuccess: () => {
      toast.success(t('licenceForm.editSuccess'));
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    update.mutate({
      reference: values.reference,
      receiptNumber: values.receiptNumber || undefined,
      power: values.power || undefined,
      issueDate: values.issueDate,
      expiryDate: values.expiryDate,
      cost: values.cost ? Number(values.cost) : undefined,
      notes: values.notes || undefined,
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('licenceForm.editTitle')} subtitle={license.reference}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('licenceForm.reference')}</label>
          <input className="input" placeholder="LT-2026-00045" {...register('reference', { required: t('common.requiredField') })} />
          {errors.reference && <p className="mt-1 text-xs text-red-600">{errors.reference.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('licenceForm.receiptNumberOptional')}</label>
            <input className="input" {...register('receiptNumber')} />
          </div>
          <div>
            <label className="label">{t('licenceForm.powerOptional')}</label>
            <input className="input" placeholder="12 CV" {...register('power')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('carteGriseForm.issueDate')}</label>
            <input type="date" className="input" {...register('issueDate', { required: t('common.requiredField') })} />
            {errors.issueDate && <p className="mt-1 text-xs text-red-600">{errors.issueDate.message}</p>}
          </div>
          <div>
            <label className="label">{t('carteBleueForm.expiryDate')}</label>
            <input type="date" className="input" {...register('expiryDate', { required: t('common.requiredField') })} />
            {errors.expiryDate && <p className="mt-1 text-xs text-red-600">{errors.expiryDate.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">{t('carteBleueForm.cost')}</label>
          <input type="number" className="input" {...register('cost')} />
        </div>

        <div>
          <label className="label">{t('carteGriseForm.notes')}</label>
          <textarea className="input min-h-16 resize-none" {...register('notes')} />
        </div>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={isSubmitting || update.isPending} className="btn-primary w-full">
          {(isSubmitting || update.isPending) && <Spinner className="text-white" />}
          <Save size={16} />
          {t('common.save')}
        </button>
      </form>
    </Drawer>
  );
}
