import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate, formatFcfa, formatFcfaCompact } from '@/lib/utils';
import type { FleetPerformancePoint } from '@/types/compliance';

/** Evolution mensuelle du cout carburant et du cout maintenance, restreinte aux villes d'implantation actives (Douala, Yaoundé, Bafoussam). */
export function FinancialTrendChart({ points }: { points: FleetPerformancePoint[] }) {
  const { t } = useTranslation();
  if (points.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        {t('performanceTrend.notEnoughHistory')}
      </p>
    );
  }

  const fuelLabel = t('status.costCategory.CARBURANT');
  const maintenanceLabel = t('status.costCategory.MAINTENANCE');
  const data = points.map((p) => ({
    month: formatDate(p.month),
    [fuelLabel]: p.fuelCost,
    [maintenanceLabel]: p.maintenanceCost,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E8EF" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => formatFcfaCompact(v)} />
        <Tooltip formatter={(value: number) => formatFcfa(value)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey={fuelLabel} stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey={maintenanceLabel} stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
