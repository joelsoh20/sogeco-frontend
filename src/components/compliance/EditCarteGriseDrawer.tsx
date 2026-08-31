import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { complianceApi } from '@/api/compliance';
import { toast } from '@/store/toastStore';
import { vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { BODY_TYPES } from '@/lib/bodyTypeLabels';
import type { BodyType } from '@/types/api';
import type { CarteGrise, CarteGriseRequest } from '@/types/compliance';

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

interface EditCarteGriseDrawerProps {
  open: boolean;
  onClose: () => void;
  carte: CarteGrise;
}

export function EditCarteGriseDrawer({ open, onClose, carte }: EditCarteGriseDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({ queryKey: ['vehicles', 'list-for-carte-grise'], queryFn: () => vehicleApi.list(0, 100), enabled: open });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({
        vehicleId: carte.vehicleId.toString(),
        registrationNumber: carte.registrationNumber,
        chassisNumber: carte.chassisNumber,
        brand: carte.brand,
        genre: carte.genre ?? '',
        bodyType: carte.bodyType ?? '',
        seatCount: carte.seatCount != null ? String(carte.seatCount) : '',
        firstCirculationDate: carte.firstCirculationDate ?? '',
        issueDate: carte.issueDate,
        expiryDate: carte.expiryDate,
        cost: carte.cost != null ? String(carte.cost) : '',
        notes: carte.notes ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, carte.id]);

  const update = useMutation({
    mutationFn: (payload: CarteGriseRequest) => complianceApi.updateCarteGrise(carte.id, payload),
    onSuccess: () => {
      toast.success(t('carteGriseForm.editSuccess'));
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    update.mutate({
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
    <Drawer open={open} onClose={onClose} title={t('carteGriseForm.editTitle')} subtitle={carte.registrationNumber}>
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

        <button type="submit" disabled={isSubmitting || update.isPending} className="btn-primary w-full">
          {(isSubmitting || update.isPending) && <Spinner className="text-white" />}
          <Save size={16} />
          {t('common.save')}
        </button>
      </form>
    </Drawer>
  );
}
