import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Truck } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { USAGE_TYPES, WEEKLY_WASH_COST_OPTIONS } from '@/lib/usageTypeLabels';
import type { BodyType, CreateVehicleRequest, UsageType } from '@/types/api';

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

/** Types de carrosserie proposes a la creation — parc actuel de l'entreprise. */
const CREATE_BODY_TYPES: BodyType[] = [
  'PORTEUR', 'FOURGON', 'UTILITAIRE', 'MOTO', 'TRICYCLE', 'VOITURE_LIVRAISON', 'SEMI_REMORQUE',
];

/** Villes ou l'entreprise a une implantation active. */
const VEHICLE_CITY_NAMES = ['Douala', 'Yaoundé', 'Bafoussam'];

interface CreateVehicleDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Creation d'un camion.
 *
 * Le bouton "Ajouter un camion" existait dans l'ecran depuis la toute
 * premiere livraison du frontend, mais n'avait jamais ete raccorde a
 * un formulaire — un oubli reste inaperçu jusqu'a ce que quelqu'un
 * clique dessus. Ce composant comble ce trou.
 */
export function CreateVehicleDrawer({ open, onClose }: CreateVehicleDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: open });
  const cityOptions = (cities.data ?? []).filter((c) => VEHICLE_CITY_NAMES.includes(c.name));

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { usageType: 'VOYAGE', capacityUnit: 'T' },
  });
  const usageType = watch('usageType');
  const capacityUnit = watch('capacityUnit');

  const create = useMutation({
    mutationFn: (payload: CreateVehicleRequest) => vehicleApi.create(payload),
    onSuccess: (vehicle) => {
      toast.success(t('vehicleForm.createSuccess', { registration: vehicle.registrationNumber }));
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      reset();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    create.mutate({
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
    reset();
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('vehicleForm.createTitle')} subtitle={t('vehicleForm.createSubtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('vehicleForm.registration')}</label>
          <input
            className="input"
            placeholder="LT-236-AA"
            {...register('registrationNumber', { required: t('common.requiredField') })}
          />
          {errors.registrationNumber && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.registrationNumber.message}</p>
          )}
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
            {CREATE_BODY_TYPES.map((value) => (
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

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <Truck size={16} />
          {t('vehicleForm.createSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
