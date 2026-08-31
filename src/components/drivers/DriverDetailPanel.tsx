import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Package, Pencil, Truck, Unlink } from 'lucide-react';
import { driverApi, vehicleApi } from '@/api/endpoints';
import { DetailRow } from '@/components/ui/Drawer';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { PerformanceGauge } from './PerformanceGauge';
import { PerformanceTrend } from './PerformanceTrend';
import { DriverActions } from './DriverActions';
import { DriverAlertsFeed } from './DriverAlertsFeed';
import { DriverHistoryPanel } from './DriverHistoryPanel';
import { EditDriverDrawer } from './EditDriverDrawer';
import { AssignVehicleDrawer } from './AssignVehicleDrawer';
import { CreateMissionDrawer } from '@/components/missions/CreateMissionDrawer';
import { LoadingPanel } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/authStore';
import { canEditRecord } from '@/lib/editWindow';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { formatFcfa, formatKm, formatNumber } from '@/lib/utils';
import type { RatingCriterionKey } from '@/types/driver-performance';

const RATING_CRITERIA: RatingCriterionKey[] = [
  'CONDUITE_SECURISEE',
  'CONSOMMATION_ECONOMIQUE',
  'RESPECT_DELAIS',
  'ENTRETIEN_VEHICULE',
  'RESPECT_REGLES',
];

/** Note la plus recente de chaque critere — un chauffeur peut en avoir plusieurs mois d'historique. */
function latestByCriterion(ratings: { criterion: RatingCriterionKey; score100: number; periodMonth: string }[]) {
  const latest = new Map<RatingCriterionKey, { score100: number; periodMonth: string }>();
  for (const rating of ratings) {
    const current = latest.get(rating.criterion);
    if (!current || rating.periodMonth > current.periodMonth) {
      latest.set(rating.criterion, rating);
    }
  }
  return latest;
}

export function DriverDetailPanel({ driverId }: { driverId: number }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canSeeSalary = useAuthStore((state) => state.hasPermission('SALARY_READ'));
  const canUpdate = useAuthStore((state) => state.hasPermission('DRIVER_UPDATE'));
  const canAssignVehicle = useAuthStore((state) => state.hasPermission('VEHICLE_UPDATE'));
  const canCreateMission = useAuthStore((state) => state.hasPermission('MISSION_CREATE'));
  const isAdmin = useAuthStore((state) => state.hasRole('ROLE_ADMIN'));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignVehicleOpen, setAssignVehicleOpen] = useState(false);
  const [assignTripOpen, setAssignTripOpen] = useState(false);

  const detail = useQuery({ queryKey: ['drivers', 'detail', driverId], queryFn: () => driverApi.detail(driverId) });

  const release = useMutation({
    mutationFn: (vehicleId: number) => vehicleApi.releaseAssignment(vehicleId),
    onSuccess: () => {
      toast.success(t('driverDetail.vehicleReleased'));
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const history = useQuery({
    queryKey: ['drivers', 'performance-history', driverId],
    queryFn: () => driverApi.performanceHistory(driverId),
  });
  const alerts = useQuery({ queryKey: ['drivers', 'alerts', driverId], queryFn: () => driverApi.alerts(driverId) });

  if (detail.isLoading || !detail.data) {
    return <LoadingPanel />;
  }

  const driver = detail.data;
  const latestRatings = latestByCriterion(driver.ratings);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <ScoreBadge score={driver.performanceScore} ratingClass={driver.ratingClass} />
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {driver.seniorityLabel ?? '—'}
          </span>
          {canUpdate && canEditRecord(driver.createdAt, isAdmin) && (
            <button onClick={() => setEditOpen(true)} className="btn-ghost py-1 text-xs">
              <Pencil size={13} />
              {t('common.edit')}
            </button>
          )}
        </div>
      </div>

      {/* Cinq jauges de performance, une par critere de notation */}
      {latestRatings.size > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('driverDetail.performanceIndicators')}
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {RATING_CRITERIA.map((key) => {
              const rating = latestRatings.get(key);
              if (!rating) return null;
              return <PerformanceGauge key={key} label={t(`driverDetail.criterion.${key}`)} score={rating.score100} />;
            })}
          </div>
        </div>
      )}

      {/* Affectation camion — standing (RG-9.x) et ponctuelle (mission) */}
      <div className="rounded-lg bg-slate-50 px-3.5 py-3 dark:bg-slate-800/50">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('driverDetail.assignedVehicle')}</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {driver.registrationNumber ?? t('common.none')}
            </p>
          </div>
          {canAssignVehicle && (
            driver.vehicleId ? (
              <button
                onClick={() => release.mutate(driver.vehicleId!)}
                disabled={release.isPending}
                className="btn-ghost py-1 text-xs"
              >
                <Unlink size={13} />
                {t('driverDetail.release')}
              </button>
            ) : (
              <button onClick={() => setAssignVehicleOpen(true)} className="btn-ghost py-1 text-xs">
                <Truck size={13} />
                {t('assignVehicleForm.title')}
              </button>
            )
          )}
        </div>
        {canCreateMission && (
          <button
            onClick={() => setAssignTripOpen(true)}
            className="btn-ghost mt-2 w-full justify-center py-1.5 text-xs"
          >
            <Package size={13} />
            {t('driverDetail.assignForTrip')}
          </button>
        )}
      </div>

      {/* Informations generales */}
      <div>
        <DetailRow label={t('driverDetail.city')} value={driver.cityName ?? '—'} />
        <DetailRow label={t('driverDetail.phone')} value={driver.phone ?? '—'} />
        <DetailRow label={t('driverDetail.completedMissions')} value={formatNumber(driver.totalMissions)} />
        <DetailRow label={t('driverDetail.kmTravelled')} value={formatKm(driver.totalKilometers)} />
        <DetailRow label={t('driverDetail.incidents')} value={formatNumber(driver.incidentsCount)} />
        {driver.licenseDaysRemaining !== null && (
          <DetailRow
            label={t('driverDetail.license')}
            value={
              driver.licenseExpired
                ? <span className="text-red-600 dark:text-red-400">{t('driverDetail.expiredSince', { count: Math.abs(driver.licenseDaysRemaining) })}</span>
                : driver.licenseDaysRemaining < 30
                  ? <span className="text-amber-600 dark:text-amber-400">{t('driverDetail.expiresIn', { count: driver.licenseDaysRemaining })}</span>
                  : t('driverDetail.validFor', { count: driver.licenseDaysRemaining })
            }
          />
        )}
        {canSeeSalary && <DetailRow label={t('driverDetail.currentBonus')} value={formatFcfa(driver.currentBonus)} />}
      </div>

      {driver.performanceScore === null && (
        <div className="rounded-lg bg-slate-50 px-3.5 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {t('driverDetail.noScore')}
        </div>
      )}

      {/* Evolution du score */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('driverDetail.performanceTrend')}
        </p>
        {history.isLoading ? <LoadingPanel /> : <PerformanceTrend points={history.data ?? []} />}
      </div>

      {/* Actions RH */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('driverDetail.actions')}
        </p>
        <DriverActions driverId={driver.id} driverName={driver.fullName} />
      </div>

      {/* Alertes recentes */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('driverDetail.recentAlerts')}
        </p>
        {alerts.isLoading ? <LoadingPanel /> : <DriverAlertsFeed alerts={alerts.data ?? []} />}
      </div>

      {/* Historique complet (actions RH + primes) */}
      <div>
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-accent"
        >
          {t('driverDetail.viewFullHistory')}
          {historyOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {historyOpen && (
          <div className="mt-3">
            <DriverHistoryPanel driverId={driver.id} />
          </div>
        )}
      </div>

      <EditDriverDrawer open={editOpen} onClose={() => setEditOpen(false)} driver={driver} />
      <AssignVehicleDrawer
        open={assignVehicleOpen}
        onClose={() => setAssignVehicleOpen(false)}
        driverId={driver.id}
        driverName={driver.fullName}
      />
      <CreateMissionDrawer
        open={assignTripOpen}
        onClose={() => setAssignTripOpen(false)}
        initialDriverId={driver.id}
        initialDriverName={driver.fullName}
      />
    </div>
  );
}
