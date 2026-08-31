import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CreditCard } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { complianceApi } from '@/api/compliance';
import { toast } from '@/store/toastStore';
import { vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { CarteBleueRequest } from '@/types/compliance';

interface FormValues {
  vehicleId: string;
  receiptNumber: string;
  category: string;
  issueDate: string;
  expiryDate: string;
  power: string;
  cost: string;
  notes: string;
}

/** Seule valeur connue a ce jour — la liste pourra s'etoffer sans toucher au backend (simple texte). */
const CATEGORY_OPTIONS = ['S6-Marchandise compte propre'];

export function CreateCarteBleueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({
    queryKey: ['vehicles', 'list-for-carte-bleue'],
    queryFn: () => vehicleApi.list(0, 100),
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const create = useMutation({
    mutationFn: (payload: CarteBleueRequest) => complianceApi.createCarteBleue(payload),
    onSuccess: () => {
      toast.success(t('carteBleueForm.success'));
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
      receiptNumber: values.receiptNumber,
      category: values.category || undefined,
      issueDate: values.issueDate,
      expiryDate: values.expiryDate,
      power: values.power ? Number(values.power) : undefined,
      cost: values.cost ? Number(values.cost) : undefined,
      notes: values.notes || undefined,
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('carteBleueForm.title')} subtitle={t('carteBleueForm.subtitle')}>
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
          <label className="label">{t('carteBleueForm.receiptNumber')}</label>
          <input className="input" placeholder="CB-2026-00123" {...register('receiptNumber', { required: t('common.requiredField') })} />
          {errors.receiptNumber && <p className="mt-1 text-xs text-red-600">{errors.receiptNumber.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('carteBleueForm.categoryOptional')}</label>
            <select className="input" {...register('category')}>
              <option value="">{t('carteBleueForm.categoryUnspecified')}</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('carteBleueForm.powerOptional')}</label>
            <input type="number" step="0.1" className="input" {...register('power')} />
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

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <CreditCard size={16} />
          {t('common.save')}
        </button>
      </form>
    </Drawer>
  );
}
