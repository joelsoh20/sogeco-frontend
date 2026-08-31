import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi, clientApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import type { CreateClientRequest } from '@/types/api';

/** Villes ou l'entreprise a une implantation active. */
const CLIENT_CITY_NAMES = ['Douala', 'Yaoundé', 'Bafoussam'];

interface FormValues {
  companyName: string;
  contactName: string;
  address: string;
  allCities: boolean;
  cityId: string;
  notes: string;
}

interface CreateClientDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Creation d'un client (donneur d'ordre). POST /clients existait deja
 * cote backend (ClientController.create) mais rien dans l'interface ne
 * l'appelait — le seul acces aux clients etait la liste deroulante en
 * lecture seule du formulaire de mission.
 */
export function CreateClientDrawer({ open, onClose }: CreateClientDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: open });
  const clientCities = (cities.data ?? []).filter((c) => CLIENT_CITY_NAMES.includes(c.name));

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { allCities: true },
  });
  const allCities = watch('allCities');

  const create = useMutation({
    mutationFn: (payload: CreateClientRequest) => clientApi.create(payload),
    onSuccess: (client) => {
      toast.success(t('clientForm.createSuccess', { name: client.companyName }));
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      reset();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    create.mutate({
      companyName: values.companyName,
      contactName: values.contactName || undefined,
      address: values.address || undefined,
      cityId: values.allCities || !values.cityId ? undefined : Number(values.cityId),
      notes: values.notes || undefined,
    });
  };

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('clientForm.createTitle')} subtitle={t('clientForm.createSubtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('clientForm.companyName')}</label>
          <input className="input" placeholder="SOCPALM SA" {...register('companyName', { required: t('common.requiredField') })} />
          {errors.companyName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.companyName.message}</p>}
        </div>

        <div>
          <label className="label">{t('clientForm.contactOptional')}</label>
          <input className="input" {...register('contactName')} />
        </div>

        <div>
          <label className="label">{t('clientForm.addressOptional')}</label>
          <input className="input" {...register('address')} />
        </div>

        <div>
          <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" className="rounded" {...register('allCities')} />
            {t('clientForm.allCities')}
          </label>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('clientForm.allCitiesHint')}
          </p>
          {!allCities && (
            <select className="input mt-2" {...register('cityId', { required: t('clientForm.cityRequired') })}>
              <option value="">{t('common.selectPlaceholder')}</option>
              {clientCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {errors.cityId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.cityId.message}</p>}
        </div>

        <div>
          <label className="label">{t('carteGriseForm.notes')}</label>
          <textarea className="input min-h-16 resize-none" {...register('notes')} />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || create.isPending} className="btn-primary w-full">
          {(isSubmitting || create.isPending) && <Spinner className="text-white" />}
          <Building2 size={16} />
          {t('clientForm.createSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
