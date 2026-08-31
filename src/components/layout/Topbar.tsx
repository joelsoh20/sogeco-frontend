import { Bell, ChevronDown, KeyRound, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { authApi } from '@/api/endpoints';
import { popIn } from '@/lib/motion';
import { ChangeMyPasswordModal } from './ChangeMyPasswordModal';

interface TopbarProps {
  title: string;
  subtitle?: string;
  alertCount?: number;
  onMenuClick?: () => void;
}

export function Topbar({ title, subtitle, alertCount = 0, onMenuClick }: TopbarProps) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      navigate('/connexion');
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr');
  };

  const roleLabel = user?.roles.map((role) => t(`roles.${role}`, role)).join(', ');

  return (
    <header className="flex items-center justify-between gap-2 border-b border-surface-border bg-white px-4 py-3 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onMenuClick}
          className="-ml-1 shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          aria-label={t('common.menu')}
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">{title}</h1>
          {subtitle && <p className="mt-0.5 hidden truncate text-sm text-slate-500 dark:text-slate-400 sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {/* Langue : FR / EN, un clic pour basculer — pas de menu pour
            un choix a deux options, l'economie d'un clic compte. */}
        <button
          onClick={toggleLanguage}
          className="hidden rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 sm:block"
          title={t('language.toggle')}
        >
          {i18n.language === 'fr' ? 'FR' : 'EN'}
        </button>

        <button
          onClick={toggleTheme}
          className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
          title={t('theme.toggle')}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button
          onClick={() => navigate('/alertes')}
          className="relative rounded-lg p-2.5 text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
          title={t('topbar.alerts')}
        >
          <Bell size={18} />
          {alertCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {alertCount}
            </span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent dark:bg-accent/20">
              {user?.fullName?.charAt(0) ?? '?'}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-slate-800 dark:text-slate-200">{user?.fullName}</p>
              <p className="text-xs leading-tight text-slate-500 dark:text-slate-400">{roleLabel}</p>
            </div>
            <ChevronDown size={16} className="text-slate-400" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  variants={popIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{ transformOrigin: 'top right' }}
                  className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-surface-border bg-white py-1 shadow-panel dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="border-b border-surface-border px-4 py-2.5 dark:border-slate-700">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{user?.fullName}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); setChangePasswordOpen(true); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <KeyRound size={16} />
                    {t('topbar.changePassword')}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <LogOut size={16} />
                    {t('topbar.logout')}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ChangeMyPasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </header>
  );
}
