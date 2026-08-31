import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { adminApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import type { User } from '@/types/api';

interface FormValues {
  newPassword: string;
  confirmPassword: string;
}

interface SetUserPasswordModalProps {
  user: User | null;
  onClose: () => void;
}

/**
 * Mot de passe choisi par l'administrateur pour un tiers — distinct de
 * la reinitialisation (adminApi.resetPassword), qui genere une valeur
 * aleatoire au lieu de laisser l'administrateur la saisir lui-meme.
 */
export function SetUserPasswordModal({ user, onClose }: SetUserPasswordModalProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>();
  const newPassword = watch('newPassword');

  const setPassword = useMutation({
    mutationFn: (values: FormValues) => adminApi.setUserPassword(user!.id, values.newPassword),
    onSuccess: () => {
      toast.success(t('setPasswordForm.success', { name: user!.fullName }));
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
    setPassword.mutate(values);
  };

  return (
    <Drawer open={!!user} onClose={handleClose} title={t('setPasswordForm.title')} subtitle={user?.fullName}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">{t('changePasswordForm.newPassword')}</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="input pr-10"
              {...register('newPassword', {
                required: t('common.requiredField'),
                minLength: { value: 5, message: t('changePasswordForm.minLength') },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
        </div>

        <div>
          <label className="label">{t('changePasswordForm.confirmPassword')}</label>
          <input
            type={showPassword ? 'text' : 'password'}
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
          {t('setPasswordForm.hint', { name: user?.firstName ?? '' })}
        </p>

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <button type="submit" disabled={isSubmitting || setPassword.isPending} className="btn-primary w-full">
          {(isSubmitting || setPassword.isPending) && <Spinner className="text-white" />}
          <KeyRound size={16} />
          {t('setPasswordForm.submit')}
        </button>
      </form>
    </Drawer>
  );
}
