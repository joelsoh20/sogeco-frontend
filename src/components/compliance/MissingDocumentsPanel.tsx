import { useTranslation } from 'react-i18next';
import { ShieldCheck, Wrench, CreditCard, Car, Stamp, FileWarning, Plus } from 'lucide-react';
import type { MissingDocumentItem } from '@/types/compliance';

const CATEGORY_ICON: Record<MissingDocumentItem['category'], typeof ShieldCheck> = {
  ASSURANCE: ShieldCheck,
  VISITE_TECHNIQUE: Wrench,
  CARTE_BLEUE: CreditCard,
  CARTE_GRISE: Car,
  CARTE_ROSE: Stamp,
};

const CATEGORY_LABEL_KEY: Record<MissingDocumentItem['category'], string> = {
  ASSURANCE: 'missingDocuments.categoryAssurance',
  VISITE_TECHNIQUE: 'missingDocuments.categoryInspection',
  CARTE_BLEUE: 'missingDocuments.categoryCarteBleue',
  CARTE_GRISE: 'missingDocuments.categoryCarteGrise',
  CARTE_ROSE: 'missingDocuments.categoryCarteRose',
};

interface MissingDocumentsPanelProps {
  items: MissingDocumentItem[];
  /** Bascule sur le bon onglet et ouvre le formulaire de creation, camion deja selectionne. */
  onItemClick: (item: MissingDocumentItem) => void;
}

/**
 * Signale les camions actifs n'ayant jamais eu de document d'un type
 * donne — l'echeancier ne peut lister que des documents deja saisis
 * en train d'arriver a echeance, il ne peut donc jamais reveler une
 * absence totale. Invisible tant qu'il n'y a rien a signaler.
 */
export function MissingDocumentsPanel({ items, onItemClick }: MissingDocumentsPanelProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="card overflow-hidden border-amber-200 dark:border-amber-500/30">
      <div className="flex items-center gap-2.5 border-b border-surface-border bg-amber-50 px-5 py-3.5 dark:bg-amber-500/10">
        <FileWarning size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('missingDocuments.title')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('missingDocuments.subtitle', { count: items.length })}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-surface-border">
        {items.map((item) => {
          const Icon = CATEGORY_ICON[item.category];
          return (
            <li
              key={`${item.category}-${item.vehicleId}`}
              onClick={() => onItemClick(item)}
              className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="rounded-lg bg-slate-50 p-2 text-slate-400 dark:bg-slate-800">
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{item.registrationNumber}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{t(CATEGORY_LABEL_KEY[item.category])}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
                <Plus size={13} />
                {t('missingDocuments.add')}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
