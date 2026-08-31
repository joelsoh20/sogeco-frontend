import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { Navigation, Phone, Truck, X } from 'lucide-react';
import type { LivePosition } from '@/types/api';
import { VehicleStatusBadge } from '@/components/ui/StatusBadge';
import { DetailRow } from '@/components/ui/Drawer';
import { formatAge, formatKm, formatNumber } from '@/lib/utils';
import { fadeInUp } from '@/lib/motion';

interface VehiclePanelProps {
  position: LivePosition | null;
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
export function VehiclePanel({ position, onClose }: VehiclePanelProps) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {position && (
        <motion.div
          key={position.vehicleId}
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="absolute bottom-6 left-6 z-[400] w-80 overflow-hidden rounded-2xl border border-surface-border bg-white/95 shadow-panel backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-900/95"
        >
          <div className="flex items-start gap-3 border-b border-surface-border px-4 py-3.5 dark:border-slate-800">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent dark:bg-accent/15">
              <Truck size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{position.registrationNumber}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <VehicleStatusBadge status={position.status} />
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
            {position.fuelLevelPercent !== null && (
              <DetailRow label={t('vehiclePanel.fuel')} value={`${formatNumber(position.fuelLevelPercent, 0)} %`} />
            )}
            <DetailRow
              label={t('vehiclePanel.lastPosition')}
              value={
                !position.recordedAt || Date.now() - new Date(position.recordedAt).getTime() > 30 * 60 * 1000
                  ? <span className="font-medium text-status-alert">{t('dashboard.offline')}</span>
                  : formatAge((Date.now() - new Date(position.recordedAt).getTime()) / 60000)
              }
            />
          </div>

          <div className="border-t border-surface-border px-4 py-3 dark:border-slate-800">
            <a
              href={`https://www.google.com/maps?q=${position.latitude},${position.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost w-full"
            >
              <Navigation size={15} />
              {t('vehiclePanel.viewOnGoogleMaps')}
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
