import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi, partnerApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import type { Partner } from '@/api/endpoints';

interface FormValues {
  name: string;
  phone: string;
  email: string;
  cityId: string;
  notes: string;
}

interface CreateInsurerDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** Seules les villes ou l'entreprise a une implantation active sont proposees. */
const INSURER_CITY_NAMES = ['Douala', 'Yaoundé', 'Bafoussam'];

/**
 * Nouvelle societe d'assurance (Partner, partnerType=ASSUREUR) — jusqu'ici
 * le backend acceptait deja la creation de partenaires (POST /partners),
 * mais rien dans l'interface ne l'appelait pour les assureurs : le seul
 * acces etait la liste deroulante en lecture seule du formulaire de police.
 */
export function CreateInsurerDrawer({ open, onClose }: CreateInsurerDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: open });
  const cityOptions = (cities.data ?? []).filter((c) => INSURER_CITY_NAMES.includes(c.name));

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const create = useMutation({
    mutationFn: (payload: Partial<Partner>) => partnerApi.create(payload),
    onSuccess: (insurer) => {
      toast.success(t('insurerForm.createSuccess', { name: insurer.name }));
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      reset();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    create.mutate({
      name: values.name,
      partnerType: 'ASSUREUR',
      phone: values.phone || undefined,
      email: values.email || undefined,
      cityId: values.cityId ? Number(values.cityId) : undefined,
      notes: values.notes || undefined,
    });
  };

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('insurerForm.title')} subtitle={t('insurerForm.subtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('insurerForm.name')}</label>
          <input className="input" placeholder="Chanas Assurances" {...register('name', { required: t('common.requiredField') })} />
          {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label">{t('insurerForm.emailOptional')}</label>
          <input type="email" className="input" {...register('email')} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('driverForm.phoneOptional')}</label>
            <input className="input" {...register('phone')} />
          </div>
          <div>
            <label className="label">{t('driverForm.cityOptional')}</label>
            <select className="input" {...register('cityId')}>
              <option value="">{t('driverForm.cityUnspecified')}</option>
              {cityOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
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
          <ShieldCheck size={16} />
          {t('insurerForm.createSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
