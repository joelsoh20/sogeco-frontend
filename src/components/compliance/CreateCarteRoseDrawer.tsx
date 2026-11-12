import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Stamp } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { complianceApi } from '@/api/compliance';
import { toast } from '@/store/toastStore';
import { partnerApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { CarteRoseRequest } from '@/types/compliance';

interface FormValues {
  vehicleId: string;
  insurerId: string;
  insuredName: string;
  issuingBureauName: string;
  issuingBureauAddress: string;
  vehicleCategory: string;
  validFrom: string;
  validTo: string;
  notes: string;
}

const DEFAULT_VALUES: Partial<FormValues> = {
  insuredName: 'SOGECO SARL',
  issuingBureauName: 'Bureau Direct Bafoussam',
};

interface CreateCarteRoseDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Camion pre-selectionne — ouverture depuis le panneau des documents manquants. */
  initialVehicleId?: number;
}

/** Perime 1 an apres le debut de validite (compliance.carte_rose_validity_years) — laisser vide calcule la date automatiquement. */
export function CreateCarteRoseDrawer({ open, onClose, initialVehicleId }: CreateCarteRoseDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({
    queryKey: ['vehicles', 'list-for-carte-rose'],
    queryFn: () => vehicleApi.list(0, 100),
    enabled: open,
  });
  const insurers = useQuery({
    queryKey: ['partners', 'ASSUREUR'],
    queryFn: () => partnerApi.active('ASSUREUR'),
    enabled: open,
  });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: DEFAULT_VALUES,
  });
  const vehicleId = watch('vehicleId');
  const selectedVehicle = vehicles.data?.content.find((v) => String(v.id) === vehicleId);

  // Reinitialise a chaque ouverture : ce drawer reste monte en permanence
  // (juste masque), un simple defaultValues ne serait donc pris en compte
  // qu'a la toute premiere ouverture.
  useEffect(() => {
    if (open) {
      reset({ ...DEFAULT_VALUES, vehicleId: initialVehicleId ? String(initialVehicleId) : '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialVehicleId]);

  const create = useMutation({
    mutationFn: (payload: CarteRoseRequest) => complianceApi.createCarteRose(payload),
    onSuccess: () => {
      toast.success(t('carteRoseForm.success'));
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
      reset(DEFAULT_VALUES);
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    create.mutate({
      vehicleId: Number(values.vehicleId),
      insurerId: Number(values.insurerId),
      insuredName: values.insuredName,
      issuingBureauName: values.issuingBureauName,
      issuingBureauAddress: values.issuingBureauAddress || undefined,
      registrationNumber: selectedVehicle?.registrationNumber ?? '',
      vehicleMakeType: selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : '',
      vehicleCategory: values.vehicleCategory,
      validFrom: values.validFrom,
      validTo: values.validTo || undefined,
      notes: values.notes || undefined,
    });
  };

  const handleClose = () => {
    setError(null);
    reset(DEFAULT_VALUES);
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('carteRoseForm.title')} subtitle={t('carteRoseForm.subtitle')}>
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

        <div>
          <label className="label">{t('carteRoseForm.insuredName')}</label>
          <input className="input" {...register('insuredName', { required: t('common.requiredField') })} />
          {errors.insuredName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.insuredName.message}</p>}
        </div>

        <div>
          <label className="label">{t('compliancePage.colInsurer')}</label>
          <select className="input" {...register('insurerId', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {insurers.data?.map((partner) => (
              <option key={partner.id} value={partner.id}>{partner.name}</option>
            ))}
          </select>
          {insurers.data?.length === 0 && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t('policyForm.noInsurers')}</p>
          )}
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
          <label className="label">{t('carteGriseForm.notes')}</label>
          <textarea className="input min-h-16 resize-none" {...register('notes')} />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>
        )}

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <Stamp size={16} />
          {t('common.save')}
        </button>
      </form>
    </Drawer>
  );
}
