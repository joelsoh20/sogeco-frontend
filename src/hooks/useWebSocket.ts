import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '@/store/authStore';

/**
 * Abonnement STOMP a un canal de diffusion.
 *
 * Rappel : Spring n'implemente pas le protocole Socket.io. La liaison
 * se fait en STOMP over SockJS, avec le jeton transmis dans l'en-tete
 * CONNECT — jamais dans l'URL, qui se retrouverait dans les journaux
 * de proxy.
 *
 * L'adresse est construite depuis VITE_API_BASE_URL : sans proxy actif,
 * un chemin relatif "/ws" pointerait sur le serveur Vite lui-meme.
 */
export function useStompSubscription<T>(
  destination: string,
  onMessage: (payload: T) => void,
  enabled = true,
  onConnected?: () => void,
) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;

  useEffect(() => {
    if (!enabled || !accessToken) return;

    const base = import.meta.env.VITE_API_BASE_URL || '';

    const client = new Client({
      webSocketFactory: () => new SockJS(`${base}/ws`),
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // Appele a chaque connexion ET reconnexion : une coupure silencieuse
      // (veille de l'onglet, reseau) laisserait sinon l'ecran fige sur la
      // derniere trame recue avant la coupure, sans aucun signe pour
      // l'utilisateur — le rattrapage se fait ici par un re-fetch REST.
      onConnect: () => {
        onConnectedRef.current?.();
        client.subscribe(destination, (message) => {
          try {
            callbackRef.current(JSON.parse(message.body) as T);
          } catch {
            // Un message illisible ne doit pas rompre l'abonnement.
          }
        });
      },
    });

    client.activate();
    return () => {
      client.deactivate();
    };
  }, [destination, enabled, accessToken]);
}
