import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, MapPinned, Route, Save, Truck } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi, driverApi, fuelApi, geocodingApi, missionApi, quartierApi, serviceTypeApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { formatConsumption, formatKm, formatLiters, formatNumber } from '@/lib/utils';
import { MissionRouteMap, type RoutePoint } from './MissionRouteMap';
import { SiteMapField } from './SiteMapField';
import type { City, CreateMissionRequest, MissionDetail } from '@/types/api';

/** Premier candidat avec des coordonnees connues — site plus precis qu'une ville, quartier plus precis qu'une ville. */
function firstWithCoords(
  ...candidates: ({ name: string; latitude: number | null; longitude: number | null } | undefined)[]
): RoutePoint | null {
  for (const c of candidates) {
    if (c && c.latitude != null && c.longitude != null) {
      return { lat: c.latitude, lng: c.longitude, label: c.name };
    }
  }
  return null;
}

interface FormValues {
  serviceTypeId: string;
  vehicleId: string;
  driverId: string;
  agencyId: string;
  destinationAgencyId: string;
  originCityId: string;
  destinationCityId: string;
  originQuartierId: string;
  destinationQuartierId: string;
  cargoDescription: string;
  cargoWeightKg: string;
  missionFeeCost: string;
}

interface EditMissionDrawerProps {
  open: boolean;
  onClose: () => void;
  mission: MissionDetail;
}

const RELIABLE_SOURCES = new Set(['CORRIDOR_REFERENCE', 'ROUTING_API']);

/** Seul type de prestation qui traverse plusieurs villes — les 3 autres sont des mouvements dans une meme ville. */
const VOYAGE_HORS_VILLE_CODE = 'VOYAGE_HORS_VILLE';

/** Villes ou l'entreprise a une implantation active — un mouvement en ville se fait dans l'une d'elles. */
/** Regions desservies par un voyage hors ville, dans l'ordre d'affichage de la liste. */
const VOYAGE_REGIONS = ['Ouest', 'Littoral', 'Centre', 'Nord-Ouest', 'Sud-Ouest', 'Sud', 'Est'];

const normalizeName = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const ACTIVE_CITY_NAMES = ['Douala', 'Yaoundé', 'Bafoussam'];

/** Modification d'une mission — memes champs que la creation, pre-remplis. */
export function EditMissionDrawer({ open, onClose, mission }: EditMissionDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const serviceTypes = useQuery({ queryKey: ['service-types'], queryFn: serviceTypeApi.list, enabled: open });
  const vehicles = useQuery({ queryKey: ['vehicles', 'list-for-mission'], queryFn: () => vehicleApi.list(0, 100), enabled: open });
  const drivers = useQuery({ queryKey: ['drivers', 'list-for-mission'], queryFn: () => driverApi.list(0, 100), enabled: open });
  const agencies = useQuery({ queryKey: ['admin', 'agencies'], queryFn: adminApi.agencies, enabled: open });
  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: open });
  const tankLevels = useQuery({ queryKey: ['fuel', 'tank-levels'], queryFn: () => fuelApi.tankLevels(), enabled: open });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    // Les champs ville/site n'affichent que le groupe pertinent au type choisi (voir isVoyageHorsVille) :
    // sans shouldUnregister, le groupe cache garderait ses regles de validation et bloquerait l'envoi.
    shouldUnregister: true,
  });
  // Quelle ville un clic sur la carte renseigne — bascule automatiquement vers "destination"
  // une fois le depart choisi, sans empecher de revenir en arriere manuellement.
  const [mapTarget, setMapTarget] = useState<'origin' | 'destination'>('origin');

  const selectedServiceTypeId = watch('serviceTypeId');
  const selectedServiceType = serviceTypes.data?.find((s) => String(s.id) === selectedServiceTypeId);
  const isVoyageHorsVille = selectedServiceType?.code === VOYAGE_HORS_VILLE_CODE;
  const voyageServiceType = serviceTypes.data?.find((s) => s.code === VOYAGE_HORS_VILLE_CODE);

  const originCityId = watch('originCityId');
  const destinationCityId = watch('destinationCityId');
  const originQuartierId = watch('originQuartierId');
  const destinationQuartierId = watch('destinationQuartierId');
  const agencyId = watch('agencyId');
  const destinationAgencyId = watch('destinationAgencyId');
  const vehicleId = watch('vehicleId');
  const cargoWeightKg = watch('cargoWeightKg');

  const localCities = (cities.data ?? []).filter((c) => ACTIVE_CITY_NAMES.includes(c.name));

  // Voyage hors ville : la destination se choisit par le seul nom de la ville, regroupee par
  // region (Ouest, Littoral, Centre, Nord-Ouest, Sud-Ouest, Sud, Est).
  const citiesByRegion: [string, City[]][] = VOYAGE_REGIONS
    .map((region): [string, City[]] => [region, (cities.data ?? []).filter((c) => c.region === region)])
    .filter(([, list]) => list.length > 0);
  const voyageCities = citiesByRegion.flatMap(([, list]) => list);

  // Le camion doit etre base dans la ville de depart. Le camion deja affecte a la
  // mission reste toujours propose (meme hors de cette ville) pour ne jamais faire
  // disparaitre la valeur en cours d'edition.
  const vehiclesForCity = (vehicles.data?.content ?? []).filter(
    (v) => !originCityId || String(v.cityId) === originCityId || v.id === mission.vehicleId,
  );

  // Pour un mouvement dans la meme ville, depart et arrivee partagent la seule ville du
  // trajet (originCityId, reutilise) — les deux requetes ci-dessous partagent alors la
  // meme cle et le meme cache, un seul appel reseau au lieu de deux.
  const destinationQuartierCityId = isVoyageHorsVille ? destinationCityId : originCityId;

  // Quartiers/marches de la ville de depart — affinage optionnel de l'origine, utile
  // quand l'entreprise n'a pas de site dans cette ville (ex. un marche a Yaounde).
  const originQuartiers = useQuery({
    queryKey: ['quartiers', originCityId],
    queryFn: () => quartierApi.active(Number(originCityId)),
    enabled: Boolean(originCityId),
  });

  // Quartiers/marches de la ville d'arrivee — affinage optionnel de la destination.
  const destinationQuartiers = useQuery({
    queryKey: ['quartiers', destinationQuartierCityId],
    queryFn: () => quartierApi.active(Number(destinationQuartierCityId)),
    enabled: Boolean(destinationQuartierCityId),
  });

  // Tous les quartiers du referentiel (Centre, Littoral, Ouest...) : affiches ensemble sur la carte,
  // pour pouvoir en choisir un sans avoir d'abord selectionne sa ville.
  const allQuartiers = useQuery({ queryKey: ['quartiers', 'all'], queryFn: () => quartierApi.active(), enabled: open });

  // Chaque camion a un chauffeur attitre (affectation standing) : si on choisit un AUTRE
  // camion que celui d'origine, le pre-selectionner evite une double saisie — sans toucher
  // au chauffeur d'origine de la mission au simple chargement du formulaire.
  useEffect(() => {
    if (!open || !vehicleId || vehicleId === mission.vehicleId.toString()) return;
    const vehicle = vehicles.data?.content.find((v) => String(v.id) === vehicleId);
    if (vehicle?.driverId) {
      setValue('driverId', String(vehicle.driverId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId, vehicles.data]);

  const hasEnoughForEstimate = Boolean((originCityId && destinationCityId) || (agencyId && destinationAgencyId));

  // Points affiches sur la carte — memes priorites que le backend (quartier avant site avant ville).
  const originAgencyObj = agencies.data?.find((a) => String(a.id) === agencyId);
  const destAgencyObj = agencies.data?.find((a) => String(a.id) === destinationAgencyId);
  const originCityObj = cities.data?.find((c) => String(c.id) === originCityId);
  const destCityObj = cities.data?.find((c) => String(c.id) === destinationQuartierCityId);
  const originQuartierObj = (allQuartiers.data ?? originQuartiers.data)?.find((q) => String(q.id) === originQuartierId);
  const destQuartierObj = (allQuartiers.data ?? destinationQuartiers.data)?.find((q) => String(q.id) === destinationQuartierId);

  const originPoint = firstWithCoords(originQuartierObj, originAgencyObj, originCityObj);
  const destinationPoint = firstWithCoords(destQuartierObj, destAgencyObj, destCityObj);

  /** Un clic sur une ville de la carte la pose cote depart ou destination. */
  const pickCity = (cityId: number, target: 'origin' | 'destination') => {
    const city = cities.data?.find((c) => c.id === cityId);
    if (!city) return;
    if (target === 'origin') {
      setValue('originCityId', String(cityId), { shouldValidate: true });
      setValue('originQuartierId', '');
      if (!destinationCityId) setMapTarget('destination');
    } else {
      setValue('destinationCityId', String(cityId), { shouldValidate: true });
      setValue('destinationQuartierId', '');
    }
  };

  const pickQuartier = (quartierId: number, target: 'origin' | 'destination') => {
    // La ville suit le quartier choisi (absent de la liste tout juste apres une creation a la volee :
    // la ville a alors deja ete posee par l'appelant).
    const quartier = allQuartiers.data?.find((q) => q.id === quartierId);
    if (quartier) {
      const cityValue = String(quartier.cityId);
      if (isVoyageHorsVille) {
        setValue(target === 'origin' ? 'originCityId' : 'destinationCityId', cityValue, { shouldValidate: true });
      } else if (target === 'destination' && originCityId && originCityId !== cityValue) {
        toast.error(t('missionForm.sameCityRequired'));
        return;
      } else {
        setValue('originCityId', cityValue, { shouldValidate: true });
      }
    }
    if (target === 'origin') {
      setValue('originQuartierId', String(quartierId), { shouldValidate: true });
      setValue('agencyId', '');
    } else {
      setValue('destinationQuartierId', String(quartierId), { shouldValidate: true });
      setValue('destinationAgencyId', '');
    }
  };

  /** Un clic sur un site (depot, siege...) le pose comme agence de depart ou d'arrivee. */
  const pickSite = (siteId: number, target: 'origin' | 'destination') => {
    // Mouvement dans une meme ville : la ville du site clique devient la ville du trajet,
    // pour que les listes deroulantes (filtrees par ville) restent coherentes avec la carte.
    if (!isVoyageHorsVille) {
      const site = agencies.data?.find((a) => a.id === siteId);
      if (site) setValue('originCityId', String(site.cityId), { shouldValidate: true });
    }
    if (target === 'origin') {
      setValue('agencyId', String(siteId), { shouldValidate: true });
      setValue('originQuartierId', '');
      if (!destinationAgencyId) setMapTarget('destination');
    } else {
      setValue('destinationAgencyId', String(siteId), { shouldValidate: true });
      setValue('destinationQuartierId', '');
    }
  };

  /**
   * Clic sur un endroit de la carte sans marqueur — geocodage inverse pour retrouver
   * le lieu (meme etiquette que celle affichee sur les tuiles OpenStreetMap). Toute
   * zone nommee que le geocodage reconnait doit etre selectionnable directement :
   * si la ville ou le quartier ne sont pas encore dans le referentiel, on les cree
   * a la volee avec les coordonnees du geocodage inverse, plutot que de renvoyer
   * vers un formulaire separe — referentiel ouvert, comme cote backend.
   */
  const handleMapClick = async (lat: number, lng: number) => {
    const result = await geocodingApi.reverse(lat, lng);
    if (!result) {
      toast.error(t('missionForm.noKnownPlace'));
      return;
    }

    let city = cities.data?.find((c) => c.name.toLowerCase() === result.cityName.toLowerCase());
    if (!city) {
      try {
        city = await adminApi.createCity({
          name: result.cityName,
          coordinates: `${result.latitude}, ${result.longitude}`,
        });
        queryClient.invalidateQueries({ queryKey: ['admin', 'cities'] });
      } catch (e) {
        toast.error(errorMessage(e));
        return;
      }
    }

    if (isVoyageHorsVille) {
      pickCity(city.id, mapTarget);
    } else {
      setValue('originCityId', String(city.id), { shouldValidate: true });
    }

    if (result.placeName.toLowerCase() === result.cityName.toLowerCase()) {
      toast.success(t('missionForm.citySelected', { name: city.name }));
      return;
    }

    const cityQuartiers = await quartierApi.active(city.id);
    const matched = cityQuartiers.find((q) => q.name.toLowerCase() === result.placeName.toLowerCase());
    if (matched) {
      pickQuartier(matched.id, mapTarget);
      toast.success(t('missionForm.cityQuartierSelected', { city: city.name, quartier: matched.name }));
      return;
    }

    try {
      const created = await quartierApi.create({
        name: result.placeName,
        cityId: city.id,
        coordinates: `${result.latitude}, ${result.longitude}`,
      });
      queryClient.invalidateQueries({ queryKey: ['quartiers'] });
      pickQuartier(created.id, mapTarget);
      toast.success(t('missionForm.cityQuartierAdded', { city: city.name, quartier: created.name }));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const estimate = useQuery({
    queryKey: ['missions', 'estimate', originCityId, destinationCityId, agencyId, destinationAgencyId,
      originQuartierId, destinationQuartierId, vehicleId, cargoWeightKg],
    queryFn: () => missionApi.estimate({
      originCityId: originCityId ? Number(originCityId) : undefined,
      destinationCityId: destinationCityId ? Number(destinationCityId) : undefined,
      originAgencyId: agencyId ? Number(agencyId) : undefined,
      destinationAgencyId: destinationAgencyId ? Number(destinationAgencyId) : undefined,
      originQuartierId: originQuartierId ? Number(originQuartierId) : undefined,
      destinationQuartierId: destinationQuartierId ? Number(destinationQuartierId) : undefined,
      vehicleId: vehicleId ? Number(vehicleId) : undefined,
      cargoWeightKg: cargoWeightKg ? Number(cargoWeightKg) : undefined,
    }),
    enabled: hasEnoughForEstimate,
  });

  /**
   * Voyage hors ville : un clic sur la carte ne cree rien, il designe seulement la ville connue
   * (parmi les regions desservies) la plus proche, retrouvee par geocodage inverse.
   */
  const handleVoyageMapClick = async (lat: number, lng: number) => {
    const result = await geocodingApi.reverse(lat, lng);
    const city = result
      ? voyageCities.find((c) => normalizeName(c.name) === normalizeName(result.cityName))
      : undefined;
    if (!city) {
      toast.error(t('missionForm.unknownCityPickFromList'));
      return;
    }
    pickCity(city.id, mapTarget);
    toast.success(t('missionForm.citySelected', { name: city.name }));
  };

  const vehicleTankLevel = tankLevels.data?.find((t) => String(t.vehicleId) === vehicleId);
  // Aller-retour : le camion parcourt la distance estimee dans les deux sens.
  // Un simple signal, jamais bloquant.
  const roundTripFuelNeeded = estimate.data?.estimatedFuelLiters != null
    ? estimate.data.estimatedFuelLiters * 2
    : null;
  const insufficientFuel = Boolean(
    vehicleTankLevel
    && vehicleTankLevel.source !== 'INDISPONIBLE'
    && vehicleTankLevel.estimatedFuelLiters != null
    && roundTripFuelNeeded != null
    && vehicleTankLevel.estimatedFuelLiters < roundTripFuelNeeded,
  );

  // Attend que les agences soient chargees avant de peupler le formulaire : le site de depart
  // deja enregistre (agencyId) sert a deriver sa ville (originCityId) dans le MEME reset — les
  // deux valeurs arrivent donc ensemble des le premier rendu, si bien que la liste de sites
  // filtree par ville affiche deja la bonne <option> au lieu de paraitre vide.
  useEffect(() => {
    if (!open || !agencies.data) return;
    const departureSite = mission.agencyId != null
      ? agencies.data.find((a) => a.id === mission.agencyId)
      : undefined;
    reset({
      serviceTypeId: mission.serviceTypeId.toString(),
      vehicleId: mission.vehicleId.toString(),
      driverId: mission.driverId.toString(),
      agencyId: mission.agencyId?.toString() ?? '',
      destinationAgencyId: mission.destinationAgencyId?.toString() ?? '',
      originCityId: departureSite ? String(departureSite.cityId) : '',
      destinationCityId: '',
      originQuartierId: '',
      destinationQuartierId: '',
      cargoDescription: mission.cargoDescription ?? '',
      cargoWeightKg: mission.cargoWeightKg?.toString() ?? '',
      missionFeeCost: mission.missionFeeCost?.toString() ?? '',
    });
    setMapTarget('origin');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mission.id, agencies.data]);

  const update = useMutation({
    mutationFn: (payload: CreateMissionRequest) => missionApi.update(mission.id, payload),
    onSuccess: (updated) => {
      toast.success(t('missionForm.editSuccess', { number: updated.missionNumber }));
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    update.mutate({
      serviceTypeId: Number(values.serviceTypeId),
      vehicleId: Number(values.vehicleId),
      driverId: Number(values.driverId),
      agencyId: values.agencyId ? Number(values.agencyId) : undefined,
      destinationAgencyId: values.destinationAgencyId ? Number(values.destinationAgencyId) : undefined,
      originCityId: values.originCityId ? Number(values.originCityId) : undefined,
      destinationCityId: values.destinationCityId ? Number(values.destinationCityId) : undefined,
      originQuartierId: values.originQuartierId ? Number(values.originQuartierId) : undefined,
      destinationQuartierId: values.destinationQuartierId ? Number(values.destinationQuartierId) : undefined,
      // Dates reelles fixees au demarrage / a la cloture : on conserve les valeurs existantes.
      plannedStart: mission.plannedStart ?? undefined,
      plannedArrival: mission.plannedArrival ?? undefined,
      cargoDescription: values.cargoDescription || undefined,
      cargoWeightKg: values.cargoWeightKg ? Number(values.cargoWeightKg) : undefined,
      missionFeeCost: values.missionFeeCost ? Number(values.missionFeeCost) : undefined,
    });
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Drawer wide open={open} onClose={handleClose} title={t('missionForm.editTitle')} subtitle={mission.missionNumber}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <label className="label mb-0">{t('missionAutomationForm.serviceType')}</label>
            {voyageServiceType && (
              <button
                type="button"
                onClick={() => setValue('serviceTypeId', String(voyageServiceType.id), { shouldValidate: true })}
                className={`btn-ghost py-1 text-xs ${isVoyageHorsVille ? 'bg-accent/10 text-accent' : ''}`}
              >
                <Truck size={13} />
                {t('bestDrivers.usage.VOYAGE')}
              </button>
            )}
          </div>
          <select className="input" {...register('serviceTypeId', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {serviceTypes.data?.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          {errors.serviceTypeId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.serviceTypeId.message}</p>}
        </div>


        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('compliancePage.colVehicle')}</label>
            <select className="input" {...register('vehicleId', { required: t('common.requiredField') })}>
              <option value="">{t('common.selectPlaceholder')}</option>
              {vehiclesForCity.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber}</option>
              ))}
            </select>
            {errors.vehicleId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.vehicleId.message}</p>}
          </div>
          <div>
            <label className="label">{t('driversPage.colDriver')}</label>
            <select className="input" {...register('driverId', { required: t('common.requiredField') })}>
              <option value="">{t('common.selectPlaceholder')}</option>
              {drivers.data?.content.map((d) => (
                <option key={d.id} value={d.id}>{d.fullName}</option>
              ))}
            </select>
            {errors.driverId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.driverId.message}</p>}
          </div>
        </div>

        {isVoyageHorsVille ? (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('missionForm.mapHintInterCity')}
                </p>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setMapTarget('origin')}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${mapTarget === 'origin' ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}
                  >
                    {t('deliveryTimeline.departure')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapTarget('destination')}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${mapTarget === 'destination' ? 'bg-white text-red-600 shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}
                  >
                    {t('missionForm.destination')}
                  </button>
                </div>
              </div>
              <MissionRouteMap
                origin={originPoint}
                destination={destinationPoint}
                routeGeometry={estimate.data?.routeGeometry}
                pickableCities={voyageCities}
                onPickCity={(cityId) => pickCity(cityId, mapTarget)}
                onMapClick={handleVoyageMapClick}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t('missionForm.originCity')}</label>
                <select
                  className="input"
                  {...register('originCityId', {
                    required: t('missionForm.requiredForTrip'),
                    onChange: () => {
                      setValue('vehicleId', '');
                      if (!destinationCityId) setMapTarget('destination');
                    },
                  })}
                >
                  <option value="">{t('common.selectPlaceholder')}</option>
                  {citiesByRegion.map(([region, list]) => (
                    <optgroup key={region} label={region}>
                      {list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                {errors.originCityId
                  ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.originCityId.message}</p>
                  : <p className="mt-1 text-xs text-slate-400">{t('missionForm.currentValue', { value: mission.departureLabel ?? '—' })}</p>}
              </div>
              <div>
                <label className="label">{t('missionForm.destinationCity')}</label>
                <select className="input" {...register('destinationCityId', { required: t('missionForm.requiredForTrip') })}>
                  <option value="">{t('common.selectPlaceholder')}</option>
                  {citiesByRegion.map(([region, list]) => (
                    <optgroup key={region} label={region}>
                      {list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                {errors.destinationCityId
                  ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.destinationCityId.message}</p>
                  : <p className="mt-1 text-xs text-slate-400">{t('missionForm.currentValue', { value: mission.destinationLabel ?? '—' })}</p>}
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('missionForm.mapHintLocal')}
                </p>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setMapTarget('origin')}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${mapTarget === 'origin' ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}
                  >
                    {t('deliveryTimeline.departure')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapTarget('destination')}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${mapTarget === 'destination' ? 'bg-white text-red-600 shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}
                  >
                    {t('missionForm.destination')}
                  </button>
                </div>
              </div>
              <MissionRouteMap
                origin={originPoint}
                destination={destinationPoint}
                routeGeometry={estimate.data?.routeGeometry}
                pickableCities={localCities}
                onPickCity={(cityId) => setValue('originCityId', String(cityId), { shouldValidate: true })}
                pickableQuartiers={allQuartiers.data ?? []}
                onPickQuartier={(quartierId) => pickQuartier(quartierId, mapTarget)}
                pickableSites={agencies.data ?? []}
                onPickSite={(siteId) => pickSite(siteId, mapTarget)}
                onMapClick={handleMapClick}
              />
            </div>

            <div>
              <label className="label">{t('missionAutomationForm.city')}</label>
              <select
                className="input"
                {...register('originCityId', {
                  required: t('missionForm.requiredForLocal'),
                  onChange: () => {
                    setValue('agencyId', '');
                    setValue('destinationAgencyId', '');
                    setValue('originQuartierId', '');
                    setValue('destinationQuartierId', '');
                    setValue('vehicleId', '');
                  },
                })}
              >
                <option value="">{t('common.selectPlaceholder')}</option>
                {localCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.originCityId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.originCityId.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SiteMapField
                label={t('missionAutomationForm.departureSite')}
                siteName={originAgencyObj?.name ?? originQuartierObj?.name}
                active={mapTarget === 'origin'}
                onActivate={() => setMapTarget('origin')}
                onClear={() => { setValue('agencyId', ''); setValue('originQuartierId', '', { shouldValidate: true }); }}
                error={errors.agencyId?.message}
              />
              <input type="hidden" {...register('agencyId', { validate: (_v, f) => Boolean(f.agencyId || f.originQuartierId) || t('missionForm.requiredForLocal') })} />
              <input type="hidden" {...register('originQuartierId')} />
              <SiteMapField
                label={t('missionDetail.arrivalSite')}
                siteName={destAgencyObj?.name ?? destQuartierObj?.name}
                active={mapTarget === 'destination'}
                onActivate={() => setMapTarget('destination')}
                onClear={() => { setValue('destinationAgencyId', ''); setValue('destinationQuartierId', '', { shouldValidate: true }); }}
                error={errors.destinationAgencyId?.message}
              />
              <input type="hidden" {...register('destinationAgencyId', { validate: (_v, f) => Boolean(f.destinationAgencyId || f.destinationQuartierId) || t('missionForm.requiredForLocal') })} />
              <input type="hidden" {...register('destinationQuartierId')} />
            </div>
          </>
        )}

        {hasEnoughForEstimate && (
          <div className="rounded-lg border border-surface-border bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            {estimate.isLoading ? (
              <p className="text-xs text-slate-400">{t('missionForm.estimating')}</p>
            ) : !estimate.data || estimate.data.source === 'INDISPONIBLE' ? (
              <p className="flex items-center gap-2 text-xs text-slate-400">
                <MapPinned size={14} />
                {t('missionForm.distanceNotEstimable')}
              </p>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Route size={14} className="text-accent" />
                    {t('missionForm.estimatedDistance')}
                  </span>
                  <span className="font-semibold tabular text-slate-900 dark:text-slate-100">
                    {formatKm(estimate.data.distanceKm)}
                  </span>
                </div>
                {estimate.data.estimatedFuelLiters != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{t('missionForm.estimatedFuel')}</span>
                    <span className="font-semibold tabular text-slate-900 dark:text-slate-100">
                      {formatConsumption(estimate.data.distanceKm
                        ? (estimate.data.estimatedFuelLiters / estimate.data.distanceKm) * 100
                        : null)} · {formatLiters(estimate.data.estimatedFuelLiters)}
                    </span>
                  </div>
                )}
                <p className={`text-[11px] ${RELIABLE_SOURCES.has(estimate.data.source) ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {t(`status.estimateSource.${estimate.data.source}`)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Signal, jamais bloquant : le dispatcheur reste libre de valider et de prevoir un ravitaillement en route. */}
        {insufficientFuel && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>
              {t('missionForm.insufficientFuelWarning', {
                available: formatNumber(vehicleTankLevel!.estimatedFuelLiters!, 2),
                needed: formatNumber(roundTripFuelNeeded!, 2),
              })}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('missionForm.cargoOptional')}</label>
            <input className="input" placeholder={t('missionForm.cargoPlaceholder')} {...register('cargoDescription')} />
          </div>
          <div>
            <label className="label">{t('missionForm.cargoWeightOptional')}</label>
            <input
              type="number"
              min="0"
              step="1"
              className="input"
              placeholder={t('missionForm.cargoWeightPlaceholder')}
              {...register('cargoWeightKg')}
            />
            <p className="mt-1 text-xs text-slate-400">{t('missionForm.cargoWeightHint')}</p>
          </div>
        </div>

        {isVoyageHorsVille && (
          <div>
            <label className="label">{t('missionForm.missionFeeOptional')}</label>
            <input type="number" min="0" className="input" placeholder={t('missionForm.missionFeePlaceholder')} {...register('missionFeeCost')} />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('missionForm.missionFeeHint')}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || update.isPending} className="btn-primary w-full">
          {(isSubmitting || update.isPending) && <Spinner className="text-white" />}
          <Save size={16} />
          {t('claimForm.editSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
