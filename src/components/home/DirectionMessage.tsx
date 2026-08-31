import { useTranslation } from 'react-i18next';
import { Quote } from 'lucide-react';

/**
 * Message de la Direction : contenu editorial fixe, pas une donnee
 * metier — rien cote backend ne modelise une "citation du jour", donc
 * rien n'est invente pour la simuler dynamique.
 */
export function DirectionMessage() {
  const { t } = useTranslation();
  return (
    <div className="card-padded bg-navy-900 text-slate-200">
      <Quote size={20} className="text-accent" />
      <p className="mt-3 text-sm italic leading-relaxed text-slate-300">
        {t('directionMessage.quote')}
      </p>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        {t('directionMessage.attribution')}
      </p>
    </div>
  );
}
