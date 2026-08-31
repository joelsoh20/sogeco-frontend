import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { fadeInUp } from '@/lib/motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** Ce que l'utilisateur peut faire, pas une excuse. */
  action?: string;
}

/**
 * Ecran vide.
 *
 * Un ecran vide est une invitation a agir, pas un constat d'echec :
 * on dit ce qui manque et comment le remplir. L'entree discrete evite
 * qu'il apparaisse comme un bloc fige plaque sur la page.
 */
export function EmptyState({ icon: Icon, title, action }: EmptyStateProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
        <Icon size={28} className="text-slate-400 dark:text-slate-500" />
      </div>
      <p className="mt-4 font-medium text-slate-700 dark:text-slate-300">{title}</p>
      {action && <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">{action}</p>}
    </motion.div>
  );
}
