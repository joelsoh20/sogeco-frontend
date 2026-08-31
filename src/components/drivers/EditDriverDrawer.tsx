import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi, driverApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import type { CreateDriverRequest, DriverDetail } from '@/types/driver-performance';

interface FormValues {
  matricule: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
  hireDate: string;
  jobTitle: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  monthlySalary: string;
  cityId: string;
  userId: string;
}

/** Villes ou l'entreprise a une implantation active. */
const DRIVER_CITY_NAMES = ['Douala', 'Yaoundé', 'Bafoussam'];

interface EditDriverDrawerProps {
  open: boolean;
  onClose: () => void;
  driver: DriverDetail;
}

/**
 * Modification d'une fiche chauffeur — memes champs que la creation,
 * pre-remplis. Le backend refuse la requete (403) si plus d'une heure
 * s'est ecoulee depuis la creation et que l'utilisateur n'est pas
 * administrateur (EditWindowGuard) ; le bouton lui-meme n'est deja
 * plus propose dans ce cas (voir canEditRecord), ce controle serveur
 * est le filet de securite, pas la premiere ligne de defense.
 */
export function EditDriverDrawer({ open, onClose, driver }: EditDriverDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities, enabled: open });
  const cityOptions = (cities.data ?? []).filter((c) => DRIVER_CITY_NAMES.includes(c.name));
  const users = useQuery({ queryKey: ['admin', 'users', 'for-driver-link'], queryFn: () => adminApi.users(0, 200), enabled: open });
  const chauffeurUsers = (users.data?.content ?? []).filter((u) => u.roles.includes('ROLE_CHAUFFEUR'));

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      reset({
        matricule: driver.matricule,
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phone ?? '',
        birthDate: driver.birthDate?.slice(0, 10) ?? '',
        hireDate: driver.hireDate?.slice(0, 10) ?? '',
        jobTitle: driver.jobTitle ?? '',
        licenseNumber: driver.licenseNumber ?? '',
        licenseCategory: driver.licenseCategory ?? '',
        licenseExpiryDate: driver.licenseExpiryDate?.slice(0, 10) ?? '',
        monthlySalary: driver.monthlySalary?.toString() ?? '',
        cityId: driver.cityId?.toString() ?? '',
        userId: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, driver.id]);

  const update = useMutation({
    mutationFn: (payload: CreateDriverRequest) => driverApi.update(driver.id, payload),
    onSuccess: (updated) => {
      toast.success(t('driverForm.editSuccess', { name: updated.fullName }));
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    update.mutate({
      matricule: values.matricule,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone || undefined,
      birthDate: values.birthDate || undefined,
      hireDate: values.hireDate,
      jobTitle: values.jobTitle || undefined,
      licenseNumber: values.licenseNumber || undefined,
      licenseCategory: values.licenseCategory || undefined,
      licenseExpiryDate: values.licenseExpiryDate || undefined,
      monthlySalary: values.monthlySalary ? Number(values.monthlySalary) : undefined,
      cityId: values.cityId ? Number(values.cityId) : undefined,
      userId: values.userId ? Number(values.userId) : undefined,
    });
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('driverForm.editTitle')} subtitle={driver.fullName}>
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t('driverForm.licenseExpiryOptional')}</label>
            <input type="date" className="input" {...register('licenseExpiryDate')} />
          </div>
          <div>
            <label className="label">{t('driverForm.birthDateOptional')}</label>
            <input type="date" className="input" {...register('birthDate')} />
          </div>
        </div>

        <div>
          <label className="label">{t('driverForm.monthlySalaryOptional')}</label>
          <input type="number" min="0" className="input" {...register('monthlySalary')} />
        </div>

        <div>
          <label className="label">{t('driverForm.cityOptional')}</label>
          <select className="input" {...register('cityId')}>
            <option value="">{t('driverForm.cityUnspecified')}</option>
            {cityOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">{t('driverForm.linkedAccountOptional')}</label>
          <select className="input" {...register('userId')}>
            <option value="">{t('common.none')}</option>
            {chauffeurUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName} — {u.email}</option>
            ))}
          </select>
        </div>

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
