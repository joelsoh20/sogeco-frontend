import { formatFcfa } from '@/lib/utils';

/** Marge en couleur : verte positive, rouge negative — lisible d'un coup d'oeil sur un tableau dense. */
export function MarginCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  return (
    <span className={value >= 0 ? 'text-emerald-600' : 'text-red-600'}>
      {formatFcfa(value)}
    </span>
  );
}
