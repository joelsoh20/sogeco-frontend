import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { backdropFade, drawerSlide } from '@/lib/motion';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Panneau lateral de detail, ouvert au clic sur une ligne de liste.
 * Reprend le pattern "liste + panneau" des maquettes, applique de
 * facon identique sur les camions, missions et alertes.
 *
 * Point important : le composant reste MONTE tant que l'animation de
 * sortie joue. La version precedente faisait un simple
 * "if (!open) return null", qui retire l'element du DOM avant que la
 * moindre transition n'ait la chance de s'executer — AnimatePresence
 * a justement pour role de retarder ce retrait jusqu'a la fin de
 * l'animation "exit".
 */
export function Drawer({ open, onClose, title, subtitle, children }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-30 flex justify-end">
          <motion.div
            variants={backdropFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-slate-900/20 dark:bg-black/50"
            onClick={onClose}
          />
          <motion.div
            variants={drawerSlide}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative flex w-full max-w-md flex-col bg-white shadow-panel dark:bg-slate-900"
          >
            <div className="flex items-start justify-between border-b border-surface-border px-6 py-4 dark:border-slate-800">
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
                {subtitle && <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="ml-3 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-surface-border py-2.5 text-sm dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}
