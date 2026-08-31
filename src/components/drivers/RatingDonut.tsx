import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface RatingDonutProps {
  distribution: Record<string, number>;
}

const CLASS_COLORS: Record<string, string> = {
  EXCELLENT: '#16A34A',
  BON: '#1E5EFF',
  MOYEN: '#D97706',
  FAIBLE: '#DC2626',
};

/** Repartition des chauffeurs par classe de notation, en anneau. */
export function RatingDonut({ distribution }: RatingDonutProps) {
  const { t } = useTranslation();
  const total = Object.values(distribution).reduce((sum, v) => sum + v, 0);
  const data = Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      key,
      label: t(`ratingDonut.class.${key}`, key),
      value: count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    }));

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{t('ratingDonut.empty')}</p>;
  }

  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={40} outerRadius={65} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={CLASS_COLORS[entry.key] ?? '#94A3B8'} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, _name, item) => [t('ratingDonut.driverCount', { count: value }), item.payload.label]} />
        </PieChart>
      </ResponsiveContainer>

      <ul className="space-y-2 text-sm">
        {data.map((entry) => (
          <li key={entry.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CLASS_COLORS[entry.key] }} />
            <span className="text-slate-600 dark:text-slate-400">{entry.label}</span>
            <span className="ml-auto tabular font-medium text-slate-800 dark:text-slate-200">
              {entry.value} ({entry.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
