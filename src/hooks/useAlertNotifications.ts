import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { alertApi } from '@/api/endpoints';
import { toast } from '@/store/toastStore';
import { ensurePushSubscription, showSystemNotification } from '@/lib/push';
import { useStompSubscription } from '@/hooks/useWebSocket';
import type { Alert } from '@/types/api';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

function currentPermission(): NotificationPermissionState {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

/** Court double bip, sans fichier audio : Web Audio suffit et n'ajoute aucun asset. */
function beep(strong: boolean) {
  try {
    const ctx = new AudioContext();
    const tones = strong ? [880, 1100] : [880];
    tones.forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.14);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Audio indisponible ou bloque (aucune interaction utilisateur encore) : la notification suffit.
  }
}

/**
 * Notifications d'alerte facon messagerie : a chaque nouvelle alerte, une
 * notification du navigateur (visible meme onglet en arriere-plan) avec un
 * signal sonore, ou une bulle dans l'application si l'onglet est actif.
 *
 * Source : le canal STOMP /topic/alerts, deja alimente par le backend a chaque
 * alerte (AlertTriggeredEvent). Ce canal est diffuse a tous les utilisateurs
 * connectes sans filtre de ville : l'alerte n'est donc notifiee que si elle
 * figure dans GET /alerts/recent, qui lui applique le perimetre de l'utilisateur
 * (RG-13.4). Rien d'une alerte hors perimetre n'est jamais affiche.
 */
export function useAlertNotifications(enabled: boolean) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermissionState>(currentPermission());
  // Une meme alerte est re-diffusee a chaque nouvelle occurrence : une notification par (id, occurrences).
  const notified = useRef(new Set<string>());

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') void ensurePushSubscription();
  }, []);

  // Autorisation deja donnee : on (re)rattache cet appareil au compte pour recevoir le push navigateur ferme.
  useEffect(() => {
    if (enabled && permission === 'granted') void ensurePushSubscription();
  }, [enabled, permission]);

  useStompSubscription<Alert>('/topic/alerts', async (payload) => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });

    const key = `${payload.id}:${payload.occurrences}`;
    if (notified.current.has(key)) return;
    notified.current.add(key);

    let alert: Alert | undefined;
    try {
      alert = (await alertApi.recent()).find((a) => a.id === payload.id);
    } catch {
      return;
    }
    if (!alert) return; // hors perimetre de l'utilisateur, ou deja resolue

    const levelLabel = alert.level === 'CRITIQUE' ? t('alertNotifications.critical')
      : alert.level === 'IMPORTANT' ? t('alertNotifications.important')
        : t('alertNotifications.new');
    const title = `${levelLabel} · ${alert.title}`;
    const body = [alert.registrationNumber, alert.description].filter(Boolean).join(' — ');

    if (alert.level !== 'MINEUR' && alert.level !== 'INFORMATION') {
      beep(alert.level === 'CRITIQUE');
    }

    if (permission === 'granted' && !document.hasFocus()) {
      void showSystemNotification(title, {
        body,
        tag: `alert-${alert.id}`, // une seule notification par alerte, mise a jour plutot que dupliquee
        requireInteraction: alert.level === 'CRITIQUE',
        url: '/alertes',
      });
    } else {
      toast.info(body ? `${title} — ${body}` : title);
    }
  }, enabled);

  return { permission, requestPermission };
}
