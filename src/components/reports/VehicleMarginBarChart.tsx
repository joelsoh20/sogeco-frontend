import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatFcfa, formatFcfaCompact } from '@/lib/utils';
import type { VehicleProfitability } from '@/types/compliance';

/** Benefice net (apres maintenance) par camion, tri du plus au moins rentable. */
export function VehicleMarginBarChart({ vehicles }: { vehicles: VehicleProfitability[] }) {
  const { t } = useTranslation();
  if (vehicles.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">{t('monthlyCostBar.empty')}</p>;
  }

  const data = [...vehicles]
    .sort((a, b) => b.netMargin - a.netMargin)
    .map((v) => ({ camion: v.registrationNumber, margin: v.netMargin }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E8EF" />
        <XAxis dataKey="camion" tick={{ fontSize: 11, fill: '#64748B' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => formatFcfaCompact(v)} />
        <Tooltip formatter={(value: number) => [formatFcfa(value), t('vehicleMarginBar.netMargin')]} />
        <Bar dataKey="margin" radius={[6, 6, 0, 0]}>
          {data.map((row) => (
            <Cell key={row.camion} fill={row.margin >= 0 ? '#1E5EFF' : '#DC2626'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
