import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { MapLegend } from '@/components/tracking/MapLegend';
import { VehiclePanel } from '@/components/tracking/VehiclePanel';
import { FleetMap } from '@/components/tracking/FleetMap';
import { trackingApi } from '@/api/endpoints';
import { useStompSubscription } from '@/hooks/useWebSocket';
import { fadeInUp } from '@/lib/motion';
import type { LivePosition } from '@/types/api';

/** Centre approximatif de Douala. */
const DOUALA_CENTER = { lat: 4.0511, lng: 9.7679 };
const OFFLINE_THRESHOLD_MS = 30 * 60 * 1000;

/**
 * Carte de suivi en temps reel.
 *
 * Chargement initial via REST, puis mises a jour par WebSocket : la
 * carte affiche des positions immediatement, sans attendre la premiere
 * trame diffusee, et reste a jour ensuite sans reinterroger l'API.
 */
export function TrackingPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [positions, setPositions] = useState<Record<number, LivePosition>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');

  const { data: initial } = useQuery({
    queryKey: ['tracking', 'current'],
    queryFn: trackingApi.currentPositions,
  });

  const { data: stats } = useQuery({
    queryKey: ['tracking', 'stats'],
    queryFn: trackingApi.stats,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (initial) {
      setPositions(Object.fromEntries(initial.map((p) => [p.vehicleId, p])));
    }
  }, [initial]);

  // Diffusion temps reel : chaque position recue met a jour le seul
  // marqueur concerne, sans recharger l'ensemble de la carte. A la
  // (re)connexion, un re-fetch REST rattrape tout ce qui a pu changer
  // pendant une coupure silencieuse du canal.
  useStompSubscription<LivePosition>(
    '/topic/vehicle-positions',
    (position) => {
      setPositions((current) => ({ ...current, [position.vehicleId]: position }));
    },
    true,
    () => queryClient.invalidateQueries({ queryKey: ['tracking', 'current'] }),
  );

  const list = Object.values(positions).filter((p) =>
    p.registrationNumber.toLowerCase().includes(search.toLowerCase())
    || p.driverName?.toLowerCase().includes(search.toLowerCase()),
  );
  const listRef = useRef(list);
  listRef.current = list;

  // Filtrer les marqueurs affiches ne suffit pas a "chercher" : sans
  // recentrer la carte, un resultat deja hors champ reste invisible et la
  // recherche parait ne rien faire. Une fois la frappe stabilisee (350 ms),
  // on recentre sur les resultats (voir FleetMap) et, s'il n'y en a qu'un,
  // on ouvre directement son panneau de detail.
  useEffect(() => {
    const timer = setTimeout(() => {
      setCommittedSearch(search);
      if (search.trim() && listRef.current.length === 1) {
        setSelected(listRef.current[0].vehicleId);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const selectedPosition = selected ? positions[selected] ?? null : null;

  return (
    <PageShell title={t('nav.map')} subtitle={t('trackingPage.subtitle')} flush>
      <div className="relative h-full">
        <FleetMap
          positions={list}
          center={DOUALA_CENTER}
          zoom={12}
          offlineThresholdMs={OFFLINE_THRESHOLD_MS}
          onSelect={setSelected}
          searchTerm={committedSearch}
        />

        {/* Recherche flottante */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="absolute left-6 top-6 z-[400] w-72">
          <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-white/90 px-3 py-2 shadow-card backdrop-blur-sm transition-colors focus-within:border-accent focus-within:ring-1 focus-within:ring-accent dark:border-slate-800 dark:bg-slate-900/90">
            <Search size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('trackingPage.searchPlaceholder')}
              className="flex-1 border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="shrink-0 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {committedSearch.trim() && list.length === 0 && (
            <p className="mt-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs text-slate-500 shadow-card backdrop-blur-sm dark:bg-slate-900/90 dark:text-slate-400">
              {t('trackingPage.noResults', { query: committedSearch })}
            </p>
          )}
        </motion.div>

        {/* Legende */}
        <div className="absolute right-6 top-6 z-[400]">
          <MapLegend stats={stats} />
        </div>

        <VehiclePanel position={selectedPosition} onClose={() => setSelected(null)} />
      </div>
    </PageShell>
  );
}
