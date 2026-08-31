import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import type { UpdateUserRequest, User } from '@/types/api';

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

interface EditUserDrawerProps {
  user: User | null;
  onClose: () => void;
}

/**
 * Modification d'un utilisateur — y compris l'adresse email, absente du
 * formulaire de creation initial : un compte cree sans email reel (donc
 * avec l'adresse generee en interne, jamais communiquee) peut ainsi en
 * recevoir un par la suite, ou un compte existant en changer.
 */
export function EditUserDrawer({ user, onClose }: EditUserDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const roles = useQuery({ queryKey: ['admin', 'roles'], queryFn: adminApi.roles, enabled: !!user });
  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: !!user });
  const cityOptions = (cities.data ?? []).filter((c) => USER_CITY_NAMES.includes(c.name));

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  // Reinitialise le formulaire a chaque ouverture sur un utilisateur different.
  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? '',
        cityId: user.cityId ? String(user.cityId) : '',
        roleCode: user.roles[0] ?? '',
      });
      setError(null);
    }
  }, [user, reset]);

  const updateUser = useMutation({
    mutationFn: (payload: UpdateUserRequest) => adminApi.updateUser(user!.id, payload),
    onSuccess: () => {
      toast.success(t('userForm.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    updateUser.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email || undefined,
      phone: values.phone || undefined,
      cityId: values.cityId ? Number(values.cityId) : undefined,
      roleCodes: [values.roleCode],
    });
  };

  return (
    <Drawer open={!!user} onClose={onClose} title={t('userForm.editTitle')} subtitle={user?.fullName}>
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
          <label className="label">{t('userForm.email')}</label>
          <input
            type="email"
            placeholder="prenom.nom@sogeco.cm"
            className="input"
            {...register('email')}
          />
          <p className="mt-1 text-xs text-slate-500">
            {t('userForm.emailHintEdit')}
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

        <button type="submit" disabled={isSubmitting || updateUser.isPending} className="btn-primary w-full">
          {(isSubmitting || updateUser.isPending) && <Spinner className="text-white" />}
          <Save size={16} />
          {t('common.save')}
        </button>
      </form>
    </Drawer>
  );
}
