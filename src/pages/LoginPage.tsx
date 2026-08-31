import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { EASE_OUT } from '@/lib/motion';

interface LoginForm {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  totpCode?: string;
}

type LoginMode = 'email' | 'name';

const BRAND_LETTERS = 'SOGECO SARL'.split('');
const SPLASH_HOLD_MS = 2400;

/**
 * Ecran d'accueil de marque, joue une fois avant le formulaire — le logo
 * apparait puis "SOGECO SARL" s'ecrit lettre par lettre. Le formulaire
 * reste monte en dessous pendant toute la duree (voir LoginPage) : au
 * moment ou cet ecran s'efface, la page de connexion est deja prete,
 * sans flash ni decalage de mise en page.
 */
function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, SPLASH_HOLD_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-navy-900"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.75 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white p-2.5 shadow-2xl"
      >
        <img src="/logo.jpeg" alt="SOGECO" className="h-full w-full object-contain" />
      </motion.div>

      <div className="flex text-2xl font-semibold tracking-[0.2em] text-white sm:text-3xl">
        {BRAND_LETTERS.map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.055, duration: 0.35, ease: EASE_OUT }}
          >
            {char === ' ' ? ' ' : char}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [showIntro, setShowIntro] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsTotp, setNeedsTotp] = useState(false);
  // Nom et prenom privilegie sur l'email : c'est ce que les chauffeurs et
  // gestionnaires utilisent au quotidien, l'email restant une option de
  // secours (bascule disponible juste en dessous).
  const [mode, setMode] = useState<LoginMode>('name');
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    try {
      const credentials = mode === 'email'
        ? { email: values.email }
        : { firstName: values.firstName, lastName: values.lastName };
      const response = await authApi.login(credentials, values.password, values.totpCode);
      login(response);
      navigate('/');
    } catch (e) {
      const message = errorMessage(e);
      // Le backend n'est pas bilingue : ce message vient toujours du
      // serveur en francais, quelle que soit la langue choisie dans
      // l'interface. La detection ci-dessous compare donc un texte
      // francais fixe, jamais une cle traduite — c'est intentionnel,
      // pas un oubli de traduction.
      if (message.toLowerCase().includes('double authentification requis')) {
        setNeedsTotp(true);
        setError(t('auth.totpRequiredMessage'));
      } else {
        setError(message);
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {showIntro && <SplashScreen onDone={() => setShowIntro(false)} />}
      </AnimatePresence>
      <div className="flex min-h-screen">
      {/* Panneau d'identite : bleu nuit des maquettes — identique dans
          les deux themes, cette couleur est deja tres sombre. */}
      <div className="hidden flex-1 flex-col justify-between bg-navy-900 p-12 lg:flex">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg">
            <img src="/logo.jpeg" alt="SOGECO" className="h-full w-full object-contain" />
          </div>
          <div className="leading-tight">
            <p className="text-2xl font-semibold tracking-wide text-white">SOGECO</p>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sarl</p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight text-white">
            {t('auth.heroTitle')}
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            {t('auth.heroSubtitle')}
          </p>

          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-slate-400">{t('auth.statVehicles')}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular text-white">11</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-slate-400">{t('auth.statSites')}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular text-white">6</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-slate-400">{t('auth.statCities')}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular text-white">3</dd>
            </div>
          </dl>
        </div>

        <p className="text-xs text-slate-500">{t('auth.footer')}</p>
      </div>

      {/* Formulaire */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 dark:bg-slate-950">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-surface-border p-1.5 shadow-sm dark:border-slate-700">
              <img src="/logo.jpeg" alt="SOGECO" className="h-full w-full object-contain" />
            </div>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">SOGECO Fleet Manager</p>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('auth.loginTitle')}</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {t('auth.loginSubtitle')}
          </p>

          <div className="mt-6 inline-flex rounded-lg border border-surface-border p-0.5 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMode('name')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'name' ? 'bg-accent-soft text-accent dark:bg-accent/15' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {t('auth.modeName')}
            </button>
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'email' ? 'bg-accent-soft text-accent dark:bg-accent/15' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {t('auth.modeEmail')}
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {mode === 'email' ? (
              <div>
                <label htmlFor="email" className="label">{t('auth.emailLabel')}</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder={t('auth.emailPlaceholder')}
                  className="input"
                  {...register('email', { required: t('auth.emailRequired') })}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="label">{t('auth.firstNameLabel')}</label>
                  <input
                    id="firstName"
                    autoComplete="given-name"
                    className="input"
                    {...register('firstName', { required: t('auth.firstNameRequired') })}
                  />
                  {errors.firstName && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className="label">{t('auth.lastNameLabel')}</label>
                  <input
                    id="lastName"
                    autoComplete="family-name"
                    className="input"
                    {...register('lastName', { required: t('auth.lastNameRequired') })}
                  />
                  {errors.lastName && (
                    <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="label">{t('auth.passwordLabel')}</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-10"
                  {...register('password', { required: t('auth.passwordRequired') })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errors.password.message}</p>
              )}
            </div>

            {needsTotp && (
              <div>
                <label htmlFor="totpCode" className="label">{t('auth.totpLabel')}</label>
                <input
                  id="totpCode"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="input tabular tracking-[0.3em]"
                  {...register('totpCode')}
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {t('auth.totpHint')}
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting && <Spinner className="text-white" />}
              {t('auth.submit')}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
            {t('auth.forgotPassword')}
          </p>
        </div>
      </div>
      </div>
    </>
  );
}
