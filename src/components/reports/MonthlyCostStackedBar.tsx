import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COST_CATEGORY_COLORS, COST_CATEGORIES } from './CostCategoryLabels';
import { formatDate, formatFcfa, formatFcfaCompact } from '@/lib/utils';
import type { MonthlyFinancialPoint } from '@/types/compliance';

/** Couts par periode : meme repartition que le donut "Repartition des couts", mais mois par mois. */
export function MonthlyCostStackedBar({ points }: { points: MonthlyFinancialPoint[] }) {
  const { t } = useTranslation();
  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">{t('monthlyCostBar.empty')}</p>;
  }

  const data = points.map((p) => {
    const row: Record<string, string | number> = { month: formatDate(p.month) };
    for (const cat of COST_CATEGORIES) {
      row[t(`status.costCategory.${cat}`)] = p.categories.find((c) => c.category === cat)?.amount ?? 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E8EF" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => formatFcfaCompact(v)} />
        <Tooltip formatter={(value: number) => formatFcfa(value)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {COST_CATEGORIES.map((cat) => (
          <Bar key={cat} dataKey={t(`status.costCategory.${cat}`)} stackId="cost" fill={COST_CATEGORY_COLORS[cat]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
