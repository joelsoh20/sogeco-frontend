import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Copy, KeyRound, UserPlus } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi, driverApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import type { CreateDriverRequest, DriverCreationResult } from '@/types/driver-performance';

interface FormValues {
  matricule: string;
  firstName: string;
  lastName: string;
  phone: string;
  hireDate: string;
  jobTitle: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  cityId: string;
  userId: string;
  grantAccess: boolean;
  accountEmail: string;
}

/** Villes ou l'entreprise a une implantation active. */
const DRIVER_CITY_NAMES = ['Douala', 'Yaoundé', 'Bafoussam'];

interface CreateDriverDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Creation d'une fiche chauffeur (table drivers), distincte du compte
 * de connexion cree via CreateUserDrawer. Les deux existaient deja
 * chacun de leur cote — matricule, permis, embauche — cote backend
 * (DriverController), mais rien ne les reliait encore dans l'interface.
 *
 * Le lien avec un compte applicatif existant (userId) est optionnel :
 * un chauffeur peut avoir une fiche sans jamais se connecter a l'app.
 */
export function CreateDriverDrawer({ open, onClose }: CreateDriverDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DriverCreationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: open });
  const cityOptions = (cities.data ?? []).filter((c) => DRIVER_CITY_NAMES.includes(c.name));
  const users = useQuery({
    queryKey: ['admin', 'users', 'for-driver-link'], queryFn: () => adminApi.users(0, 200),
    enabled: open, retry: false,
  });
  const chauffeurUsers = (users.data?.content ?? []).filter((u) => u.roles.includes('ROLE_CHAUFFEUR'));

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>();
  const userId = watch('userId');
  const grantAccess = watch('grantAccess');

  const create = useMutation({
    mutationFn: (payload: CreateDriverRequest) => driverApi.create(payload),
    onSuccess: (created) => {
      toast.success(t('driverForm.createSuccess', { name: created.driver.fullName }));
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      if (created.temporaryPassword) {
        setResult(created);
      } else {
        reset();
        onClose();
      }
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    create.mutate({
      matricule: values.matricule,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone || undefined,
      hireDate: values.hireDate,
      jobTitle: values.jobTitle || undefined,
      licenseNumber: values.licenseNumber || undefined,
      licenseCategory: values.licenseCategory || undefined,
      licenseExpiryDate: values.licenseExpiryDate || undefined,
      cityId: values.cityId ? Number(values.cityId) : undefined,
      userId: values.userId ? Number(values.userId) : undefined,
      // Present (meme vide) declenche la creation du compte ; absent, aucun compte n'est cree.
      accountEmail: values.userId || !values.grantAccess ? undefined : (values.accountEmail || ''),
    });
  };

  const handleClose = () => {
    setError(null);
    setResult(null);
    setCopied(false);
    reset();
    onClose();
  };

  const copyPassword = () => {
    if (result?.temporaryPassword) {
      navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
    }
  };

  // Ecran de confirmation : affiche apres creation reussie d'un nouveau
  // compte de connexion, tant que le mot de passe genere n'a pas ete
  // explicitement note.
  if (result) {
    return (
      <Drawer open={open} onClose={handleClose} title={t('driverForm.createdTitle')}>
        <div className="space-y-5">
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="font-medium">{result.driver.fullName}</span> {t('driverForm.createdWithAccount')}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
              <KeyRound size={16} />
              {t('settingsPage.temporaryPassword')}
            </div>
            <p className="mt-1.5 text-xs text-amber-800">
              {t('driverForm.temporaryPasswordHint')}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-sm tracking-wide text-slate-800 ring-1 ring-amber-200">
                {result.temporaryPassword}
              </code>
              <button
                onClick={copyPassword}
                className={`btn-ghost ${copied ? 'border-emerald-300 text-emerald-700' : ''}`}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? t('settingsPage.copied') : t('settingsPage.copy')}
              </button>
            </div>
            <p className="mt-2 text-xs text-amber-700">
              {t('driverForm.passwordRemainsValid')}
            </p>
          </div>

          <button
            onClick={handleClose}
            disabled={!copied}
            className="btn-primary w-full"
          >
            {!copied ? t('settingsPage.copyToContinue') : t('settingsPage.done')}
          </button>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onClose={handleClose} title={t('driverForm.createTitle')} subtitle={t('driverForm.createSubtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('driverForm.matricule')}</label>
          <input className="input" placeholder="CH-001" {...register('matricule', { required: t('common.requiredField') })} />
          {errors.matricule && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.matricule.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('driverForm.firstName')}</label>
            <input className="input" {...register('firstName', { required: t('common.requiredField') })} />
            {errors.firstName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="label">{t('driverForm.lastName')}</label>
            <input className="input" {...register('lastName', { required: t('common.requiredField') })} />
            {errors.lastName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('driverForm.phoneOptional')}</label>
            <input className="input" {...register('phone')} />
          </div>
          <div>
            <label className="label">{t('driverForm.hireDate')}</label>
            <input type="date" className="input" {...register('hireDate', { required: t('common.requiredField') })} />
            {errors.hireDate && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.hireDate.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">{t('driverForm.jobTitleOptional')}</label>
          <input className="input" placeholder={t('driverForm.jobTitlePlaceholder')} {...register('jobTitle')} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('driverForm.licenseNumberOptional')}</label>
            <input className="input" {...register('licenseNumber')} />
          </div>
          <div>
            <label className="label">{t('driverForm.licenseCategoryOptional')}</label>
            <input className="input" placeholder="C, E" {...register('licenseCategory')} />
          </div>
        </div>

        <div>
          <label className="label">{t('driverForm.licenseExpiryOptional')}</label>
          <input type="date" className="input" {...register('licenseExpiryDate')} />
        </div>

        <div>
          <label className="label">{t('driverForm.cityOptional')}</label>
          <select className="input" {...register('cityId')}>
            <option value="">{t('driverForm.cityUnspecified')}</option>
            {cityOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {chauffeurUsers.length > 0 && (
          <div>
            <label className="label">{t('driverForm.linkExistingAccountOptional')}</label>
            <select className="input" {...register('userId')}>
              <option value="">{t('common.none')}</option>
              {chauffeurUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName} — {u.email}</option>
              ))}
            </select>
          </div>
        )}

        <div className="rounded-lg border border-surface-border p-3 dark:border-slate-700">
          <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" className="rounded" disabled={!!userId} {...register('grantAccess')} />
            {t('driverForm.grantAccess')}
          </label>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('driverForm.grantAccessHint')}
          </p>

          {grantAccess && !userId && (
            <div className="mt-3">
              <label className="label">{t('driverForm.accountEmailOptional')}</label>
              <input
                type="email"
                className="input"
                placeholder="prenom.nom@sogeco.cm"
                {...register('accountEmail')}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('driverForm.accountEmailHint')}
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
          <UserPlus size={16} />
          {t('driverForm.createSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
