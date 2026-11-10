import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { geocodingApi } from '@/api/endpoints';
import type { PlaceSuggestion } from '@/types/api';

interface PlaceSearchFieldProps {
  label: string;
  /** Lieu deja choisi ; vide tant que rien n'est selectionne. */
  value?: string;
  placeholder?: string;
  onSelect: (place: PlaceSuggestion) => void | Promise<void>;
  onClear: () => void;
  error?: string;
}

/**
 * Lieu de depart / d'arrivee saisi au clavier, avec propositions pendant la frappe
 * (facon Google Maps) : l'utilisateur ecrit « Bonaberi » ou « marche Mboppi », choisit
 * une proposition, et le lieu est selectionne — cree dans le referentiel s'il n'y figure
 * pas encore. La valeur reelle reste portee par les champs caches du formulaire parent.
 */
export function PlaceSearchField({ label, value, placeholder, onSelect, onClear, error }: PlaceSearchFieldProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Attend la fin de la frappe : le geocodage public limite le nombre de requetes par seconde.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(text.trim()), 450);
    return () => clearTimeout(id);
  }, [text]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const search = useQuery({
    queryKey: ['geocoding', 'search', debounced],
    queryFn: () => geocodingApi.search(debounced),
    enabled: debounced.length >= 3,
    staleTime: 10 * 60 * 1000,
  });

  const choose = async (place: PlaceSuggestion) => {
    setPicking(true);
    setOpen(false);
    try {
      await onSelect(place);
      setText('');
      setDebounced('');
    } finally {
      setPicking(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <label className="label">{label}</label>
      {value ? (
        <div className="input flex items-center gap-2">
          <MapPin size={15} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate">{value}</span>
          <button type="button" onClick={onClear} aria-label={t('missionForm.clearSite')}
            className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="input flex items-center gap-2">
          {picking ? <Loader2 size={15} className="shrink-0 animate-spin text-slate-400" /> : <Search size={15} className="shrink-0 text-slate-400" />}
          <input
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
            placeholder={placeholder ?? t('missionForm.searchPlace')}
            value={text}
            onChange={(e) => { setText(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
        </div>
      )}

      {!value && open && debounced.length >= 3 && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-surface-border bg-white py-1 shadow-panel dark:border-slate-700 dark:bg-slate-900">
          {search.isFetching && <li className="px-3 py-2 text-xs text-slate-400">{t('missionForm.searching')}</li>}
          {!search.isFetching && (search.data ?? []).length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-400">{t('missionForm.noSearchResult')}</li>
          )}
          {!search.isFetching && (search.data ?? []).map((p, i) => (
            <li key={`${p.latitude}-${p.longitude}-${i}`}>
              <button type="button" onClick={() => choose(p)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                <MapPin size={14} className="shrink-0 text-slate-400" />
                <span className="truncate">{p.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
