/**
 * Fenetre de modification libre apres creation d'un enregistrement —
 * memes regles cote frontend (pour afficher/masquer le bouton
 * "Modifier") que cote backend (EditWindowGuard, qui reste seul
 * decideur : ce controle cote client est un confort d'affichage, pas
 * une securite — le serveur refuse de toute facon une requete hors
 * delai pour un non-administrateur.
 *
 * 1h par defaut (Carburant, Maintenance, Camions, Missions, Chauffeurs) ;
 * un module peut passer une fenetre differente (24h pour les Sinistres).
 */
const EDIT_WINDOW_HOURS = 1;

export function canEditRecord(
  createdAt: string | null | undefined,
  isAdmin: boolean,
  windowHours: number = EDIT_WINDOW_HOURS,
): boolean {
  if (isAdmin) return true;
  if (!createdAt) return false;
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  return elapsedMs <= windowHours * 60 * 60 * 1000;
}
