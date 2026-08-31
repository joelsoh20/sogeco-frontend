import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatFcfa, formatFcfaCompact } from '@/lib/utils';
import type { VehicleExpenseSummary } from '@/types/compliance';

const MONTH_LABELS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Meme palette que les autres graphiques Rapports, etendue pour plusieurs camions. */
const PALETTE = ['#1E5EFF', '#D97706', '#16A34A', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#65A30D'];

/** Charges mensuelles de chaque camion, une serie par camion. */
export function VehicleExpenseChart({ vehicles }: { vehicles: VehicleExpenseSummary[] }) {
  const { t, i18n } = useTranslation();
  const MONTH_LABELS = i18n.language === 'en' ? MONTH_LABELS_EN : MONTH_LABELS_FR;
  if (vehicles.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">{t('monthlyCostBar.empty')}</p>;
  }

  const data = MONTH_LABELS.map((label, index) => {
    const row: Record<string, string | number> = { month: label };
    for (const v of vehicles) {
      row[v.registrationNumber] = v.monthly.find((m) => m.month === index + 1)?.amount ?? 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E8EF" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => formatFcfaCompact(v)} />
        <Tooltip formatter={(value: number) => formatFcfa(value)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {vehicles.map((v, index) => (
          <Bar key={v.vehicleId} dataKey={v.registrationNumber} fill={PALETTE[index % PALETTE.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
