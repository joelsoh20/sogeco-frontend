import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { allowedPagesFor, landingPathFor } from '@/lib/roleAccess';

/**
 * Garde de route.
 *
 * Le controle cote client sert au confort de navigation, pas a la
 * securite : le backend refuse de toute facon les appels non
 * autorises. Les deux sont complementaires.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuthStore();
  const canOpenSettings = useAuthStore((state) => state.hasAnyPermission('SETTING_MANAGE', 'USER_MANAGE'));
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  // Parametres : reserves a qui peut les gerer (administrateur) ; le gestionnaire est renvoye a l'accueil.
  if (location.pathname === '/parametres' && !canOpenSettings) {
    return <Navigate to="/" replace />;
  }

  // Compte restreint (comptable) : toute autre page renvoie vers sa page d'arrivee.
  const allowed = allowedPagesFor(user?.roles);
  if (allowed && !allowed.includes(location.pathname)) {
    return <Navigate to={landingPathFor(user?.roles)} replace />;
  }

  return <>{children}</>;
}
