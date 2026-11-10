/**
 * Roles dont les titulaires n'ont acces qu'a certaines pages. Le comptable ne voit que
 * Assurance & Visite technique et Rapports & Statistiques.
 *
 * Un utilisateur cumulant ce role avec un autre (ex. administrateur) n'est pas restreint :
 * la restriction ne s'applique que si TOUS ses roles sont restreints. Comme pour les
 * permissions, c'est un confort de navigation — le backend refuse de toute facon les appels
 * non autorises (voir la migration V54 qui retire au comptable les droits sans rapport).
 */
const RESTRICTED_ROLE_PAGES: Record<string, string[]> = {
  ROLE_COMPTABLE: ['/conformite', '/rapports'],
};

/** Pages autorisees pour ces roles, ou null si l'utilisateur n'est pas restreint. */
export function allowedPagesFor(roles: string[] | undefined): string[] | null {
  if (!roles || roles.length === 0 || !roles.every((r) => RESTRICTED_ROLE_PAGES[r])) return null;
  return [...new Set(roles.flatMap((r) => RESTRICTED_ROLE_PAGES[r]))];
}

/** Page d'arrivee apres connexion : la premiere page autorisee pour un compte restreint, sinon l'accueil. */
export function landingPathFor(roles: string[] | undefined): string {
  return allowedPagesFor(roles)?.[0] ?? '/';
}
