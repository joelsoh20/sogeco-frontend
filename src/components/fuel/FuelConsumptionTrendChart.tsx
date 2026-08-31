import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate, formatNumber } from '@/lib/utils';
import type { FuelStats } from '@/types/api';

/** Courbe d'evolution mensuelle des litres consommes, sur les 6 derniers mois. */
export function FuelConsumptionTrendChart({ points }: { points: FuelStats['consommationSixMois'] }) {
  const { t } = useTranslation();
  if (points.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        {t('performanceTrend.notEnoughHistory')}
      </p>
    );
  }

  const data = points.map((p) => ({ month: formatDate(p.month), litres: p.litres }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E8EF" />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
        <Tooltip formatter={(value: number) => [`${formatNumber(value)} L`, t('fuelConsumptionTrend.consumed')]} />
        <Line type="monotone" dataKey="litres" stroke="#1E5EFF" strokeWidth={2}
              dot={false} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
