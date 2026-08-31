import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, Plus } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi, geocodingApi, quartierApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { CAMEROON_REGIONS } from '@/lib/cameroonRegions';
import { MissionRouteMap, type RoutePoint } from '@/components/missions/MissionRouteMap';
import type { City } from '@/types/api';

const NEW_CITY_VALUE = '__new__';

interface FormValues {
  cityId: string;
  newCityName: string;
  newCityRegion: string;
  newCityCoordinates: string;
  quartierName: string;
  quartierCoordinates: string;
}

interface CreatePositionDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * "Nouveau point de livraison" — fusion de "Nouvelle ville" et "Nouveau quartier"
 * en un seul formulaire : on choisit une ville existante (la liste de ses quartiers
 * s'affiche alors en dessous) ou on en cree une, puis on peut au passage
 * ajouter un nouveau quartier pour cette ville. Un seul point d'entree pour
 * construire le referentiel villes/quartiers au fil des missions.
 */
export function CreatePositionDrawer({ open, onClose }: CreatePositionDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: open });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { cityId: NEW_CITY_VALUE },
  });

  useEffect(() => {
    if (open) {
      reset({ cityId: NEW_CITY_VALUE });
      setError(null);
    }
  }, [open, reset]);

  const cityId = watch('cityId');
  const isNewCity = cityId === NEW_CITY_VALUE;
  const selectedCity: City | undefined = cities.data?.find((c) => String(c.id) === cityId);

  const existingQuartiers = useQuery({
    queryKey: ['quartiers', cityId],
    queryFn: () => quartierApi.active(Number(cityId)),
    enabled: !isNewCity && Boolean(cityId),
  });

  const mapPoint: RoutePoint | null = selectedCity?.latitude != null
    ? { lat: selectedCity.latitude, lng: selectedCity.longitude!, label: selectedCity.name }
    : null;

  // Point precis du nouveau quartier en cours de saisie — affiche un marqueur des que
  // les coordonnees sont renseignees (clic sur un lieu OSM precis via geocodage inverse,
  // ou saisie manuelle), pour confirmer visuellement l'emplacement avant l'enregistrement.
  const quartierName = watch('quartierName');
  const quartierCoordinatesRaw = watch('quartierCoordinates');
  const pendingQuartierPoint: RoutePoint | null = (() => {
    const parts = quartierCoordinatesRaw?.split(',').map((s) => Number(s.trim()));
    if (!parts || parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
    return { lat: parts[0], lng: parts[1], label: quartierName?.trim() || t('positionForm.newQuartierLabel') };
  })();

  const pickCity = (id: number) => {
    setValue('cityId', String(id), { shouldValidate: true });
  };

  /** Clic sur un quartier déjà enregistré — pré-remplit son nom et ses coordonnées dans le champ. */
  const pickQuartier = (id: number) => {
    const quartier = existingQuartiers.data?.find((q) => q.id === id);
    if (!quartier) return;
    setValue('quartierName', quartier.name, { shouldValidate: true });
    if (quartier.latitude != null && quartier.longitude != null) {
      setValue('quartierCoordinates', `${quartier.latitude}, ${quartier.longitude}`);
    }
    toast.info(t('positionForm.quartierAlreadyRegistered', { name: quartier.name }));
  };

  /**
   * Clic sur un endroit de la carte sans marqueur — geocodage inverse. Contrairement
   * aux autres formulaires, celui-ci gere la creation : une ville inconnue pre-remplit
   * "Nouvelle ville", un quartier inconnu pre-remplit le champ d'ajout de quartier.
   */
  const handleMapClick = async (lat: number, lng: number) => {
    const result = await geocodingApi.reverse(lat, lng);
    if (!result) {
      toast.error(t('missionForm.noKnownPlace'));
      return;
    }

    const city = cities.data?.find((c) => c.name.toLowerCase() === result.cityName.toLowerCase());
    const cityName = city?.name ?? result.cityName;
    const quartierName = result.placeName.toLowerCase() !== result.cityName.toLowerCase() ? result.placeName : '';

    if (city) {
      setValue('cityId', String(city.id), { shouldValidate: true });
    } else {
      setValue('cityId', NEW_CITY_VALUE);
      setValue('newCityName', result.cityName);
      toast.info(t('positionForm.cityNotInReferential', { name: result.cityName }));
    }

    setValue('quartierName', quartierName);
    if (quartierName) {
      setValue('quartierCoordinates', `${result.latitude}, ${result.longitude}`);
    }

    if (city) {
      toast.success(quartierName ? t('positionForm.cityQuartierPrefilled', { city: cityName, quartier: quartierName }) : t('missionForm.citySelected', { name: cityName }));
    }
  };

  const create = useMutation({
    mutationFn: async (values: FormValues) => {
      let resolvedCityId: number;
      let cityLabel: string;

      if (values.cityId === NEW_CITY_VALUE) {
        const city = await adminApi.createCity({
          name: values.newCityName,
          region: values.newCityRegion || undefined,
          coordinates: values.newCityCoordinates || undefined,
        });
        resolvedCityId = city.id;
        cityLabel = city.name;
      } else {
        resolvedCityId = Number(values.cityId);
        cityLabel = selectedCity?.name ?? '';
      }

      const trimmedQuartierName = values.quartierName.trim();
      // Deja dans le referentiel (ex. clic sur un quartier existant sur la carte) : rien a
      // creer, ce n'est pas une erreur — la position est deja utilisable comme lieu de livraison.
      const alreadyExists = trimmedQuartierName
        ? existingQuartiers.data?.some((q) => q.name.toLowerCase() === trimmedQuartierName.toLowerCase())
        : false;

      if (trimmedQuartierName && !alreadyExists) {
        await quartierApi.create({
          name: trimmedQuartierName,
          cityId: resolvedCityId,
          coordinates: values.quartierCoordinates || undefined,
        });
      }

      return { cityLabel, quartierName: trimmedQuartierName, alreadyExists };
    },
    onSuccess: ({ cityLabel, quartierName, alreadyExists }) => {
      toast.success(
        alreadyExists
          ? t('positionForm.alreadyRegistered', { city: cityLabel, quartier: quartierName })
          : quartierName ? t('positionForm.quartierAdded', { quartier: quartierName, city: cityLabel }) : t('positionForm.cityCreated', { city: cityLabel }),
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'cities'] });
      queryClient.invalidateQueries({ queryKey: ['quartiers'] });
      reset({ cityId: NEW_CITY_VALUE });
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
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('positionForm.title')} subtitle={t('positionForm.subtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            {t('positionForm.mapHint')}
          </p>
          <MissionRouteMap
            origin={mapPoint}
            destination={pendingQuartierPoint}
            pickableCities={cities.data ?? []}
            onPickCity={pickCity}
            pickableQuartiers={!isNewCity && cityId ? (existingQuartiers.data ?? []) : []}
            onPickQuartier={pickQuartier}
            onMapClick={handleMapClick}
          />
        </div>

        <div>
          <label className="label">{t('missionAutomationForm.city')}</label>
          <select className="input" {...register('cityId')}>
            <option value={NEW_CITY_VALUE}>{t('positionForm.newCityOption')}</option>
            {cities.data?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.region ? ` (${c.region})` : ''}</option>)}
          </select>
        </div>

        {isNewCity && (
          <>
            <div>
              <label className="label">{t('positionForm.name')}</label>
              <input className="input" placeholder="Douala" {...register('newCityName', { required: t('common.requiredField') })} />
              {errors.newCityName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.newCityName.message}</p>}
            </div>

            <div>
              <label className="label">{t('positionForm.regionOptional')}</label>
              <select className="input" {...register('newCityRegion')}>
                <option value="">{t('common.selectPlaceholder')}</option>
                {CAMEROON_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="label">{t('positionForm.cityCoordinatesOptional')}</label>
              <input className="input" placeholder="4.0511, 9.7679" {...register('newCityCoordinates')} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('positionForm.pastedFromGoogleMaps')}</p>
            </div>
          </>
        )}

        {!isNewCity && cityId && (
          <div className="border-t border-surface-border pt-4 dark:border-slate-700">
            <label className="label">{t('positionForm.alreadyRegisteredQuartier')}</label>
            <select
              className="input"
              value=""
              onChange={(e) => {
                if (e.target.value) pickQuartier(Number(e.target.value));
              }}
            >
              <option value="">
                {existingQuartiers.isLoading
                  ? t('common.loading')
                  : existingQuartiers.data?.length ? t('common.selectPlaceholder') : t('positionForm.noQuartierForCity')}
              </option>
              {existingQuartiers.data?.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('positionForm.pickQuartierHint')}
            </p>
          </div>
        )}

        <div className={!isNewCity && cityId ? undefined : 'border-t border-surface-border pt-4 dark:border-slate-700'}>
          <label className="label flex items-center gap-1.5">
            <Plus size={13} />
            {t('positionForm.addNewQuartierOptional')}
          </label>
          <input className="input" placeholder="Bonapriso" {...register('quartierName')} />
          <input
            className="input mt-2"
            placeholder={t('positionForm.quartierCoordinatesPlaceholder')}
            {...register('quartierCoordinates')}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('positionForm.autoGeolocatedHint')}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <MapPin size={16} />
          {t('common.save')}
        </button>
      </form>
    </Drawer>
  );
}
