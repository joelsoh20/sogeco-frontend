/**
 * Vocabulaire de mouvement partage.
 *
 * Chaque composant anime puise ici plutot que d'inventer sa propre
 * duree ou sa propre courbe : c'est ce qui fait qu'une interface animee
 * partout de facon differente parait bricolee, alors qu'une meme
 * physique reutilisee partout parait concue.
 *
 * Le mode "mouvement reduit" du systeme d'exploitation est gere une
 * seule fois, au niveau de App.tsx via <MotionConfig reducedMotion="user">
 * — aucun composant n'a besoin de le verifier lui-meme.
 */

/** Douce, pour les elements qui apparaissent au chargement d'un ecran. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Ressort leger : pour ce qui doit sembler physique — tiroirs, menus. */
export const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 32 } as const;

/** Ressort plus doux : pour de plus grands deplacements (tiroir lateral). */
export const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 30 } as const;

export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const;

/** Une carte ou une ligne qui apparait, legerement depuis le bas. */
export const fadeInUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
};

/**
 * Conteneur a enfants echelonnes : chaque enfant utilise fadeInUp,
 * mais apparait 40 ms apres le precedent. C'est ce qui transforme une
 * liste de cartes d'un affichage brutal en une revelation ordonnee —
 * un seul geste orchestre, pas un scintillement partout.
 */
export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base } },
};

/** Fondu leger pour le fond d'un panneau ou d'une boite de dialogue. */
export const backdropFade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

/** Glissement lateral du tiroir de detail, avec ressort physique. */
export const drawerSlide = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: SPRING_SMOOTH },
  exit: { x: '100%', transition: { duration: DURATION.base, ease: EASE_OUT } },
};

/** Menu deroulant : petite echelle depuis le point d'ancrage. */
export const popIn = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.fast, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.96, y: -4, transition: { duration: DURATION.fast } },
};

/** Notification qui glisse depuis la droite et se retire de meme. */
export const toastSlide = {
  hidden: { opacity: 0, x: 40, scale: 0.95 },
  visible: { opacity: 1, x: 0, scale: 1, transition: SPRING_SNAPPY },
  exit: { opacity: 0, x: 40, scale: 0.95, transition: { duration: DURATION.fast } },
};
