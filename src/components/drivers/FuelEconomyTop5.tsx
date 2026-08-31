import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DriverFuelEconomy } from '@/types/driver-performance';
import { EmptyState } from '@/components/ui/EmptyState';
import { Fuel } from 'lucide-react';

/** Classement des chauffeurs les plus economes — trie du plus au moins economique par le backend. */
export function FuelEconomyTop5({ rows }: { rows: DriverFuelEconomy[] }) {
  const { t } = useTranslation();
  if (rows.length === 0) {
    return <EmptyState icon={Fuel} title={t('fuelEconomyTop5.empty')} />;
  }

  const data = rows.map((r) => ({ name: r.driverName.split(' ')[0], consommation: r.averageConsumption }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E8EF" />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} width={70} />
        <Tooltip formatter={(value: number) => [`${value} L/100km`, t('fuelEconomyTop5.consumption')]} />
        <Bar dataKey="consommation" fill="#16A34A" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
