import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import type { TrackingStats } from '@/types/api';
import { formatNumber } from '@/lib/utils';
import { fadeInUp } from '@/lib/motion';

export function MapLegend({ stats }: { stats?: TrackingStats }) {
  const { t } = useTranslation();
  const items = [
    { label: t('dashboard.moving'), value: stats?.enMouvement, dot: 'bg-status-moving', tint: 'bg-status-moving/10 dark:bg-status-moving/15' },
    { label: t('dashboard.idle'), value: stats?.aLArret, dot: 'bg-status-idle', tint: 'bg-status-idle/10 dark:bg-status-idle/15' },
    { label: t('dashboard.inMaintenance'), value: stats?.enMaintenance, dot: 'bg-status-maintenance', tint: 'bg-status-maintenance/10 dark:bg-status-maintenance/15' },
    { label: t('dashboard.offline'), value: stats?.horsLigne, dot: 'bg-status-offline', tint: 'bg-status-offline/10 dark:bg-status-offline/15' },
  ];

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-surface-border bg-white/90 px-2.5 py-2 shadow-card backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-900/90 sm:gap-1.5 sm:px-3"
    >
      {items.map((item) => (
        <div key={item.label} className={`flex items-center gap-1 rounded-lg px-1.5 py-1 sm:gap-1.5 sm:px-2 ${item.tint}`}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
          <span className="whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-300 sm:text-xs">{item.label}</span>
          <span className="tabular text-[11px] font-semibold text-slate-900 dark:text-slate-50 sm:text-xs">{formatNumber(item.value)}</span>
        </div>
      ))}
      <div className="ml-1 whitespace-nowrap border-l border-surface-border pl-2 text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500 sm:pl-3 sm:text-xs">
        {t('common.total')} : <span className="font-semibold text-slate-600 dark:text-slate-300">{formatNumber(stats?.total)}</span>
      </div>
    </motion.div>
  );
}
