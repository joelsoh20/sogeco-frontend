import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatFcfa } from '@/lib/utils';
import type { AgencyProfitability } from '@/types/compliance';

const COLORS = ['#1E5EFF', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#64748B'];

/** Repartition du benefice par site — meme construction que les autres donuts de l'application. */
export function AgencyProfitabilityDonut({ agencies }: { agencies: AgencyProfitability[] }) {
  const { t } = useTranslation();
  const sorted = [...agencies].filter((a) => a.totalMargin > 0).sort((a, b) => b.totalMargin - a.totalMargin);

  if (sorted.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{t('monthlyCostBar.empty')}</p>;
  }

  const total = sorted.reduce((sum, a) => sum + a.totalMargin, 0);
  const data = sorted.map((a) => ({
    label: a.agencyName,
    amount: a.totalMargin,
    sharePercent: total > 0 ? Math.round((a.totalMargin / total) * 1000) / 10 : 0,
  }));

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="label" innerRadius={40} outerRadius={65} paddingAngle={2}>
            {data.map((row, index) => (
              <Cell key={row.label} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, _name, item) => [formatFcfa(value), item.payload.label]} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="space-y-2 text-sm">
        {data.map((row, index) => (
          <li key={row.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="truncate text-slate-600 dark:text-slate-400">{row.label}</span>
            <span className="ml-auto shrink-0 tabular font-medium text-slate-800 dark:text-slate-200">
              {formatFcfa(row.amount)} ({row.sharePercent}%)
            </span>
          </li>
        ))}
        <li className="flex items-center gap-2 border-t border-surface-border pt-2 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">{t('common.total')}</span>
          <span className="ml-auto tabular font-semibold text-slate-900 dark:text-slate-100">{formatFcfa(total)}</span>
        </li>
      </ul>
    </div>
  );
}
