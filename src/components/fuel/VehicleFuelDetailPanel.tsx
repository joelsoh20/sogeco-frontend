import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Truck } from 'lucide-react';
import { DetailRow } from '@/components/ui/Drawer';
import { VehicleStatusBadge } from '@/components/ui/StatusBadge';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { fuelApi, vehicleApi } from '@/api/endpoints';
import { cn, formatConsumption, formatDate, formatFcfa, formatKm, formatNumber, fuelLevelColor } from '@/lib/utils';
import type { FuelStats } from '@/types/api';

interface VehicleFuelDetailPanelProps {
  vehicleId: number;
  breakdown?: FuelStats['repartitionParCamion'][number];
}

/**
 * Detail carburant d'un vehicule — deux points d'entree : clic sur une
 * ligne de plein, ou clic dans la liste "Vehicules par ville". La
 * courbe "Consommation (12 derniers mois)" vient de l'historique reel
 * des pleins de ce vehicule (fuel-logs/vehicle/{id}), filtre cote
 * client sur un an glissant — a la difference de la courbe flotte
 * entiere de la maquette, pour laquelle aucun agregat mensuel par
 * vehicule n'existe cote backend.
 */
export function VehicleFuelDetailPanel({ vehicleId, breakdown }: VehicleFuelDetailPanelProps) {
  const { t } = useTranslation();
  const vehicle = useQuery({ queryKey: ['vehicles', 'detail', vehicleId], queryFn: () => vehicleApi.get(vehicleId) });
  const history = useQuery({ queryKey: ['fuel', 'for-vehicle', vehicleId], queryFn: () => fuelApi.forVehicle(vehicleId) });

  if (vehicle.isLoading) {
    return <LoadingPanel />;
  }
  if (!vehicle.data) {
    return <p className="py-8 text-center text-sm text-slate-400">{t('vehicleFuelDetail.notFound')}</p>;
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const consumptionData = (history.data ?? [])
    .filter((log) => log.computedConsumption !== null && new Date(log.fuelDatetime) >= oneYearAgo)
    .slice()
    .reverse()
    .map((log) => ({ date: formatDate(log.fuelDatetime), consommation: log.computedConsumption! }));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
        <div className="rounded-lg bg-white p-2 text-slate-400 shadow-sm dark:bg-slate-900 dark:text-slate-500">
          <Truck size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
            {vehicle.data.brand} {vehicle.data.model}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{vehicle.data.registrationNumber}</p>
        </div>
        <VehicleStatusBadge status={vehicle.data.status} />
      </div>

      {vehicle.data.fuelLevelPercent !== null && (
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">{t('vehicleFuelDetail.fuelLevel')}</span>
            <span className="tabular font-medium text-slate-700 dark:text-slate-300">{formatNumber(vehicle.data.fuelLevelPercent, 0)}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={cn('h-full', fuelLevelColor(vehicle.data.fuelLevelPercent))}
              style={{ width: `${Math.min(vehicle.data.fuelLevelPercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div>
        <DetailRow label={t('vehicleDetail.mileage')} value={formatKm(vehicle.data.currentKilometers)} />
        {breakdown && (
          <>
            <DetailRow label={t('vehicleFuelDetail.periodCost')} value={formatFcfa(breakdown.cout)} />
            <DetailRow label={t('vehicleFuelDetail.periodLiters')} value={`${formatNumber(breakdown.litres)} L`} />
            <DetailRow label={t('vehicleFuelDetail.averageConsumption')} value={formatConsumption(breakdown.consommationMoyenne)} />
            <DetailRow label={t('vehicleFuelDetail.fleetCostShare')} value={`${formatNumber(breakdown.partPourcent, 1)} %`} />
          </>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('vehicleFuelDetail.consumptionChartTitle')}
        </p>
        {history.isLoading ? (
          <LoadingPanel />
        ) : consumptionData.length === 0 ? (
          <EmptyState icon={Truck} title={t('vehicleFuelDetail.notEnoughFillUps')} />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={consumptionData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E8EF" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip formatter={(value: number) => [`${value} L/100km`, t('fuelEconomyTop5.consumption')]} />
              <Bar dataKey="consommation" fill="#1E5EFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
