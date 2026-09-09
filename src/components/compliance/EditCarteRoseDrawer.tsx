import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { complianceApi } from '@/api/compliance';
import { toast } from '@/store/toastStore';
import { partnerApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { CarteRose, CarteRoseRequest } from '@/types/compliance';

interface FormValues {
  vehicleId: string;
  insurerId: string;
  insuredName: string;
  insuredAddress: string;
  issuingBureauName: string;
  issuingBureauAddress: string;
  registrationNumber: string;
  vehicleMakeType: string;
  vehicleCategory: string;
  validFrom: string;
  validTo: string;
  cost: string;
  notes: string;
}

interface EditCarteRoseDrawerProps {
  open: boolean;
  onClose: () => void;
  carte: CarteRose;
}

export function EditCarteRoseDrawer({ open, onClose, carte }: EditCarteRoseDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({ queryKey: ['vehicles', 'list-for-carte-rose'], queryFn: () => vehicleApi.list(0, 100), enabled: open });
  const insurers = useQuery({ queryKey: ['partners', 'ASSUREUR'], queryFn: () => partnerApi.active('ASSUREUR'), enabled: open });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({
        vehicleId: carte.vehicleId.toString(),
        insurerId: carte.insurerId.toString(),
        insuredName: carte.insuredName,
        insuredAddress: carte.insuredAddress ?? '',
        issuingBureauName: carte.issuingBureauName,
        issuingBureauAddress: carte.issuingBureauAddress ?? '',
        registrationNumber: carte.registrationNumber,
        vehicleMakeType: carte.vehicleMakeType,
        vehicleCategory: carte.vehicleCategory,
        validFrom: carte.validFrom,
        validTo: carte.validTo,
        cost: carte.cost != null ? String(carte.cost) : '',
        notes: carte.notes ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, carte.id]);

  const update = useMutation({
    mutationFn: (payload: CarteRoseRequest) => complianceApi.updateCarteRose(carte.id, payload),
    onSuccess: () => {
      toast.success(t('carteRoseForm.editSuccess'));
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    update.mutate({
      vehicleId: Number(values.vehicleId),
      insurerId: Number(values.insurerId),
      insuredName: values.insuredName,
      insuredAddress: values.insuredAddress || undefined,
      issuingBureauName: values.issuingBureauName,
      issuingBureauAddress: values.issuingBureauAddress || undefined,
      registrationNumber: values.registrationNumber,
      vehicleMakeType: values.vehicleMakeType,
      vehicleCategory: values.vehicleCategory,
      validFrom: values.validFrom,
      validTo: values.validTo || undefined,
      cost: values.cost ? Number(values.cost) : undefined,
      notes: values.notes || undefined,
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('carteRoseForm.editTitle')} subtitle={carte.registrationNumber}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('compliancePage.colVehicle')}</label>
          <select className="input" {...register('vehicleId', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {vehicles.data?.content.map((v) => (
              <option key={v.id} value={v.id}>{v.registrationNumber}</option>
            ))}
          </select>
          {errors.vehicleId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehicleId.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('carteRoseForm.insuredName')}</label>
            <input className="input" {...register('insuredName', { required: t('common.requiredField') })} />
            {errors.insuredName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.insuredName.message}</p>}
          </div>
          <div>
            <label className="label">{t('carteRoseForm.insuredAddressOptional')}</label>
            <input className="input" {...register('insuredAddress')} />
          </div>
        </div>

        <div>
          <label className="label">{t('compliancePage.colInsurer')}</label>
          <select className="input" {...register('insurerId', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {insurers.data?.map((partner) => (
              <option key={partner.id} value={partner.id}>{partner.name}</option>
            ))}
          </select>
          {errors.insurerId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.insurerId.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('carteRoseForm.issuingBureauName')}</label>
            <input className="input" {...register('issuingBureauName', { required: t('common.requiredField') })} />
            {errors.issuingBureauName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.issuingBureauName.message}</p>}
          </div>
          <div>
            <label className="label">{t('carteRoseForm.issuingBureauAddressOptional')}</label>
            <input className="input" {...register('issuingBureauAddress')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('carteGriseForm.registrationNumber')}</label>
            <input className="input" placeholder="LT-236-AA" {...register('registrationNumber', { required: t('common.requiredField') })} />
            {errors.registrationNumber && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.registrationNumber.message}</p>}
          </div>
          <div>
            <label className="label">{t('carteRoseForm.vehicleMakeType')}</label>
            <input className="input" placeholder="Mercedes Actros 1845" {...register('vehicleMakeType', { required: t('common.requiredField') })} />
            {errors.vehicleMakeType && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehicleMakeType.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">{t('carteRoseForm.vehicleCategory')}</label>
          <input className="input" placeholder="Camion" {...register('vehicleCategory', { required: t('common.requiredField') })} />
          {errors.vehicleCategory && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehicleCategory.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('carteRoseForm.validFrom')}</label>
            <input type="date" className="input" {...register('validFrom', { required: t('common.requiredField') })} />
            {errors.validFrom && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.validFrom.message}</p>}
          </div>
          <div>
            <label className="label">{t('carteRoseForm.validTo')}</label>
            <input type="date" className="input" {...register('validTo')} />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('carteRoseForm.validToHint')}</p>
          </div>
        </div>

        <div>
          <label className="label">{t('carteGriseForm.amount')}</label>
          <input type="number" className="input" {...register('cost')} />
        </div>

        <div>
          <label className="label">{t('carteGriseForm.notes')}</label>
          <textarea className="input min-h-16 resize-none" {...register('notes')} />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>
        )}

        <button type="submit" disabled={isSubmitting || update.isPending} className="btn-primary w-full">
          {(isSubmitting || update.isPending) && <Spinner className="text-white" />}
          <Save size={16} />
          {t('common.save')}
        </button>
      </form>
    </Drawer>
  );
}
