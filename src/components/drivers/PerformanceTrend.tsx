import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { PerformancePoint } from '@/types/driver-performance';
import { formatDate } from '@/lib/utils';

/** Courbe d'evolution du score mensuel — vide si moins de deux points, une droite ne dit rien. */
export function PerformanceTrend({ points }: { points: PerformancePoint[] }) {
  const { t } = useTranslation();
  if (points.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        {t('performanceTrend.notEnoughHistory')}
      </p>
    );
  }

  const data = points.map((p) => ({ month: formatDate(p.periodMonth), score: p.score }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E8EF" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} />
        <Tooltip formatter={(value: number) => [`${value}/100`, t('performanceTrend.score')]} />
        <Line type="monotone" dataKey="score" stroke="#1E5EFF" strokeWidth={2}
              dot={{ r: 3, fill: '#1E5EFF' }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
