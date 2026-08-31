import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Garde de route.
 *
 * Le controle cote client sert au confort de navigation, pas a la
 * securite : le backend refuse de toute facon les appels non
 * autorises. Les deux sont complementaires.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { accessToken } = useAuthStore();
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
