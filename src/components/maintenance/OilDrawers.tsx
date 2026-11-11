import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Droplets, Pencil, Plus, Save, X } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi, oilApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { OIL_CITY_NAMES } from '@/lib/oilCities';
import { formatDate, formatLiters, toLocalDateString } from '@/lib/utils';
import type { OilDistributionEntry, OilPurchaseEntry, OilSummary } from '@/types/api';

const err = 'mt-1 text-xs text-red-600 dark:text-red-400';
const SUMMARY_KEY = ['oil', 'summary'];

interface DrawerProps {
  open: boolean;
  onClose: () => void;
}

/** Stock par ville : un gestionnaire a sa ville (imposee par le serveur), l'administrateur choisit. */
function useOilScope() {
  const user = useAuthStore((state) => state.user);
  const canUpdate = useAuthStore((state) => state.hasPermission('MAINTENANCE_UPDATE'));
  return { fixedCityId: user?.cityId ?? null, canUpdate };
}

// ----------------------------------------------------------------------------
// Donner de l'huile a un camion (creation et correction)
// ----------------------------------------------------------------------------

interface DistributionForm {
  vehicleId: string;
  distributionDate: string;
  quantityLiters: string;
  recipientName: string;
  note: string;
}

interface DistributionDrawerProps extends DrawerProps {
  /** Sortie a corriger ; absent = nouvelle sortie. */
  editing?: OilDistributionEntry | null;
}

export function OilDistributionDrawer({ open, onClose, editing }: DistributionDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({ queryKey: ['vehicles', 'for-maintenance'], queryFn: () => vehicleApi.list(0, 200), enabled: open });
  const stock = useQuery({ queryKey: [...SUMMARY_KEY, 'all'], queryFn: () => oilApi.summary(), enabled: open });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<DistributionForm>({
    defaultValues: { distributionDate: toLocalDateString(new Date()) },
  });

  useEffect(() => {
    if (!open) return;
    reset(editing
      ? {
        vehicleId: String(editing.vehicleId),
        distributionDate: editing.date.slice(0, 10),
        quantityLiters: String(editing.quantityLiters),
        recipientName: editing.recipientName ?? '',
        note: editing.note ?? '',
      }
      : { distributionDate: toLocalDateString(new Date()), vehicleId: '', quantityLiters: '', recipientName: '', note: '' });
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  // Stock de la ville du camion choisi.
  const vehicle = vehicles.data?.content.find((v) => String(v.id) === watch('vehicleId'));
  const cityStock = vehicle?.cityId != null ? stock.data?.byCity.find((c) => c.cityId === vehicle.cityId) : undefined;

  const save = useMutation({
    mutationFn: (v: DistributionForm) => {
      const payload = {
        vehicleId: Number(v.vehicleId),
        distributionDate: v.distributionDate,
        quantityLiters: Number(v.quantityLiters),
        recipientName: v.recipientName.trim() || undefined,
        note: v.note.trim() || undefined,
      };
      return editing ? oilApi.updateDistribution(editing.id, payload) : oilApi.distribute(payload);
    },
    onSuccess: (updated) => {
      toast.success(t(editing ? 'oil.distributionUpdated' : 'oil.given', { remaining: formatLiters(updated.remaining) }));
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose}
      title={t(editing ? 'oil.editGiveTitle' : 'oil.giveTitle')} subtitle={t('oil.giveSubtitle')}>
      <form onSubmit={handleSubmit((v) => { setError(null); save.mutate(v); })} className="space-y-4">
        <div>
          <label className="label">{t('compliancePage.colVehicle')}</label>
          <select className="input" {...register('vehicleId', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {vehicles.data?.content.map((v) => (
              <option key={v.id} value={v.id}>{v.registrationNumber} — {v.brand} {v.model}{v.cityName ? ` (${v.cityName})` : ''}</option>
            ))}
          </select>
          {errors.vehicleId && <p className={err}>{errors.vehicleId.message}</p>}
          {vehicle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {cityStock
                ? t('oil.cityStock', { city: cityStock.cityName, quantity: formatLiters(cityStock.remaining) })
                : t('oil.noCityStock', { city: vehicle.cityName ?? '—' })}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('oil.date')}</label>
            <input type="date" max={toLocalDateString(new Date())} className="input" {...register('distributionDate', { required: t('common.requiredField') })} />
            {errors.distributionDate && <p className={err}>{errors.distributionDate.message}</p>}
          </div>
          <div>
            <label className="label">{t('oil.quantity')}</label>
            <input type="number" step="0.01" min="0.01" className="input" {...register('quantityLiters', { required: t('common.requiredField') })} />
            {errors.quantityLiters && <p className={err}>{errors.quantityLiters.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">{t('oil.recipient')}</label>
          <input className="input" placeholder={t('oil.recipientHint')} {...register('recipientName')} />
        </div>

        <div>
          <label className="label">{t('oil.note')}</label>
          <input className="input" {...register('note')} />
        </div>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

        <button type="submit" disabled={isSubmitting || save.isPending} className="btn-primary w-full">
          {(isSubmitting || save.isPending) && <Spinner className="text-white" />}
          {editing ? <Save size={16} /> : <Droplets size={16} />}
          {t(editing ? 'oil.saveChanges' : 'oil.giveSubmit')}
        </button>
      </form>
    </Drawer>
  );
}

// ----------------------------------------------------------------------------
// Suivi d'huile : achats (date + quantite), stock par ville, corrections
// ----------------------------------------------------------------------------

interface PurchaseForm {
  cityId: string;
  purchaseDate: string;
  quantityLiters: string;
  note: string;
}

const emptyPurchase = (cityId = ''): PurchaseForm =>
  ({ cityId, purchaseDate: toLocalDateString(new Date()), quantityLiters: '', note: '' });

export function OilFollowUpDrawer({ open, onClose }: DrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { fixedCityId, canUpdate } = useOilScope();
  const [error, setError] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState<string>('');           // administrateur : '' = toutes les villes
  const [editingPurchase, setEditingPurchase] = useState<OilPurchaseEntry | null>(null);
  const [editingDistribution, setEditingDistribution] = useState<OilDistributionEntry | null>(null);

  const allCities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: open && fixedCityId === null });
  const cities = { data: allCities.data?.filter((c) => OIL_CITY_NAMES.includes(c.name)) };
  const cityParam = fixedCityId === null && filterCity ? Number(filterCity) : undefined;
  const summary = useQuery({
    queryKey: [...SUMMARY_KEY, cityParam ?? 'all'],
    queryFn: () => oilApi.summary(cityParam),
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PurchaseForm>({
    defaultValues: emptyPurchase(),
  });

  // La ville du formulaire suit le filtre de l'administrateur tant qu'on ne corrige pas un achat.
  useEffect(() => {
    if (!editingPurchase) reset(emptyPurchase(filterCity));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCity, open]);

  const startEdit = (p: OilPurchaseEntry) => {
    setEditingPurchase(p);
    setError(null);
    reset({ cityId: String(p.cityId), purchaseDate: p.date.slice(0, 10), quantityLiters: String(p.quantityLiters), note: p.note ?? '' });
  };

  const cancelEdit = () => {
    setEditingPurchase(null);
    setError(null);
    reset(emptyPurchase(filterCity));
  };

  const save = useMutation({
    mutationFn: (v: PurchaseForm) => {
      const payload = {
        purchaseDate: v.purchaseDate,
        quantityLiters: Number(v.quantityLiters),
        note: v.note.trim() || undefined,
        cityId: fixedCityId === null && v.cityId ? Number(v.cityId) : undefined,
      };
      return editingPurchase ? oilApi.updatePurchase(editingPurchase.id, payload) : oilApi.purchase(payload);
    },
    onSuccess: (updated: OilSummary) => {
      toast.success(t(editingPurchase ? 'oil.purchaseUpdated' : 'oil.purchased', { remaining: formatLiters(updated.remaining) }));
      queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
      setEditingPurchase(null);
      reset(emptyPurchase(filterCity));
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const handleClose = () => {
    setError(null);
    setEditingPurchase(null);
    onClose();
  };

  const data = summary.data;
  const cityLabel = fixedCityId !== null ? data?.byCity[0]?.cityName : undefined;

  return (
    <>
      <Drawer open={open} onClose={handleClose} title={t('oil.followUpTitle')}
        subtitle={cityLabel ? t('oil.followUpSubtitleCity', { city: cityLabel }) : t('oil.followUpSubtitle')}>
        <div className="space-y-5">
          {fixedCityId === null && (
            <div>
              <label className="label">{t('oil.city')}</label>
              <select className="input" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
                <option value="">{t('oil.allCities')}</option>
                {cities.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {data && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <Tile label={t('oil.totalPurchased')} value={formatLiters(data.totalPurchased)} />
              <Tile label={t('oil.totalDistributed')} value={formatLiters(data.totalDistributed)} />
              <Tile label={t('oil.stockRemaining')} value={formatLiters(data.remaining)} strong />
            </div>
          )}

          {data && fixedCityId === null && !filterCity && data.byCity.length > 0 && (
            <ul className="divide-y divide-surface-border rounded-lg border border-surface-border text-sm dark:divide-slate-800 dark:border-slate-700">
              {data.byCity.map((c) => (
                <li key={c.cityId} className="flex items-center justify-between px-3 py-1.5">
                  <span>{c.cityName}</span>
                  <span className="tabular font-medium">{formatLiters(c.remaining)}</span>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleSubmit((v) => { setError(null); save.mutate(v); })}
            className={`space-y-3 rounded-lg border p-3 ${editingPurchase ? 'border-accent/50 bg-accent/5' : 'border-surface-border dark:border-slate-700'}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t(editingPurchase ? 'oil.editPurchase' : 'oil.newPurchase')}
              </p>
              {editingPurchase && (
                <button type="button" onClick={cancelEdit} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400">
                  <X size={13} />
                  {t('common.cancel')}
                </button>
              )}
            </div>

            {fixedCityId === null && (
              <div>
                <label className="label">{t('oil.city')}</label>
                <select className="input" {...register('cityId', { required: t('common.requiredField') })}>
                  <option value="">{t('common.selectPlaceholder')}</option>
                  {cities.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.cityId && <p className={err}>{errors.cityId.message}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t('oil.purchaseDate')}</label>
                <input type="date" max={toLocalDateString(new Date())} className="input" {...register('purchaseDate', { required: t('common.requiredField') })} />
                {errors.purchaseDate && <p className={err}>{errors.purchaseDate.message}</p>}
              </div>
              <div>
                <label className="label">{t('oil.quantity')}</label>
                <input type="number" step="0.01" min="0.01" className="input" {...register('quantityLiters', { required: t('common.requiredField') })} />
                {errors.quantityLiters && <p className={err}>{errors.quantityLiters.message}</p>}
              </div>
            </div>
            <div>
              <label className="label">{t('oil.note')}</label>
              <input className="input" placeholder={t('oil.purchaseNoteHint')} {...register('note')} />
            </div>
            {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
            <button type="submit" disabled={isSubmitting || save.isPending} className="btn-primary w-full">
              {(isSubmitting || save.isPending) ? <Spinner className="text-white" /> : editingPurchase ? <Save size={16} /> : <Plus size={16} />}
              {t(editingPurchase ? 'oil.saveChanges' : 'oil.purchaseSubmit')}
            </button>
          </form>

          {data && data.purchases.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('oil.recentPurchases')}</p>
              <ul className="divide-y divide-surface-border text-sm dark:divide-slate-800">
                {data.purchases.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate">
                      {formatDate(p.date)}
                      {fixedCityId === null ? <span className="text-slate-500 dark:text-slate-400"> · {p.cityName}</span> : null}
                      {p.note ? <span className="text-slate-500 dark:text-slate-400"> — {p.note}</span> : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular font-medium">{formatLiters(p.quantityLiters)}</span>
                      {canUpdate && (
                        <button type="button" onClick={() => startEdit(p)} aria-label={t('common.edit')}
                          className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-accent dark:hover:bg-slate-800">
                          <Pencil size={14} />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data && data.distributions.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('oil.recentDistributions')}</p>
              <ul className="divide-y divide-surface-border text-sm dark:divide-slate-800">
                {data.distributions.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate">
                      {formatDate(d.date)} — <span className="font-medium">{d.registrationNumber}</span>
                      {d.recipientName ? <span className="text-slate-500 dark:text-slate-400"> {d.recipientName}</span> : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular font-medium">{formatLiters(d.quantityLiters)}</span>
                      {canUpdate && (
                        <button type="button" onClick={() => setEditingDistribution(d)} aria-label={t('common.edit')}
                          className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-accent dark:hover:bg-slate-800">
                          <Pencil size={14} />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Drawer>

      <OilDistributionDrawer open={editingDistribution !== null} editing={editingDistribution}
        onClose={() => setEditingDistribution(null)} />
    </>
  );
}

function Tile({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
      <p className={`tabular text-sm ${strong ? 'font-bold text-accent' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
