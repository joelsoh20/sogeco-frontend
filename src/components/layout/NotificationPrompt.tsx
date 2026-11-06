import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NotificationPermissionState } from '@/hooks/useAlertNotifications';

const DISMISSED_KEY = 'sogeco.notifications.prompt-dismissed';

interface NotificationPromptProps {
  permission: NotificationPermissionState;
  onEnable: () => void;
}

/**
 * Invitation a activer les notifications du navigateur, comme le bandeau de
 * WhatsApp Web. Les navigateurs exigent un geste de l'utilisateur pour
 * demander l'autorisation : elle ne peut pas etre demandee automatiquement.
 * Affichee tant que le choix n'est pas fait et tant qu'elle n'a pas ete
 * repoussee ; jamais si le navigateur a deja refuse ou ne sait pas notifier.
 */
export function NotificationPrompt({ permission, onEnable }: NotificationPromptProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1');

  if (permission !== 'default' || dismissed) return null;

  const later = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-3 border-b border-accent/20 bg-accent/10 px-4 py-2 text-sm text-slate-700 dark:text-slate-200">
      <Bell size={16} className="shrink-0 text-accent" />
      <p className="flex-1">{t('alertNotifications.prompt')}</p>
      <button type="button" onClick={onEnable} className="btn-primary px-3 py-1 text-xs">
        {t('alertNotifications.enable')}
      </button>
      <button type="button" onClick={later} aria-label={t('alertNotifications.later')}
        className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <X size={14} />
      </button>
    </div>
  );
}
