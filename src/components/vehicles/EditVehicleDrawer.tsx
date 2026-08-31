import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { BODY_TYPES } from '@/lib/bodyTypeLabels';
import { USAGE_TYPES, WEEKLY_WASH_COST_OPTIONS } from '@/lib/usageTypeLabels';
import type { BodyType, CreateVehicleRequest, UsageType, VehicleDetail } from '@/types/api';

interface FormValues {
  registrationNumber: string;
  vinNumber: string;
  brand: string;
  model: string;
  bodyType: BodyType;
  capacityTons: string;
  capacityUnit: 'T' | 'KG';
  tankCapacityLiters: string;
  cityId: string;
  deviceId: string;
  currentKilometers: string;
  usageType: UsageType;
  weeklyWashCost: string;
}

/** Villes ou l'entreprise a une implantation active. */
const VEHICLE_CITY_NAMES = ['Douala', 'Yaoundé', 'Bafoussam'];

interface EditVehicleDrawerProps {
  open: boolean;
  onClose: () => void;
  vehicle: VehicleDetail;
}

/**
 * Modification d'un camion — memes champs que la creation, pre-remplis.
 * L'immatriculation reste en lecture seule : le backend la considere
 * immuable apres creation (RG-4.1) et refuse toute requete qui tente
 * de la changer, quel que soit le delai de modification.
 */
export function EditVehicleDrawer({ open, onClose, vehicle }: EditVehicleDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: open });
  const cityOptions = (cities.data ?? []).filter((c) => VEHICLE_CITY_NAMES.includes(c.name));

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>();
  const usageType = watch('usageType');
  const capacityUnit = watch('capacityUnit');

  useEffect(() => {
    if (open) {
      reset({
        registrationNumber: vehicle.registrationNumber,
        vinNumber: vehicle.vinNumber ?? '',
        brand: vehicle.brand,
        model: vehicle.model,
        bodyType: vehicle.bodyType,
        capacityTons: vehicle.capacityTons?.toString() ?? '',
        capacityUnit: 'T',
        tankCapacityLiters: vehicle.tankCapacityLiters?.toString() ?? '',
        cityId: vehicle.cityId?.toString() ?? '',
        deviceId: vehicle.deviceId ?? '',
        currentKilometers: vehicle.currentKilometers?.toString() ?? '',
        usageType: vehicle.usageType,
        weeklyWashCost: vehicle.weeklyWashCost?.toString() ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicle.id]);

  const update = useMutation({
    mutationFn: (payload: CreateVehicleRequest) => vehicleApi.update(vehicle.id, payload),
    onSuccess: (updated) => {
      toast.success(t('vehicleForm.editSuccess', { registration: updated.registrationNumber }));
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    update.mutate({
      registrationNumber: values.registrationNumber,
      vinNumber: values.vinNumber || undefined,
      brand: values.brand,
      model: values.model,
      bodyType: values.bodyType,
      capacityTons: values.capacityTons
        ? (values.capacityUnit === 'KG' ? Number(values.capacityTons) / 1000 : Number(values.capacityTons))
        : undefined,
      tankCapacityLiters: values.tankCapacityLiters ? Number(values.tankCapacityLiters) : undefined,
      cityId: values.cityId ? Number(values.cityId) : undefined,
      deviceId: values.deviceId || undefined,
      currentKilometers: values.currentKilometers ? Number(values.currentKilometers) : undefined,
      usageType: values.usageType,
      weeklyWashCost: values.usageType === 'TOUR_VILLE' && values.weeklyWashCost
        ? Number(values.weeklyWashCost) : undefined,
    });
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('vehicleForm.editTitle')} subtitle={vehicle.registrationNumber}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('vehicleForm.registration')}</label>
          <input className="input bg-slate-50 text-slate-500 dark:bg-slate-800/50" disabled {...register('registrationNumber')} />
          <p className="mt-1 text-xs text-slate-400">{t('vehicleForm.registrationLocked')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('vehicleForm.brand')}</label>
            <input className="input" placeholder="Mercedes" {...register('brand', { required: t('common.requiredField') })} />
            {errors.brand && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.brand.message}</p>}
          </div>
          <div>
            <label className="label">{t('vehicleForm.model')}</label>
            <input className="input" placeholder="Actros 1845" {...register('model', { required: t('common.requiredField') })} />
            {errors.model && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.model.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">{t('vehicleForm.bodyType')}</label>
          <select className="input" {...register('bodyType', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {BODY_TYPES.map((value) => (
              <option key={value} value={value}>{t(`vehicle.bodyType.${value}`)}</option>
            ))}
          </select>
          {errors.bodyType && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.bodyType.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('vehicleForm.loadCapacity')}</label>
            <div className="flex gap-2">
              <input
                type="number"
                step={capacityUnit === 'KG' ? 1 : 0.1}
                className="input flex-1"
                {...register('capacityTons')}
              />
              <select className="input w-24 shrink-0" {...register('capacityUnit')}>
                <option value="T">{t('vehicleForm.tons')}</option>
                <option value="KG">{t('vehicleForm.kg')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">{t('vehicleForm.tankCapacity')}</label>
            <input type="number" className="input" {...register('tankCapacityLiters')} />
          </div>
        </div>

        <div>
          <label className="label">{t('vehicleForm.vin')}</label>
          <input className="input" placeholder={t('vehicleForm.vinPlaceholder')} {...register('vinNumber')} />
        </div>

        <div>
          <label className="label">{t('vehicleForm.cityOptional')}</label>
          <select className="input" {...register('cityId')}>
            <option value="">{t('vehicleForm.notProvided')}</option>
            {cityOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('vehicleForm.deviceId')}</label>
            <input className="input" placeholder={t('vehicleForm.deviceIdPlaceholder')} {...register('deviceId')} />
          </div>
          <div>
            <label className="label">{t('vehicleForm.currentKm')}</label>
            <input type="number" className="input" {...register('currentKilometers')} />
          </div>
        </div>

        <div className="rounded-lg border border-surface-border p-3 dark:border-slate-700">
          <label className="label">{t('vehicleForm.usage')}</label>
          <select className="input" {...register('usageType', { required: t('common.requiredField') })}>
            {USAGE_TYPES.map((value) => (
              <option key={value} value={value}>{t(`vehicle.usageType.${value}`)}</option>
            ))}
          </select>
          {usageType === 'TOUR_VILLE' && (
            <div className="mt-3">
              <label className="label">{t('vehicleForm.weeklyWashCost')}</label>
              <select className="input" {...register('weeklyWashCost', { required: t('vehicleForm.weeklyWashRequired') })}>
                <option value="">{t('common.selectPlaceholder')}</option>
                {WEEKLY_WASH_COST_OPTIONS.map((price) => (
                  <option key={price} value={price}>{price.toLocaleString('fr-FR')} FCFA</option>
                ))}
              </select>
              {errors.weeklyWashCost && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.weeklyWashCost.message}</p>}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('vehicleForm.weeklyWashHint')}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || update.isPending} className="btn-primary w-full">
          {(isSubmitting || update.isPending) && <Spinner className="text-white" />}
          <Save size={16} />
          {t('maintenanceForm.editSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
