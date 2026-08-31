import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Fuel, Gauge, Package, Radio, Truck, Wrench,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { AlertLevelBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingPanel } from '@/components/ui/Spinner';
import { DashboardSearch } from '@/components/home/DashboardSearch';
import { alertApi, fuelApi, missionApi, trackingApi, vehicleApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import {
  formatAge, formatFcfaCompact, formatKm, formatNumber, formatPercent,
} from '@/lib/utils';

/**
 * Tableau de bord.
 *
 * Il n'affiche que des chiffres reellement calcules par le backend.
 * Les indicateurs de rentabilite consolidee arrivent au sprint 7 : ils
 * sont absents plutot que simules, une valeur inventee sur un tableau
 * de bord de direction etant pire qu'une valeur manquante.
 */
export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();

  const vehicles = useQuery({ queryKey: ['vehicles', 'stats'], queryFn: vehicleApi.stats });
  const tracking = useQuery({
    queryKey: ['tracking', 'stats'],
    queryFn: trackingApi.stats,
    refetchInterval: 30_000,
  });
  const missions = useQuery({ queryKey: ['missions', 'stats'], queryFn: () => missionApi.stats() });
  const fuel = useQuery({ queryKey: ['fuel', 'stats'], queryFn: () => fuelApi.stats() });
  const alerts = useQuery({ queryKey: ['alerts', 'recent'], queryFn: alertApi.recent });

  const loading = vehicles.isLoading || tracking.isLoading || missions.isLoading;

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  // Le format de date suit la langue active : fr-FR ou en-US, pas fige.
  const today = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());

  const trackingRows = [
    { label: t('dashboard.moving'), value: tracking.data?.enMouvement, dot: 'bg-status-moving' },
    { label: t('dashboard.idle'), value: tracking.data?.aLArret, dot: 'bg-status-idle' },
    { label: t('dashboard.inMaintenance'), value: tracking.data?.enMaintenance, dot: 'bg-status-maintenance' },
    { label: t('dashboard.offline'), value: tracking.data?.horsLigne, dot: 'bg-status-offline' },
  ];

  return (
    <PageShell
      title={t('dashboard.greeting', { name: firstName })}
      subtitle={t('dashboard.subtitle', { date: today })}
    >
      {loading ? (
        <LoadingPanel label={t('dashboard.loadingIndicators')} />
      ) : (
        <div className="space-y-6">

          <div className="max-w-md">
            <DashboardSearch />
          </div>

          {/* Etat de la flotte */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('dashboard.fleetStatus')}
            </h2>
            <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label={t('dashboard.activeVehicles')}
                value={formatNumber(vehicles.data?.total)}
                icon={Truck}
                hint={t('dashboard.availability', { rate: formatPercent(vehicles.data?.availabilityRate) })}
                accent="blue"
              />
              <StatCard
                label={t('dashboard.inMission')}
                value={formatNumber(vehicles.data?.enMission)}
                icon={Package}
                hint={t('dashboard.available', { count: formatNumber(vehicles.data?.disponible) })}
                accent="green"
              />
              <StatCard
                label={t('dashboard.inMaintenance')}
                value={formatNumber(
                  (vehicles.data?.enMaintenance ?? 0) + (vehicles.data?.enPanne ?? 0),
                )}
                icon={Wrench}
                hint={t('dashboard.includingBreakdown', { count: formatNumber(vehicles.data?.enPanne) })}
                accent="amber"
              />
              <StatCard
                label={t('dashboard.offline')}
                value={formatNumber(tracking.data?.horsLigne)}
                icon={Radio}
                hint={t('dashboard.noRecentPosition')}
                accent="slate"
              />
            </StatGrid>
          </section>

          {/* Activite et couts */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('dashboard.monthlyActivity')}
            </h2>
            <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label={t('dashboard.monthlyMissions')}
                value={formatNumber(missions.data?.total)}
                icon={Package}
                hint={t('dashboard.missionsSummary', {
                  completed: formatNumber(missions.data?.terminees),
                  inProgress: formatNumber(missions.data?.enCours),
                })}
                accent="blue"
              />
              <StatCard
                label={t('dashboard.kilometersDriven')}
                value={formatKm(missions.data?.kilometresParcourus)}
                icon={Gauge}
                accent="slate"
              />
              <StatCard
                label={t('dashboard.fuelCost')}
                value={formatFcfaCompact(fuel.data?.coutTotal)}
                icon={Fuel}
                hint={t('dashboard.litersConsumed', { count: formatNumber(fuel.data?.litresConsommes) })}
                accent="amber"
              />
              <StatCard
                label={t('dashboard.averageConsumption')}
                value={
                  fuel.data?.consommationMoyenne
                    ? `${formatNumber(fuel.data.consommationMoyenne, 1)} L/100km`
                    : '—'
                }
                icon={Fuel}
                accent="slate"
              />
            </StatGrid>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Suivi temps reel */}
            <div className="card lg:col-span-1">
              <div className="border-b border-surface-border px-5 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.liveTracking')}</h2>
              </div>
              <dl className="divide-y divide-surface-border dark:divide-slate-800">
                {trackingRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-3">
                    <dt className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                      <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                      {row.label}
                    </dt>
                    <dd className="tabular text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatNumber(row.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Alertes recentes */}
            <div className="card lg:col-span-2">
              <div className="flex items-center justify-between border-b border-surface-border px-5 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('dashboard.recentAlerts')}</h2>
                <a href="/alertes" className="text-sm font-medium text-accent hover:underline">
                  {t('dashboard.viewAllAlerts')}
                </a>
              </div>

              {alerts.isLoading ? (
                <LoadingPanel />
              ) : !alerts.data?.length ? (
                <EmptyState
                  icon={AlertTriangle}
                  title={t('dashboard.noAlertsTitle')}
                  action={t('dashboard.noAlertsAction')}
                />
              ) : (
                <ul className="divide-y divide-surface-border dark:divide-slate-800">
                  {alerts.data.slice(0, 6).map((alert) => (
                    <li key={alert.id} className="flex items-start gap-3 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                            {alert.title}
                          </p>
                          <AlertLevelBadge level={alert.level} />
                        </div>
                        <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                          {alert.registrationNumber && (
                            <span className="font-medium">{alert.registrationNumber} · </span>
                          )}
                          {alert.description}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                        {formatAge(alert.ageMinutes)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
