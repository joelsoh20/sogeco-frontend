import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DISMISSED_KEY = 'sogeco.install.prompt-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * Invitation a installer l'application (PWA) sur l'ecran d'accueil. Android/Chrome/Edge : bouton
 * natif. iPhone/iPad : pas d'invite programmable, on explique le geste « Partager > Sur l'ecran
 * d'accueil » — et c'est aussi la seule facon d'y recevoir les notifications push.
 */
export function InstallPrompt() {
  const { t } = useTranslation();
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1');

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (dismissed || isStandalone()) return null;
  const showIosHint = isIos() && !event;
  if (!event && !showIosHint) return null;

  const later = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };
  const install = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  };

  return (
    <div className="flex items-center gap-3 border-b border-accent/20 bg-accent/10 px-4 py-2 text-sm text-slate-700 dark:text-slate-200">
      <Download size={16} className="shrink-0 text-accent" />
      <p className="flex-1">{event ? t('install.prompt') : t('install.iosHint')}</p>
      {event && (
        <button type="button" onClick={install} className="btn-primary px-3 py-1 text-xs">
          {t('install.action')}
        </button>
      )}
      <button type="button" onClick={later} aria-label={t('alertNotifications.later')}
        className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
        <X size={14} />
      </button>
    </div>
  );
}
