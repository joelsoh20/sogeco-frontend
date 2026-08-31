import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (variant: ToastVariant, message: string) => void;
  dismiss: (id: string) => void;
}

/**
 * File de notifications flottantes.
 *
 * Remplace les encarts d'erreur statiques repetes dans chaque
 * formulaire : une seule apparition, en overlay, qui se retire
 * d'elle-meme plutot que de deformer la mise en page du formulaire
 * en dessous.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  push: (variant, message) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, variant, message }] }));

    const duration = variant === 'error' ? 6000 : 3500;
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message),
  info: (message: string) => useToastStore.getState().push('info', message),
};
