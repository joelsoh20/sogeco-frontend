import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { AlertLevel, MissionStatus, VehicleStatus } from '@/types/api';

/**
 * Pastille de statut.
 *
 * Le code couleur est identique partout dans l'application : un camion
 * vert sur la carte est vert dans la liste. Une correspondance
 * incoherente oblige l'utilisateur a reapprendre a chaque ecran.
 *
 * En mode sombre, le motif clair (fond pastel, texte fonce) s'inverse :
 * fond teinte tres sombre, texte clair — un badge pastel sur fond
 * sombre ressortirait comme un bloc trop lumineux, exactement le
 * contraire de la discretion recherchee ici.
 *
 * EN_MISSION et CRITIQUE portent un point qui respire — anneau CSS pur
 * (voir tailwind.config.js, keyframe pulse-ring), pas une animation
 * pilotee par Motion : un tableau peut afficher des dizaines de ces
 * badges a la fois, et une animation purement CSS ne coute rien au
 * fil JavaScript, contrairement a des dizaines d'instances animees.
 */

const VEHICLE_STYLES: Record<VehicleStatus, { className: string; live?: boolean }> = {
  DISPONIBLE:     { className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30' },
  EN_MISSION:     { className: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30', live: true },
  EN_MAINTENANCE: { className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/30' },
  EN_PANNE:       { className: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30' },
  HORS_SERVICE:   { className: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30' },
};

const MISSION_STYLES: Record<MissionStatus, { className: string; live?: boolean }> = {
  EN_ATTENTE: { className: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30' },
  EN_COURS:   { className: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30', live: true },
  TERMINEE:   { className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30' },
  ANNULEE:    { className: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30' },
};

const ALERT_STYLES: Record<AlertLevel, { className: string; live?: boolean }> = {
  CRITIQUE:    { className: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30', live: true },
  IMPORTANT:   { className: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30' },
  MINEUR:      { className: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30' },
  INFORMATION: { className: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30' },
};

const BASE = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';

/** Point qui respire, pour un statut "en cours" — CSS pur, cout nul en JS. */
function LiveDot({ colorClassName }: { colorClassName: string }) {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className={cn('absolute inline-flex h-full w-full animate-pulse-ring rounded-full', colorClassName)} />
      <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', colorClassName)} />
    </span>
  );
}

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const { t } = useTranslation();
  const style = VEHICLE_STYLES[status];
  return (
    <span className={cn(BASE, style.className)}>
      {style.live && <LiveDot colorClassName="bg-blue-600 dark:bg-blue-400" />}
      {t(`status.vehicle.${status}`)}
    </span>
  );
}

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  const { t } = useTranslation();
  const style = MISSION_STYLES[status];
  return (
    <span className={cn(BASE, style.className)}>
      {style.live && <LiveDot colorClassName="bg-blue-600 dark:bg-blue-400" />}
      {t(`status.mission.${status}`)}
    </span>
  );
}

export function AlertLevelBadge({ level }: { level: AlertLevel }) {
  const { t } = useTranslation();
  const style = ALERT_STYLES[level];
  return (
    <span className={cn(BASE, style.className)}>
      {style.live && <LiveDot colorClassName="bg-red-600 dark:bg-red-400" />}
      {t(`status.alertLevel.${level}`)}
    </span>
  );
}
