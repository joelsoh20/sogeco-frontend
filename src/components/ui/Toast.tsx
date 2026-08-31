import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, X, XCircle, Info } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import { toastSlide } from '@/lib/motion';
import { cn } from '@/lib/utils';

const STYLES = {
  success: { icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300' },
  error:   { icon: XCircle,      className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300' },
  info:    { icon: Info,         className: 'border-accent/20 bg-accent-soft text-accent dark:border-accent/30 dark:bg-accent/10 dark:text-blue-300' },
};

/**
 * Pile de notifications, montee une seule fois dans AppLayout.
 *
 * AnimatePresence gere l'animation de SORTIE — c'est le point que
 * l'ancien Drawer sans animation ratait : sans lui, un element retire
 * du DOM disparait instantanement, jamais en douceur.
 */
export function ToastStack() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[600] flex w-80 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((item) => {
          const style = STYLES[item.variant];
          const Icon = style.icon;
          return (
            <motion.div
              key={item.id}
              layout
              variants={toastSlide}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                'pointer-events-auto flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-panel',
                style.className,
              )}
            >
              <Icon size={16} className="mt-0.5 shrink-0" />
              <p className="flex-1">{item.message}</p>
              <button onClick={() => dismiss(item.id)} className="shrink-0 opacity-60 hover:opacity-100">
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
