import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapLegend } from '@/components/tracking/MapLegend';
import { FleetMap } from '@/components/tracking/FleetMap';
import { trackingApi } from '@/api/endpoints';

const DOUALA_CENTER = { lat: 4.0511, lng: 9.7679 };
const OFFLINE_THRESHOLD_MS = 30 * 60 * 1000;

/**
 * Mini carte d'accueil — meme pile OpenStreetMap/OpenLayers que la
 * Carte GPS complete, en plus petit, figee (pas de zoom/pan) et sans
 * recherche. Tant qu'aucun boitier n'est configure, currentPositions()
 * renvoie une liste vide : la carte s'affiche quand meme, simplement
 * sans marqueur, plutot que de masquer le composant ou d'inventer des
 * positions.
 */
export function FleetMiniMap() {
  const { t } = useTranslation();
  const { data: positions } = useQuery({
    queryKey: ['tracking', 'current'],
    queryFn: trackingApi.currentPositions,
  });
  const { data: stats } = useQuery({
    queryKey: ['tracking', 'stats'],
    queryFn: trackingApi.stats,
    refetchInterval: 30_000,
  });

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-surface-border px-5 py-4 dark:border-slate-800">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('fleetMiniMap.title')}</h2>
        <Link to="/carte" className="text-sm font-medium text-accent hover:underline">
          {t('fleetMiniMap.viewFullMap')}
        </Link>
      </div>

      <div className="relative h-72">
        <FleetMap
          positions={positions ?? []}
          center={DOUALA_CENTER}
          zoom={6}
          interactive={false}
          offlineThresholdMs={OFFLINE_THRESHOLD_MS}
        />

        {(positions?.length ?? 0) === 0 && (
          <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-white/60 dark:bg-slate-900/60">
            <p className="rounded-lg bg-white px-4 py-2.5 text-sm text-slate-500 shadow-card dark:bg-slate-800 dark:text-slate-400">
              {t('fleetMiniMap.noDevice')}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-surface-border p-3 dark:border-slate-800">
        <MapLegend stats={stats} />
      </div>
    </div>
  );
}
