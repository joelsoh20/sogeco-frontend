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
      className="flex flex-wrap items-center gap-1.5 rounded-xl border border-surface-border bg-white/90 px-3 py-2 shadow-card backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-900/90"
    >
      {items.map((item) => (
        <div key={item.label} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${item.tint}`}>
          <span className={`h-2 w-2 rounded-full ${item.dot}`} />
          <span className="text-xs text-slate-600 dark:text-slate-300">{item.label}</span>
          <span className="tabular text-xs font-semibold text-slate-900 dark:text-slate-50">{formatNumber(item.value)}</span>
        </div>
      ))}
      <div className="ml-1 border-l border-surface-border pl-3 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
        {t('common.total')} : <span className="font-semibold text-slate-600 dark:text-slate-300">{formatNumber(stats?.total)}</span>
      </div>
    </motion.div>
  );
}
