import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Copy, KeyRound, UserPlus } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import type { CreateUserRequest, UserCreationResult } from '@/types/api';

interface FormValues {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  cityId: string;
  roleCode: string;
}

/** Villes ou l'entreprise a une implantation active. */
const USER_CITY_NAMES = ['Douala', 'Yaoundé', 'Bafoussam'];

interface CreateUserDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Creation d'un utilisateur.
 *
 * Le mot de passe est toujours genere par le backend, jamais saisi ici
 * — c'est a l'administrateur de le communiquer, pas de le choisir. Il
 * est renvoye UNE SEULE FOIS dans la reponse, jamais stocke en clair
 * ni recuperable ensuite — d'ou l'ecran de confirmation qui force a le
 * copier avant de fermer, plutot qu'un simple message qui disparaitrait.
 */
export function CreateUserDrawer({ open, onClose }: CreateUserDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<UserCreationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = useQuery({ queryKey: ['admin', 'roles'], queryFn: adminApi.roles, enabled: open });
  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: open });
  const cityOptions = (cities.data ?? []).filter((c) => USER_CITY_NAMES.includes(c.name));

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const createUser = useMutation({
    mutationFn: (payload: CreateUserRequest) => adminApi.createUser(payload),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    createUser.mutate({
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone || undefined,
      cityId: values.cityId ? Number(values.cityId) : undefined,
      roleCodes: [values.roleCode],
    });
  };

  const handleClose = () => {
    setResult(null);
    setCopied(false);
    setError(null);
    reset();
    onClose();
  };

  const copyPassword = () => {
    if (result?.temporaryPassword) {
      navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
    }
  };

  // Ecran de confirmation : affiche apres creation reussie, tant que
  // le mot de passe genere n'a pas ete explicitement note.
  if (result) {
    return (
      <Drawer open={open} onClose={handleClose} title={t('userForm.createdTitle')}>
        <div className="space-y-5">
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="font-medium">{result.user.fullName}</span> {t('userForm.createdSuccess')}
          </div>

          {result.temporaryPassword ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <KeyRound size={16} />
                {t('settingsPage.temporaryPassword')}
              </div>
              <p className="mt-1.5 text-xs text-amber-800">
                {t('settingsPage.temporaryPasswordHint', { name: result.user.firstName })}
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
                {t('userForm.passwordRemainsValid')}
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t('userForm.passwordApplied')}
            </div>
          )}

          <button
            onClick={handleClose}
            disabled={!!result.temporaryPassword && !copied}
            className="btn-primary w-full"
          >
            {result.temporaryPassword && !copied ? t('settingsPage.copyToContinue') : t('settingsPage.done')}
          </button>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onClose={handleClose} title={t('userForm.createTitle')} subtitle={t('userForm.createSubtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('auth.firstNameLabel')}</label>
            <input className="input" {...register('firstName', { required: t('common.requiredField') })} />
            {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="label">{t('auth.lastNameLabel')}</label>
            <input className="input" {...register('lastName', { required: t('common.requiredField') })} />
            {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">{t('userForm.emailOptional')}</label>
          <input
            type="email"
            placeholder="prenom.nom@sogeco.cm"
            className="input"
            {...register('email')}
          />
          <p className="mt-1 text-xs text-slate-500">
            {t('userForm.emailHint')}
          </p>
        </div>

        <div>
          <label className="label">{t('userForm.phoneOptional')}</label>
          <input className="input" {...register('phone')} />
        </div>

        <div>
          <label className="label">{t('settingsPage.colRole')}</label>
          <select className="input" {...register('roleCode', { required: t('common.requiredField') })}>
            <option value="">{t('common.selectPlaceholder')}</option>
            {roles.data?.map((role) => (
              <option key={role.code} value={role.code}>
                {t(`roles.${role.code}`, role.label)}
              </option>
            ))}
          </select>
          {errors.roleCode && <p className="mt-1 text-xs text-red-600">{errors.roleCode.message}</p>}
        </div>

        <div>
          <label className="label">{t('userForm.managedCityOptional')}</label>
          <select className="input" {...register('cityId')}>
            <option value="">{t('userForm.allAdmin')}</option>
            {cityOptions.map((city) => (
              <option key={city.id} value={city.id}>{city.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            {t('userForm.managedCityHint')}
          </p>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={isSubmitting || createUser.isPending} className="btn-primary w-full">
          {(isSubmitting || createUser.isPending) && <Spinner className="text-white" />}
          <UserPlus size={16} />
          {t('userForm.createSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
