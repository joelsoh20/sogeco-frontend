import { useTranslation } from 'react-i18next';
import { AlertOctagon } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { DeadlineItem } from '@/types/compliance';

interface ExpiredDocumentsPanelProps {
  /** Echeancier : seules les lignes au statut EXPIRE sont affichees. */
  items: DeadlineItem[];
  /** Ouvre l'onglet du document concerne. */
  onItemClick: (item: DeadlineItem) => void;
}

/**
 * Notification des documents expires : assurance, visite technique, cartes, licence de transport, permis.
 * Chaque ligne donne le camion (ou la flotte / le chauffeur), le document, sa date et le retard.
 * Invisible tant que rien n'est expire. Les memes cas sont aussi notifies par une alerte quotidienne
 * (cloche et page Alertes) pour les profils qui y ont acces.
 */
export function ExpiredDocumentsPanel({ items, onItemClick }: ExpiredDocumentsPanelProps) {
  const { t } = useTranslation();
  const expired = items.filter((i) => i.status === 'EXPIRE');

  if (expired.length === 0) {
    return null;
  }

  return (
    <div className="card overflow-hidden border-red-200 dark:border-red-500/30">
      <div className="flex items-center gap-2.5 border-b border-surface-border bg-red-50 px-5 py-3.5 dark:bg-red-500/10">
        <AlertOctagon size={18} className="shrink-0 text-red-600 dark:text-red-400" />
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('expiredDocuments.title')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('expiredDocuments.subtitle', { count: expired.length })}</p>
        </div>
      </div>
      <ul className="divide-y divide-surface-border dark:divide-slate-800">
        {expired.map((item) => (
          <li
            key={`${item.category}-${item.entityId}-${item.documentLabel}`}
            onClick={() => onItemClick(item)}
            className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                {item.entityLabel} <span className="font-normal text-slate-500 dark:text-slate-400">— {item.documentLabel}</span>
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {t('expiredDocuments.dueOn', { date: formatDate(item.dueDate) })}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-400">
              {t('expiredDocuments.daysLate', { count: Math.abs(item.daysRemaining) })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
