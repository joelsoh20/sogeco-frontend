import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, CurrentUser } from '@/types/api';

/**
 * Etat d'authentification.
 *
 * Les jetons vivent dans localStorage : c'est le compromis retenu pour
 * une application interne. Un cookie httpOnly serait plus sur face au
 * XSS, mais imposerait une gestion CSRF que l'API sans etat n'a pas.
 */
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: CurrentUser | null;

  login: (response: AuthResponse) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: CurrentUser) => void;
  logout: () => void;

  hasPermission: (code: string) => boolean;
  hasAnyPermission: (...codes: string[]) => boolean;
  hasRole: (code: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      login: (response) =>
        set({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          user: {
            id: response.userId,
            email: response.email,
            fullName: response.fullName,
            cityId: response.cityId,
            roles: response.roles,
            permissions: response.permissions,
            totpEnabled: response.totpEnabled,
            mustChangePassword: response.mustChangePassword,
          },
        }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null }),

      // Les permissions viennent du jeton : l'interface masque ce que
      // l'utilisateur ne peut pas faire, le backend le refuse de toute
      // facon. Les deux controles sont complementaires, pas redondants.
      hasPermission: (code) => get().user?.permissions.includes(code) ?? false,

      hasAnyPermission: (...codes) => {
        const permissions = get().user?.permissions ?? [];
        return codes.some((code) => permissions.includes(code));
      },

      hasRole: (code) => get().user?.roles.includes(code) ?? false,
    }),
    { name: 'sogeco-auth' },
  ),
);
