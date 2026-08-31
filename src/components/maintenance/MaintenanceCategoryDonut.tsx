import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import { CATEGORY_COLORS } from './MaintenanceBadges';
import { formatFcfa } from '@/lib/utils';
import type { MaintenanceStats } from '@/types/api';

interface MaintenanceCategoryDonutProps {
  breakdown: MaintenanceStats['repartitionParCategorie'];
  total: number;
}

/** Repartition des couts de maintenance par categorie, en anneau — meme construction que RatingDonut cote chauffeurs. */
export function MaintenanceCategoryDonut({ breakdown, total }: MaintenanceCategoryDonutProps) {
  const { t } = useTranslation();
  const data = breakdown.filter((row) => row.amount > 0);

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{t('maintenancePage.emptyPeriod')}</p>;
  }

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="category" innerRadius={40} outerRadius={65} paddingAngle={2}>
            {data.map((row) => (
              <Cell key={row.category} fill={CATEGORY_COLORS[row.category]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, _name, item) => [formatFcfa(value), t(`status.maintenanceCategory.${item.payload.category}`)]} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="space-y-2 text-sm">
        {data.map((row) => (
          <li key={row.category} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[row.category] }} />
            <span className="text-slate-600 dark:text-slate-400">{t(`status.maintenanceCategory.${row.category}`)}</span>
            <span className="ml-auto tabular font-medium text-slate-800 dark:text-slate-200">
              {formatFcfa(row.amount)} ({row.sharePercent}%)
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2 border-t border-surface-border pt-2 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">{t('reportsPage.colTotal')}</span>
          <span className="ml-auto tabular font-semibold text-slate-900 dark:text-slate-100">{formatFcfa(total)}</span>
        </li>
      </ul>
    </div>
  );
}
