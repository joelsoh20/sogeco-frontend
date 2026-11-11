import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

interface GoogleEmbedMapProps {
  center: { lat: number; lng: number };
  zoom: number;
}

/**
 * Vue Google Maps via l'Embed API (simple iframe) : jamais facturee a l'usage,
 * contrairement a la Maps JavaScript API. Contrepartie assumee : pas de
 * marqueurs de camions ni d'interaction cote application, juste la carte
 * Google elle-meme, centree sur la flotte. La position live reste reservee
 * au mode OpenStreetMap/OpenLayers.
 */
export function GoogleEmbedMap({ center, zoom }: GoogleEmbedMapProps) {
  const { t } = useTranslation();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-xl border border-surface-border bg-white px-6 py-5 text-center shadow-card dark:border-slate-800 dark:bg-slate-900">
          <AlertTriangle size={20} className="text-amber-500" />
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('trackingPage.googleMapsMissingKeyTitle')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('trackingPage.googleMapsMissingKeyHint')}</p>
        </div>
      </div>
    );
  }

  const src = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${center.lat},${center.lng}&zoom=${zoom}`;

  return (
    <iframe
      title="Google Maps"
      src={src}
      className="h-full w-full border-0"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  );
}
