import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { MaintenanceCategory, MaintenanceStatus } from '@/types/api';

export const CATEGORIES: MaintenanceCategory[] = [
  'ENTRETIEN_PREVENTIF', 'REPARATION_MECANIQUE', 'PNEUMATIQUE', 'ELECTRICITE', 'LAVERIE', 'AUTRES',
];

export const STATUSES: MaintenanceStatus[] = ['PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

/** Meme palette que les autres graphiques de l'ecran (donut, coherente avec le badge). */
export const CATEGORY_COLORS: Record<MaintenanceCategory, string> = {
  ENTRETIEN_PREVENTIF: '#1E5EFF',
  REPARATION_MECANIQUE: '#16A34A',
  PNEUMATIQUE: '#D97706',
  ELECTRICITE: '#DC2626',
  LAVERIE: '#0891B2',
  AUTRES: '#64748B',
};

const CATEGORY_STYLES: Record<MaintenanceCategory, string> = {
  ENTRETIEN_PREVENTIF: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30',
  REPARATION_MECANIQUE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30',
  PNEUMATIQUE: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30',
  ELECTRICITE: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/30',
  LAVERIE: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-500/10 dark:text-cyan-400 dark:ring-cyan-500/30',
  AUTRES: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30',
};

const STATUS_STYLES: Record<MaintenanceStatus, { className: string; live?: boolean }> = {
  PLANIFIEE: { className: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30' },
  EN_COURS: { className: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/30', live: true },
  TERMINEE: { className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30' },
  ANNULEE: { className: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/30' },
};

const BASE = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';

export function MaintenanceCategoryBadge({ category }: { category: MaintenanceCategory }) {
  const { t } = useTranslation();
  return <span className={cn(BASE, CATEGORY_STYLES[category])}>{t(`status.maintenanceCategory.${category}`)}</span>;
}

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  const { t } = useTranslation();
  const style = STATUS_STYLES[status];
  return (
    <span className={cn(BASE, style.className)}>
      {style.live && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-blue-600 dark:bg-blue-400" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
        </span>
      )}
      {t(`status.maintenanceStatus.${status}`)}
    </span>
  );
}
