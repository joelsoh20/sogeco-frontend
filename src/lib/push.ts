import { api } from '@/api/client';

/**
 * Notifications push (Web Push) et PWA : enregistrement du service worker, abonnement de
 * l'appareil, et affichage des notifications via le service worker (obligatoire sur mobile,
 * ou `new Notification()` est refuse).
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Contexte non securise (http hors localhost) ou navigateur restreint : l'appli reste utilisable.
    });
  });
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function b64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  let s = '';
  new Uint8Array(buffer).forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Abonne l'appareil et l'enregistre cote serveur (idempotent : appele a chaque ouverture, il
 * rattache aussi l'appareil au compte connecte). Sans effet si l'autorisation n'est pas accordee
 * ou si le serveur n'a pas de cles VAPID.
 */
export async function ensurePushSubscription(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try {
    const { data } = await api.get<{ enabled: boolean; publicKey: string }>('/api/v1/push/public-key');
    if (!data.enabled) return false;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }
    await api.post('/api/v1/push/subscriptions', {
      endpoint: subscription.endpoint,
      p256dh: b64(subscription.getKey('p256dh')),
      auth: b64(subscription.getKey('auth')),
    });
    return true;
  } catch {
    return false;
  }
}

/** Retire l'appareil du compte a la deconnexion (jeton fourni : le magasin est deja vide a ce moment). */
export async function unsubscribeDevice(accessToken: string | null): Promise<void> {
  if (!pushSupported() || !accessToken) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await fetch(`${BASE_URL}/api/v1/push/subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await subscription.unsubscribe();
  } catch {
    // Sans consequence : le serveur oublie l'appareil au premier refus du service push.
  }
}

/** Notification systeme via le service worker, avec repli sur l'API classique. */
export async function showSystemNotification(title: string, options: NotificationOptions & { url?: string }) {
  const { url, ...rest } = options;
  const payload = { icon: '/icon-192.png', badge: '/icon-192.png', data: { url: url ?? '/alertes' }, ...rest };
  const registration = await navigator.serviceWorker?.getRegistration();
  if (registration) {
    await registration.showNotification(title, payload);
    return;
  }
  const n = new Notification(title, payload);
  n.onclick = () => {
    window.focus();
    n.close();
  };
}
