import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Repeat } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi, driverApi, missionAutomationApi, quartierApi, serviceTypeApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import type { CreateMissionAutomationRequest } from '@/types/api';

/** Villes ou l'entreprise a une implantation active. */
const AUTOMATION_CITY_NAMES = ['Douala', 'Yaoundé', 'Bafoussam'];

interface FormValues {
  label: string;
  cityId: string;
  serviceTypeId: string;
  vehicleId: string;
  driverId: string;
  agencyId: string;
  destinationQuartierId: string;
}

interface CreateMissionAutomationDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Automatise une livraison qui se fait generalement tous les jours
 * dans une meme ville : ville, trajet (site de depart -> point de
 * livraison), camion et chauffeur fixes une fois pour toutes. Une
 * mission est ensuite generee chaque jour a 9h30
 * (MissionAutomationScheduler) — le jour ou elle n'est pas necessaire,
 * il suffit d'annuler la mission du jour comme n'importe quelle autre,
 * sans toucher a l'automatisation elle-meme.
 */
export function CreateMissionAutomationDrawer({ open, onClose }: CreateMissionAutomationDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: open });
  const automationCities = (cities.data ?? []).filter((c) => AUTOMATION_CITY_NAMES.includes(c.name));
  const serviceTypes = useQuery({ queryKey: ['service-types'], queryFn: serviceTypeApi.list, enabled: open });
  // Le voyage hors ville n'a pas sa place ici : une automatisation ne porte qu'une seule
  // ville (cityId), incompatible avec un trajet a deux villes distinctes.
  const localServiceTypes = (serviceTypes.data ?? []).filter((s) => s.code !== 'VOYAGE_HORS_VILLE');
  const vehicles = useQuery({ queryKey: ['vehicles', 'list-for-mission'], queryFn: () => vehicleApi.list(0, 100), enabled: open });
  const drivers = useQuery({ queryKey: ['drivers', 'list-for-mission'], queryFn: () => driverApi.list(0, 100), enabled: open });
  const agencies = useQuery({ queryKey: ['admin', 'agencies'], queryFn: adminApi.agencies, enabled: open });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const cityId = watch('cityId');
  const vehicleId = watch('vehicleId');

  const quartiers = useQuery({
    queryKey: ['quartiers', cityId],
    queryFn: () => quartierApi.active(Number(cityId)),
    enabled: Boolean(cityId),
  });

  // Seuls les camions bases dans la ville concernee ont un sens ici — un camion de
  // Douala ne peut pas assurer une livraison quotidienne a Bafoussam.
  const cityVehicles = (vehicles.data?.content ?? []).filter((v) => v.cityId === Number(cityId));

  // Meme confort que le formulaire de mission : le chauffeur attitre du camion se pre-selectionne.
  useEffect(() => {
    if (!vehicleId) return;
    const vehicle = vehicles.data?.content.find((v) => String(v.id) === vehicleId);
    if (vehicle?.driverId) setValue('driverId', String(vehicle.driverId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, vehicles.data]);

  const create = useMutation({
    mutationFn: (payload: CreateMissionAutomationRequest) => missionAutomationApi.create(payload),
    onSuccess: () => {
      toast.success(t('missionAutomationForm.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['mission-automations'] });
      reset();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    create.mutate({
      label: values.label || undefined,
      cityId: Number(values.cityId),
      serviceTypeId: Number(values.serviceTypeId),
      vehicleId: Number(values.vehicleId),
      driverId: Number(values.driverId),
      agencyId: Number(values.agencyId),
      destinationQuartierId: Number(values.destinationQuartierId),
    });
  };

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title={t('missionAutomationForm.title')}
      subtitle={t('missionAutomationForm.subtitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('missionAutomationForm.nameOptional')}</label>
          <input className="input" placeholder={t('missionAutomationForm.namePlaceholder')} {...register('label')} />
        </div>

        <div>
          <label className="label">{t('missionAutomationForm.city')}</label>
          <select
            className="input"
            {...register('cityId', {
              required: t('common.requiredField'),
              onChange: () => setValue('vehicleId', ''),
            })}
          >
            <option value="">{t('common.selectPlaceholder')}</option>
            {automationCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.cityId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.cityId.message}</p>}
        </div>

        <div>
          <label className="label">{t('missionAutomationForm.serviceType')}</label>
          <select className="input" {...register('serviceTypeId', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {localServiceTypes.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          {errors.serviceTypeId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.serviceTypeId.message}</p>}
          <p className="mt-1 text-xs text-slate-400">{t('missionAutomationForm.dailyHint')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('compliancePage.colVehicle')}</label>
            <select
              className="input disabled:opacity-60"
              disabled={!cityId}
              {...register('vehicleId', { required: t('common.requiredField') })}
            >
              <option value="">{cityId ? t('common.selectPlaceholder') : t('missionAutomationForm.chooseCityFirst')}</option>
              {cityVehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}
            </select>
            {errors.vehicleId
              ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehicleId.message}</p>
              : cityId && cityVehicles.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">{t('missionAutomationForm.noVehicleHint')}</p>
              )}
          </div>
          <div>
            <label className="label">{t('driversPage.colDriver')}</label>
            <select className="input" {...register('driverId', { required: t('common.requiredField') })}>
              <option value="">{t('common.selectPlaceholder')}</option>
              {drivers.data?.content.map((d) => <option key={d.id} value={d.id}>{d.fullName}</option>)}
            </select>
            {errors.driverId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.driverId.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">{t('missionAutomationForm.departureSite')}</label>
          <select className="input" {...register('agencyId', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {agencies.data?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {errors.agencyId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.agencyId.message}</p>}
        </div>

        <div>
          <label className="label">{t('missionAutomationForm.deliveryPoint')}</label>
          <select
            className="input disabled:opacity-60"
            disabled={!cityId}
            {...register('destinationQuartierId', { required: t('common.requiredField') })}
          >
            <option value="">{cityId ? t('common.selectPlaceholder') : t('missionAutomationForm.chooseCityFirst')}</option>
            {quartiers.data?.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
          {errors.destinationQuartierId
            ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.destinationQuartierId.message}</p>
            : cityId && !quartiers.isLoading && quartiers.data?.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                {t('missionAutomationForm.noQuartierHint')}
              </p>
            )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <Repeat size={16} />
          {t('missionAutomationForm.submit')}
        </button>
      </form>
    </Drawer>
  );
}
