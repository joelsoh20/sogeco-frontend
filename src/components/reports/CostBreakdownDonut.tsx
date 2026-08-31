import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { COST_CATEGORY_COLORS } from './CostCategoryLabels';
import { formatFcfa } from '@/lib/utils';
import type { CostBreakdown } from '@/types/compliance';

/** Repartition du cout total par categorie — memes montants que le "Cout total" affiche ailleurs, decompose. */
export function CostBreakdownDonut({ breakdown }: { breakdown: CostBreakdown }) {
  const { t } = useTranslation();
  const data = breakdown.categories.filter((c) => c.amount > 0);

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{t('vehicleFuelDonut.empty')}</p>;
  }

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="category" innerRadius={40} outerRadius={65} paddingAngle={2}>
            {data.map((row) => (
              <Cell key={row.category} fill={COST_CATEGORY_COLORS[row.category]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, _name, item) => [formatFcfa(value), t(`status.costCategory.${item.payload.category}`)]} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="space-y-2 text-sm">
        {data.map((row) => (
          <li key={row.category} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COST_CATEGORY_COLORS[row.category] }} />
            <span className="text-slate-600 dark:text-slate-400">{t(`status.costCategory.${row.category}`)}</span>
            <span className="ml-auto tabular font-medium text-slate-800 dark:text-slate-200">
              {formatFcfa(row.amount)} ({row.sharePercent}%)
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2 border-t border-surface-border pt-2 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">{t('common.total')}</span>
          <span className="ml-auto tabular font-semibold text-slate-900 dark:text-slate-100">{formatFcfa(breakdown.total)}</span>
        </li>
      </ul>
    </div>
  );
}
