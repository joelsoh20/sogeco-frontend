import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';
import type { ApiError } from '@/types/api';

/**
 * Base d'API explicite.
 *
 * VITE_API_BASE_URL doit etre defini SANS barre oblique finale
 * (http://localhost:8080, jamais http://localhost:8080/) : les
 * endpoints commencent deja par /api/v1, une double barre produirait
 * un 404 cote serveur.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Renouvellement automatique sur 401.
 *
 * Le jeton d'acces ne dure que 15 minutes. Sans ce mecanisme,
 * l'utilisateur serait deconnecte quatre fois par heure.
 *
 * Les requetes qui echouent pendant le renouvellement sont mises en
 * attente puis rejouees : sans cette file, dix appels simultanes
 * declencheraient dix renouvellements et invalideraient la session par
 * rotation du jeton.
 */
let refreshing = false;
let queue: { resolve: (token: string) => void; reject: (error: unknown) => void }[] = [];

function flushQueue(error: unknown, token: string | null) {
  queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)));
  queue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };

    if (error.response?.status !== 401 || original._retried) {
      return Promise.reject(error);
    }

    if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    const { refreshToken, setTokens, logout } = useAuthStore.getState();
    if (!refreshToken) {
      logout();
      return Promise.reject(error);
    }

    if (refreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retried = true;
    refreshing = true;

    try {
      const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
      setTokens(data.accessToken, data.refreshToken);
      flushQueue(null, data.accessToken);

      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      logout();
      window.location.href = '/connexion';
      return Promise.reject(refreshError);
    } finally {
      refreshing = false;
    }
  },
);

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const problem = error.response?.data;
    if (problem?.errors?.length) {
      return problem.errors.map((e) => `${e.field} : ${e.message}`).join('\n');
    }
    if (problem?.detail) return problem.detail;
    if (error.code === 'ERR_NETWORK') return "Le serveur ne répond pas. Vérifiez qu'il est démarré.";
  }
  return 'Une erreur inattendue est survenue.';
}
