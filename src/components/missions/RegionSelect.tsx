import { useTranslation } from 'react-i18next';

/** Regions dans lesquelles on peut chercher un lieu de depart ou de livraison. */
export const SELECTABLE_REGIONS = ['Littoral', 'Ouest', 'Centre', 'Sud', 'Nord-Ouest'];

interface RegionSelectProps {
  label: string;
  value: string;
  onChange: (region: string) => void;
}

/**
 * Choix de la region : la recherche de lieux (depart, arrivee) reste limitee a la region choisie,
 * la ville etant deduite du lieu trouve (creee dans le referentiel si elle n'y figure pas encore).
 */
export function RegionSelect({ label, value, onChange }: RegionSelectProps) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('common.selectPlaceholder')}</option>
        {SELECTABLE_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
      </select>
    </div>
  );
}
