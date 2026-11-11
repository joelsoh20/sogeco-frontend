import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Phone, Truck, X } from 'lucide-react';
import { fuelApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { TrackHistoryDrawer } from './TrackHistoryDrawer';
import type { LivePosition, MotionKind, MotionState } from '@/types/api';
import { VehicleStatusBadge } from '@/components/ui/StatusBadge';
import { DetailRow } from '@/components/ui/Drawer';
import { formatAge, formatKm, formatNumber } from '@/lib/utils';
import { fadeInUp } from '@/lib/motion';

interface VehiclePanelProps {
  position: LivePosition | null;
  motionState?: MotionState | null;
  onClose: () => void;
}

/**
 * Panneau flottant de detail, ouvert au clic sur un marqueur.
 *
 * Reste monte en permanence (position peut etre null) : c'est ce qui
 * permet a AnimatePresence de jouer l'animation de sortie — un simple
 * rendu conditionnel cote parent retirerait l'element avant que la
 * transition n'ait la moindre chance de s'executer.
 */
const MOTION_STYLE: Record<MotionKind, string> = {
  EN_MOUVEMENT: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  STATIONNE: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400',
  GARE: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-700/40 dark:text-slate-300',
  HORS_LIGNE: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400',
  INCONNU: 'bg-slate-50 text-slate-500 ring-slate-400/20 dark:bg-slate-800 dark:text-slate-400',
};

/** Duree lisible : « 45 min », « 2 h 15 », « 3 j 4 h ». */
function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 1) return "moins d'une minute";
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`;
  return `${Math.floor(m / 1440)} j${Math.floor((m % 1440) / 60) ? ` ${Math.floor((m % 1440) / 60)} h` : ''}`;
}

/** Heure de debut : « 14:32 » le jour meme, « 09/11 à 14:32 » sinon. */
function formatSince(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? time
    : `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${time}`;
}

/** Seuil d'arret par defaut (km/h), comme le reglage serveur telematics.idle_speed_kmh. */
const IDLE_SPEED_KMH = 3;

function deriveMotion(position: LivePosition): MotionKind {
  if (!position.gpsTracked) return 'INCONNU';
  if (!position.recordedAt || Date.now() - new Date(position.recordedAt).getTime() > 30 * 60 * 1000) return 'HORS_LIGNE';
  if ((position.speedKmh ?? 0) > IDLE_SPEED_KMH) return 'EN_MOUVEMENT';
  return position.ignitionOn === false ? 'GARE' : 'STATIONNE';
}

export function VehiclePanel({ position, motionState, onClose }: VehiclePanelProps) {
  const { t } = useTranslation();
  const canSeeHistory = useAuthStore((state) => state.hasPermission('TRACKING_HISTORY_READ'));
  const [historyOpen, setHistoryOpen] = useState(false);

  // Sans jauge physique (cas de la plupart des camions), le niveau est estime cote serveur
  // (pleins + distance GPS), comme sur la fiche du camion.
  const needsEstimate = position !== null && position.fuelLevelPercent == null;
  const tankLevel = useQuery({
    queryKey: ['fuel', 'tank-level', position?.vehicleId],
    queryFn: () => fuelApi.tankLevel(position!.vehicleId),
    enabled: needsEstimate,
    staleTime: 60_000,
  });
  const estimate = needsEstimate && tankLevel.data?.source !== 'INDISPONIBLE' ? tankLevel.data : undefined;
  const fuelText = position === null ? '' : position.fuelLevelPercent != null
    ? `${formatNumber(position.fuelLevelPercent, 0)} %`
    : estimate?.estimatedFuelPercent != null
      ? `≈ ${formatNumber(estimate.estimatedFuelPercent, 0)} %`
      : estimate?.estimatedFuelLiters != null
        ? `≈ ${formatNumber(estimate.estimatedFuelLiters, 0)} L`
        : null;
  return (
    <>
    <AnimatePresence>
      {position && !historyOpen && (
        <motion.div
          key={position.vehicleId}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="absolute bottom-3 left-3 z-[400] max-h-[calc(100%-5.5rem)] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-surface-border bg-white/95 shadow-panel backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-900/95 sm:bottom-6 sm:left-6 sm:max-w-[calc(100vw-3rem)]"
        >
          <div className="flex items-start gap-3 border-b border-surface-border px-4 py-3.5 dark:border-slate-800">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent dark:bg-accent/15">
              <Truck size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{position.registrationNumber}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <VehicleStatusBadge status={position.status} />
                {(() => {
                  const kind = motionState?.state ?? deriveMotion(position);
                  return (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${MOTION_STYLE[kind]}`}>
                      {t(`vehiclePanel.motionShort.${kind}`)}
                    </span>
                  );
                })()}
                {!position.gpsTracked && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {t('vehiclePanel.approximatePosition')}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-1.5">
            {motionState && (
              <>
                <DetailRow
                  label={t('vehiclePanel.motionState')}
                  value={
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${MOTION_STYLE[motionState.state]}`}>
                      {t(`vehiclePanel.motion.${motionState.state}`)}
                    </span>
                  }
                />
                {motionState.since && (
                  <DetailRow
                    label={t(motionState.state === 'HORS_LIGNE' ? 'vehiclePanel.lastSignalSince' : 'vehiclePanel.since')}
                    value={
                      <span>
                        {motionState.openEnded ? t('vehiclePanel.atLeast') + ' ' : ''}{formatSince(motionState.since)}
                        <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                          ({formatDuration((Date.now() - new Date(motionState.since).getTime()) / 60000)})
                        </span>
                      </span>
                    }
                  />
                )}
              </>
            )}
            <DetailRow label={t('vehiclePanel.speed')} value={`${formatNumber(position.speedKmh, 0)} km/h`} />
            <DetailRow
              label={t('driversPage.colDriver')}
              value={
                position.driverName ? (
                  <span className="flex items-center gap-1.5">
                    {position.driverName}
                    {position.driverName && <Phone size={13} className="text-accent" />}
                  </span>
                ) : '—'
              }
            />
            <DetailRow label={t('missionForm.destination')} value={position.destination ?? t('vehiclePanel.noMission')} />
            <DetailRow label={t('vehiclePanel.kmToday')} value={formatKm(position.dailyKm)} />
            <DetailRow
              label={t('vehiclePanel.fuel')}
              value={fuelText ?? <span className="text-slate-400">{t('vehiclePanel.fuelUnavailable')}</span>}
            />
            <DetailRow
              label={t('vehiclePanel.lastPosition')}
              value={
                !position.recordedAt || Date.now() - new Date(position.recordedAt).getTime() > 30 * 60 * 1000
                  ? <span className="font-medium text-status-alert">{t('dashboard.offline')}</span>
                  : formatAge((Date.now() - new Date(position.recordedAt).getTime()) / 60000)
              }
            />
          </div>

          <div className="space-y-2 border-t border-surface-border px-4 py-3 dark:border-slate-800">
            {canSeeHistory && (
              <button type="button" onClick={() => setHistoryOpen(true)} className="btn-ghost w-full">
                <History size={15} />
                {t('trackHistory.open')}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    {position && (
      <TrackHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)}
        vehicleId={position.vehicleId} registrationNumber={position.registrationNumber} />
    )}
    </>
  );
}
