import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { PlaceSearchField } from './PlaceSearchField';
import type { PlaceSuggestion } from '@/types/api';

/** Point de livraison supplementaire ; `place` reste vide tant que le lieu n'est pas choisi. */
export interface StopDraft {
  key: number;
  place: PlaceSuggestion | null;
}

interface ExtraStopsFieldProps {
  stops: StopDraft[];
  onChange: (stops: StopDraft[]) => void;
  scope?: { city?: string; region?: string | null; lat?: number | null; lng?: number | null };
  disabledHint?: string;
}

/**
 * Livraison a plusieurs points : le bouton « + » ajoute un point de passage entre le depart
 * et l'arrivee ; chaque point se cherche comme un lieu de livraison et peut etre retire.
 */
export function ExtraStopsField({ stops, onChange, scope, disabledHint }: ExtraStopsFieldProps) {
  const { t } = useTranslation();

  const add = () => onChange([...stops, { key: Date.now() + stops.length, place: null }]);
  const update = (key: number, place: PlaceSuggestion | null) =>
    onChange(stops.map((s) => (s.key === key ? { ...s, place } : s)));
  const remove = (key: number) => onChange(stops.filter((s) => s.key !== key));

  return (
    <div className="space-y-3">
      {stops.map((stop, index) => (
        <div key={stop.key} className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <PlaceSearchField
              label={t('missionForm.extraStop', { n: index + 1 })}
              scope={scope}
              disabledHint={disabledHint}
              value={stop.place?.placeName || stop.place?.label}
              onSelect={(p) => update(stop.key, p)}
              onClear={() => update(stop.key, null)}
            />
          </div>
          <button type="button" onClick={() => remove(stop.key)} aria-label={t('missionForm.removeStop')}
            className="btn-ghost mb-px px-2.5 py-2 text-slate-500">
            <X size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} disabled={stops.length >= 20} className="btn-ghost py-1 text-xs">
        <Plus size={14} />
        {t('missionForm.addStop')}
      </button>
      {stops.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('missionForm.addStopHint')}</p>
      )}
    </div>
  );
}
