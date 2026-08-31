import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi, geocodingApi, quartierApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { MissionRouteMap, type RoutePoint } from '@/components/missions/MissionRouteMap';
import type { CreateAgencyRequest } from '@/types/api';

const NEW_QUARTIER_VALUE = '__new__';

const SITE_TYPES: CreateAgencyRequest['siteType'][] = ['SIEGE', 'AGENCE', 'DEPOT'];

interface FormValues {
  cityId: string;
  quartierId: string;
  newQuartierName: string;
  newQuartierCoordinates: string;
  siteType: CreateAgencyRequest['siteType'] | '';
  address: string;
  phone: string;
  coordinates: string;
}

interface CreateAgencyDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Creation d'un site (siege, agence ou depot). Ville ET quartier sont
 * obligatoires — c'est la localisation la plus fine disponible qui
 * permet d'affiner le calcul des distances de mission a partir de ce
 * site (voir MissionService.resolveCoordinates, source SITE_COORDINATES).
 */
export function CreateAgencyDrawer({ open, onClose }: CreateAgencyDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: open });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset();
      setError(null);
    }
  }, [open, reset]);

  const cityId = watch('cityId');
  const quartierId = watch('quartierId');
  const isNewQuartier = quartierId === NEW_QUARTIER_VALUE;

  const quartiers = useQuery({
    queryKey: ['quartiers', cityId],
    queryFn: () => quartierApi.active(Number(cityId)),
    enabled: Boolean(cityId),
  });

  const selectedCity = cities.data?.find((c) => String(c.id) === cityId);
  const selectedQuartier = isNewQuartier ? undefined : quartiers.data?.find((q) => String(q.id) === quartierId);
  const mapPoint: RoutePoint | null = selectedQuartier?.latitude != null
    ? { lat: selectedQuartier.latitude, lng: selectedQuartier.longitude!, label: selectedQuartier.name }
    : selectedCity?.latitude != null
      ? { lat: selectedCity.latitude, lng: selectedCity.longitude!, label: selectedCity.name }
      : null;

  const pickCity = (id: number) => {
    setValue('cityId', String(id), { shouldValidate: true });
    setValue('quartierId', '');
  };

  const pickQuartier = (id: number) => {
    setValue('quartierId', String(id), { shouldValidate: true });
  };

  /**
   * Clic sur un endroit de la carte sans marqueur — geocodage inverse. La ville doit
   * deja exister (pas de creation de ville ici, seulement de quartier) ; a defaut de
   * quartier correspondant, on pre-remplit "Nouveau quartier" avec le nom et les
   * coordonnees trouves plutot que de forcer une re-saisie.
   */
  const handleMapClick = async (lat: number, lng: number) => {
    const result = await geocodingApi.reverse(lat, lng);
    if (!result) {
      toast.error(t('missionForm.noKnownPlace'));
      return;
    }

    const city = cities.data?.find((c) => c.name.toLowerCase() === result.cityName.toLowerCase());
    if (!city) {
      toast.info(t('agencyForm.cityNotInReferential', { name: result.cityName }));
      return;
    }

    setValue('cityId', String(city.id), { shouldValidate: true });

    const cityQuartiers = await quartierApi.active(city.id);
    const matched = cityQuartiers.find((q) => q.name.toLowerCase() === result.placeName.toLowerCase());
    if (matched) {
      setValue('quartierId', String(matched.id), { shouldValidate: true });
      toast.success(t('missionForm.cityQuartierSelected', { city: city.name, quartier: matched.name }));
    } else if (result.placeName.toLowerCase() !== result.cityName.toLowerCase()) {
      setValue('quartierId', NEW_QUARTIER_VALUE, { shouldValidate: true });
      setValue('newQuartierName', result.placeName);
      setValue('newQuartierCoordinates', `${result.latitude}, ${result.longitude}`);
      toast.info(t('agencyForm.cityPrefilledAsNewQuartier', { city: city.name, quartier: result.placeName }));
    } else {
      setValue('quartierId', '');
      toast.success(t('missionForm.citySelected', { name: city.name }));
    }
  };

  const create = useMutation({
    mutationFn: async (values: FormValues) => {
      let resolvedQuartierId: number;

      if (values.quartierId === NEW_QUARTIER_VALUE) {
        const quartier = await quartierApi.create({
          name: values.newQuartierName,
          cityId: Number(values.cityId),
          coordinates: values.newQuartierCoordinates || undefined,
        });
        resolvedQuartierId = quartier.id;
      } else {
        resolvedQuartierId = Number(values.quartierId);
      }

      return adminApi.createAgency({
        cityId: Number(values.cityId),
        quartierId: resolvedQuartierId,
        siteType: values.siteType as CreateAgencyRequest['siteType'],
        address: values.address || undefined,
        phone: values.phone || undefined,
        coordinates: values.coordinates || undefined,
      });
    },
    onSuccess: (agency) => {
      toast.success(t('agencyForm.createSuccess', { name: agency.name }));
      queryClient.invalidateQueries({ queryKey: ['admin', 'agencies'] });
      queryClient.invalidateQueries({ queryKey: ['quartiers'] });
      reset();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    create.mutate(values);
  };

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('agencyForm.title')} subtitle={t('agencyForm.subtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            {t('agencyForm.mapHint')}
          </p>
          <MissionRouteMap
            origin={mapPoint}
            destination={null}
            pickableCities={cities.data ?? []}
            onPickCity={pickCity}
            pickableQuartiers={cityId ? (quartiers.data ?? []) : []}
            onPickQuartier={pickQuartier}
            onMapClick={handleMapClick}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('missionAutomationForm.city')}</label>
            <select
              className="input"
              {...register('cityId', {
                required: t('common.requiredField'),
                onChange: () => setValue('quartierId', ''),
              })}
            >
              <option value="">{t('common.selectPlaceholder')}</option>
              {cities.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.cityId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.cityId.message}</p>}
          </div>
          <div>
            <label className="label">{t('agencyForm.siteType')}</label>
            <select className="input" {...register('siteType', { required: t('common.requiredField') })}>
              <option value="">{t('common.selectPlaceholder')}</option>
              {SITE_TYPES.map((value) => (
                <option key={value} value={value}>{t(`status.siteType.${value}`)}</option>
              ))}
            </select>
            {errors.siteType && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.siteType.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">{t('agencyForm.quartier')}</label>
          <select
            className="input disabled:opacity-60"
            disabled={!cityId}
            {...register('quartierId', { required: t('agencyForm.quartierRequired') })}
          >
            <option value="">{cityId ? t('common.selectPlaceholder') : t('missionAutomationForm.chooseCityFirst')}</option>
            {quartiers.data?.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
            {cityId && <option value={NEW_QUARTIER_VALUE}>{t('agencyForm.newQuartierOption')}</option>}
          </select>
          {errors.quartierId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.quartierId.message}</p>}
        </div>

        {isNewQuartier && (
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-surface-border p-3 dark:border-slate-700 sm:grid-cols-2">
            <div>
              <label className="label">{t('agencyForm.quartierName')}</label>
              <input className="input" placeholder="Bonapriso" {...register('newQuartierName', { required: t('common.requiredField') })} />
              {errors.newQuartierName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.newQuartierName.message}</p>}
            </div>
            <div>
              <label className="label">{t('agencyForm.coordinatesOptional')}</label>
              <input className="input" placeholder="4.0289, 9.7000" {...register('newQuartierCoordinates')} />
            </div>
          </div>
        )}

        <div>
          <label className="label">{t('clientForm.addressOptional')}</label>
          <input className="input" {...register('address')} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('driverForm.phoneOptional')}</label>
            <input className="input" {...register('phone')} />
          </div>
          <div>
            <label className="label">{t('agencyForm.siteCoordinatesOptional')}</label>
            <input className="input" placeholder="4.0511, 9.7679" {...register('coordinates')} />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <Building2 size={16} />
          {t('agencyForm.createSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
