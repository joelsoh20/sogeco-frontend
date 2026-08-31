import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { authApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';

interface FormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Changement volontaire du mot de passe par son titulaire — y compris
 * un administrateur, pour son propre compte (POST /auth/change-password).
 * Distinct de la reinitialisation d'un tiers (adminApi.resetPassword),
 * qui ne demande jamais l'ancien mot de passe.
 */
export function ChangeMyPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>();
  const newPassword = watch('newPassword');

  const change = useMutation({
    mutationFn: ({ currentPassword, newPassword }: FormValues) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success(t('changePasswordForm.success'));
      reset();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  const onSubmit = (values: FormValues) => {
    setError(null);
    change.mutate(values);
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('changePasswordForm.title')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('changePasswordForm.currentPassword')}</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              className="input pr-10"
              {...register('currentPassword', { required: t('common.requiredField') })}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              aria-label={showCurrent ? t('auth.hidePassword') : t('auth.showPassword')}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.currentPassword && <p className="mt-1 text-xs text-red-600">{errors.currentPassword.message}</p>}
        </div>

        <div>
          <label className="label">{t('changePasswordForm.newPassword')}</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              className="input pr-10"
              {...register('newPassword', {
                required: t('common.requiredField'),
                minLength: { value: 5, message: t('changePasswordForm.minLength') },
              })}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              aria-label={showNew ? t('auth.hidePassword') : t('auth.showPassword')}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
        </div>

        <div>
          <label className="label">{t('changePasswordForm.confirmPassword')}</label>
          <input
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            className="input"
            {...register('confirmPassword', {
              required: t('common.requiredField'),
              validate: (value) => value === newPassword || t('changePasswordForm.mismatch'),
            })}
          />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
        </div>

        <p className="text-xs text-slate-500">
          {t('changePasswordForm.hint')}
        </p>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={isSubmitting || change.isPending} className="btn-primary w-full">
          {(isSubmitting || change.isPending) && <Spinner className="text-white" />}
          <KeyRound size={16} />
          {t('changePasswordForm.submit')}
        </button>
      </form>
    </Drawer>
  );
}
