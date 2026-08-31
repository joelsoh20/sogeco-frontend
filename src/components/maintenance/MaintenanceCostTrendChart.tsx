import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate, formatFcfa, formatFcfaCompact } from '@/lib/utils';
import type { MaintenanceStats } from '@/types/api';

/** Courbe d'evolution quotidienne des couts de maintenance sur la periode. */
export function MaintenanceCostTrendChart({ points }: { points: MaintenanceStats['tendanceCouts'] }) {
  const { t } = useTranslation();
  if (points.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        {t('performanceTrend.notEnoughHistory')}
      </p>
    );
  }

  const data = points.map((p) => ({ date: formatDate(p.date), amount: p.amount }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E8EF" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => formatFcfaCompact(v)} />
        <Tooltip formatter={(value: number) => [formatFcfa(value), t('maintenanceCostTrend.cost')]} />
        <Line type="monotone" dataKey="amount" stroke="#D97706" strokeWidth={2}
              dot={false} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
