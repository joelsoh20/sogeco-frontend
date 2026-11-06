import { MapPin, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SiteMapFieldProps {
  label: string;
  /** Nom du site choisi ; vide tant que rien n'a ete clique sur la carte. */
  siteName?: string;
  /** Ce champ est celui que le prochain clic sur un site de la carte va remplir. */
  active: boolean;
  onActivate: () => void;
  onClear: () => void;
  error?: string;
}

/**
 * Site de depart / d'arrivee : renseigne par un clic sur un point de la carte
 * (et non plus par une liste deroulante). Un clic sur ce champ le designe comme
 * cible du prochain clic ; la valeur reelle vit dans un input cache enregistre
 * par le formulaire parent, pour conserver la validation "obligatoire".
 */
export function SiteMapField({ label, siteName, active, onActivate, onClear, error }: SiteMapFieldProps) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="label">{label}</label>
      <div
        className={`input flex items-center gap-2 ${active ? 'ring-2 ring-accent' : ''}`}
      >
        <button
          type="button"
          onClick={onActivate}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <MapPin size={15} className={siteName ? 'shrink-0 text-accent' : 'shrink-0 text-slate-400'} />
          <span className={`truncate ${siteName ? '' : 'text-slate-400'}`}>
            {siteName ?? t('missionForm.pickSiteOnMap')}
          </span>
        </button>
        {siteName && (
          <button
            type="button"
            onClick={onClear}
            aria-label={t('missionForm.clearSite')}
            className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
