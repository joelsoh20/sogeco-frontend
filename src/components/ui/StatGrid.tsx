import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { staggerContainer } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * Grille de cartes d'indicateurs, avec revelation echelonnee.
 *
 * C'est ce conteneur qui declenche l'animation d'entree de chaque
 * StatCard enfant : sans un parent portant staggerContainer et
 * initial/animate, la variante fadeInUp de StatCard ne se joue jamais,
 * Motion n'ayant personne pour lui dire quand passer de "hidden" a
 * "visible". Toutes les grilles de StatCard doivent donc passer par
 * ce composant plutot que par un simple <div className="grid">.
 */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}
    >
      {children}
    </motion.div>
  );
}
