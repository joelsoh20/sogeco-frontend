import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatFcfa, formatFcfaCompact } from '@/lib/utils';
import type { CityExpenseSummary } from '@/types/compliance';

const MONTH_LABELS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Meme palette que les autres graphiques Rapports, etendue pour plusieurs villes. */
const PALETTE = ['#1E5EFF', '#D97706', '#16A34A', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#65A30D'];

/** Charges mensuelles cumulees par ville d'affectation des camions, une serie par ville. */
export function CityExpenseChart({ cities }: { cities: CityExpenseSummary[] }) {
  const { t, i18n } = useTranslation();
  const MONTH_LABELS = i18n.language === 'en' ? MONTH_LABELS_EN : MONTH_LABELS_FR;
  if (cities.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-400">{t('monthlyCostBar.empty')}</p>;
  }

  const data = MONTH_LABELS.map((label, index) => {
    const row: Record<string, string | number> = { month: label };
    for (const c of cities) {
      row[c.cityName] = c.monthly.find((m) => m.month === index + 1)?.amount ?? 0;
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
        {cities.map((c, index) => (
          <Bar key={c.cityId} dataKey={c.cityName} fill={PALETTE[index % PALETTE.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
