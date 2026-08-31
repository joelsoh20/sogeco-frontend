import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { IdCard } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { complianceApi } from '@/api/compliance';
import { toast } from '@/store/toastStore';
import { vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { BODY_TYPES } from '@/lib/bodyTypeLabels';
import type { BodyType } from '@/types/api';
import type { CarteGriseRequest } from '@/types/compliance';

interface FormValues {
  vehicleId: string;
  registrationNumber: string;
  chassisNumber: string;
  brand: string;
  genre: string;
  bodyType: BodyType | '';
  seatCount: string;
  firstCirculationDate: string;
  issueDate: string;
  expiryDate: string;
  cost: string;
  notes: string;
}

/** Perime 10 ans apres la delivrance (compliance.carte_grise_validity_years) — laisser vide calcule la date automatiquement. */
export function CreateCarteGriseDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({
    queryKey: ['vehicles', 'list-for-carte-grise'],
    queryFn: () => vehicleApi.list(0, 100),
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const create = useMutation({
    mutationFn: (payload: CarteGriseRequest) => complianceApi.createCarteGrise(payload),
    onSuccess: () => {
      toast.success(t('carteGriseForm.success'));
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
      registrationNumber: values.registrationNumber,
      chassisNumber: values.chassisNumber,
      brand: values.brand,
      genre: values.genre || undefined,
      bodyType: values.bodyType || undefined,
      seatCount: values.seatCount ? Number(values.seatCount) : undefined,
      firstCirculationDate: values.firstCirculationDate || undefined,
      issueDate: values.issueDate,
      expiryDate: values.expiryDate || undefined,
      cost: values.cost ? Number(values.cost) : undefined,
      notes: values.notes || undefined,
    });
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('carteGriseForm.title')} subtitle={t('carteGriseForm.subtitle')}>
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
            <label className="label">{t('carteGriseForm.registrationNumber')}</label>
            <input className="input" placeholder="LT-236-AA" {...register('registrationNumber', { required: t('common.requiredField') })} />
            {errors.registrationNumber && <p className="mt-1 text-xs text-red-600">{errors.registrationNumber.message}</p>}
          </div>
          <div>
            <label className="label">{t('carteGriseForm.chassisNumber')}</label>
            <input className="input" {...register('chassisNumber', { required: t('common.requiredField') })} />
            {errors.chassisNumber && <p className="mt-1 text-xs text-red-600">{errors.chassisNumber.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('vehicleForm.brand')}</label>
            <input className="input" placeholder="Mercedes" {...register('brand', { required: t('common.requiredField') })} />
            {errors.brand && <p className="mt-1 text-xs text-red-600">{errors.brand.message}</p>}
          </div>
          <div>
            <label className="label">{t('carteGriseForm.genre')}</label>
            <input className="input" placeholder="PL" {...register('genre')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('carteGriseForm.bodyTypeOptional')}</label>
            <select className="input" {...register('bodyType')}>
              <option value="">{t('vehicleForm.notProvided')}</option>
              {BODY_TYPES.map((value) => (
                <option key={value} value={value}>{t(`vehicle.bodyType.${value}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('carteGriseForm.seatCount')}</label>
            <input type="number" className="input" {...register('seatCount')} />
          </div>
        </div>

        <div>
          <label className="label">{t('carteGriseForm.firstCirculationDate')}</label>
          <input type="date" className="input" {...register('firstCirculationDate')} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('carteGriseForm.issueDate')}</label>
            <input type="date" className="input" {...register('issueDate', { required: t('common.requiredField') })} />
            {errors.issueDate && <p className="mt-1 text-xs text-red-600">{errors.issueDate.message}</p>}
          </div>
          <div>
            <label className="label">{t('carteGriseForm.expiryDate')}</label>
            <input type="date" className="input" {...register('expiryDate')} />
            <p className="mt-1 text-xs text-slate-500">{t('carteGriseForm.expiryDateHint')}</p>
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

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <IdCard size={16} />
          {t('common.save')}
        </button>
      </form>
    </Drawer>
  );
}
