import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Award, Fuel, Gauge, Package, Radio, Wrench,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { MissionStatusBadge, AlertLevelBadge } from '@/components/ui/StatusBadge';
import { ScoreBadge } from '@/components/ui/ScoreBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingPanel } from '@/components/ui/Spinner';
import { FleetMiniMap } from '@/components/home/FleetMiniMap';
import { DirectionMessage } from '@/components/home/DirectionMessage';
import { FinancialTrendChart } from '@/components/reports/FinancialTrendChart';
import { CostBreakdownDonut } from '@/components/reports/CostBreakdownDonut';
import { missionApi, fuelApi, alertApi, driverApi, trackingApi } from '@/api/endpoints';
import { reportApi } from '@/api/compliance';
import { useAuthStore } from '@/store/authStore';
import { alertSourceRoute } from '@/lib/alertNavigation';
import { formatAge, formatFcfa, formatKm, formatLiters, formatNumber } from '@/lib/utils';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}
function sixMonthsAgo(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);
}

/**
 * Ecran d'accueil, avant le Tableau de bord.
 *
 * Vue "coup d'oeil du matin" plutot que le tableau de bord operationnel
 * complet : quelques chiffres du jour, la carte, ce qui bouge la ou
 * s'est arrete, et les indicateurs de performance du mois. La carte
 * mini reste volontairement vide de camions tant qu'aucun boitier GPS
 * n'est configure — voir FleetMiniMap.
 */
export function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuthStore();

  const canSeeTracking = hasPermission('TRACKING_READ');
  const canSeeMissions = hasPermission('MISSION_READ');
  const canSeeAlerts = hasPermission('ALERT_READ');
  const canSeeReports = hasPermission('REPORT_READ');
  const canSeeDrivers = hasPermission('DRIVER_READ');
  const canSeeFinance = hasPermission('FINANCE_READ');

  const tracking = useQuery({ queryKey: ['tracking', 'stats'], queryFn: trackingApi.stats, refetchInterval: 30_000 });
  const missions = useQuery({ queryKey: ['missions', 'stats'], queryFn: () => missionApi.stats(), enabled: canSeeMissions });
  const missionsToday = useQuery({ queryKey: ['missions', 'stats', today()], queryFn: () => missionApi.stats(today(), today()), enabled: canSeeMissions });
  const fuelToday = useQuery({ queryKey: ['fuel', 'stats', today()], queryFn: () => fuelApi.stats(today(), today()) });
  const missionList = useQuery({ queryKey: ['missions', 'list-home'], queryFn: () => missionApi.list(0, 50), enabled: canSeeMissions });
  const criticalAlerts = useQuery({ queryKey: ['alerts', 'recent'], queryFn: alertApi.recent, enabled: canSeeAlerts });
  const trend = useQuery({
    queryKey: ['reports', 'fleet-performance', sixMonthsAgo(), today()],
    queryFn: () => reportApi.fleetPerformance(sixMonthsAgo(), today()),
    enabled: canSeeReports,
  });
  const costMonth = useQuery({
    queryKey: ['reports', 'cost-breakdown-month', firstOfMonth()],
    queryFn: () => reportApi.costBreakdown(firstOfMonth(), today()),
    // Alimente a la fois la carte "Cout total" (canSeeFinance) et le donut de repartition (canSeeReports).
    enabled: canSeeFinance || canSeeReports,
  });
  const driverRanking = useQuery({ queryKey: ['drivers', 'ranking'], queryFn: driverApi.ranking, enabled: canSeeDrivers });

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const dateLabel = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());

  const connected = (tracking.data?.total ?? 0) - (tracking.data?.horsLigne ?? 0);
  const inProgressMissions = (missionList.data?.content ?? []).filter((m) => m.status === 'EN_COURS' || m.status === 'EN_ATTENTE').slice(0, 5);
  const critical = (criticalAlerts.data ?? []).filter((a) => a.level === 'CRITIQUE').slice(0, 5);
  const topDrivers = (driverRanking.data ?? []).slice(0, 5);

  return (
    <PageShell
      title={t('homePage.greeting', { name: firstName || 'Admin' })}
      subtitle={t('homePage.subtitle', { date: dateLabel })}
    >
      <div className="space-y-6">
        <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <StatCard
            label={t('homePage.statConnectedVehicles')}
            value={`${connected}/${tracking.data?.total ?? 0}`}
            icon={Radio}
            hint={tracking.data?.total ? t('homePage.statConnectedHint', { percent: Math.round((connected / tracking.data.total) * 100) }) : undefined}
            accent="blue"
          />
          <StatCard
            label={t('homePage.statInProgressMissions')}
            value={String(missions.data?.enCours ?? '—')}
            icon={Package}
            hint={missions.data?.total ? t('homePage.statInProgressHint', { total: missions.data.total }) : undefined}
            accent="amber"
          />
          <StatCard label={t('homePage.statKmToday')} value={formatKm(missionsToday.data?.kilometresParcourus)} icon={Gauge} accent="slate" />
          <StatCard label={t('homePage.statFuelToday')} value={formatLiters(fuelToday.data?.litresConsommes)} icon={Fuel} accent="slate" />
          {canSeeFinance && (
            <StatCard label={t('homePage.statCostThisMonth')} value={formatFcfa(costMonth.data?.total)} icon={Wrench} lowerIsBetter accent="green" />
          )}
        </StatGrid>

        {canSeeTracking && <FleetMiniMap />}

        <div className="grid gap-6 lg:grid-cols-2">
          {canSeeMissions && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-surface-border px-5 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('homePage.inProgressMissions')}</h2>
                <Link to="/missions" className="text-sm font-medium text-accent hover:underline">
                  {t('homePage.viewAllMissions')}
                </Link>
              </div>
              {missionList.isLoading ? <LoadingPanel /> : inProgressMissions.length === 0 ? (
                <EmptyState icon={Package} title={t('homePage.emptyMissions')} />
              ) : (
                <ul className="divide-y divide-surface-border dark:divide-slate-800">
                  {inProgressMissions.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                          {m.clientName ?? m.missionNumber} · {m.registrationNumber}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {m.originLabel ?? '—'} → {m.destinationLabel ?? '—'}
                        </p>
                      </div>
                      <MissionStatusBadge status={m.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {canSeeAlerts && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-surface-border px-5 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('homePage.criticalAlerts')}</h2>
                <Link to="/alertes" className="text-sm font-medium text-accent hover:underline">
                  {t('dashboard.viewAllAlerts')}
                </Link>
              </div>
              {criticalAlerts.isLoading ? <LoadingPanel /> : critical.length === 0 ? (
                <EmptyState icon={AlertTriangle} title={t('homePage.emptyCriticalAlerts')} />
              ) : (
                <ul className="divide-y divide-surface-border dark:divide-slate-800">
                  {critical.map((a) => {
                    const route = alertSourceRoute(a);
                    return (
                      <li
                        key={a.id}
                        onClick={route ? () => navigate(route) : undefined}
                        className={`flex items-start gap-3 px-5 py-3.5 ${route ? 'cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60' : ''}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{a.title}</p>
                            <AlertLevelBadge level={a.level} />
                          </div>
                          {a.registrationNumber && (
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{a.registrationNumber}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatAge(a.ageMinutes)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {canSeeReports && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card-padded lg:col-span-2">
              <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">{t('homePage.fleetPerformance')}</h2>
              {trend.isLoading ? <LoadingPanel /> : <FinancialTrendChart points={trend.data ?? []} />}
            </div>
            <div className="card-padded">
              <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">{t('homePage.costBreakdownMonth')}</h2>
              {costMonth.isLoading ? <LoadingPanel /> : costMonth.data && <CostBreakdownDonut breakdown={costMonth.data} />}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {canSeeDrivers && (
            <div className="card overflow-hidden lg:col-span-2">
              <div className="border-b border-surface-border px-5 py-4 dark:border-slate-800">
                <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <Award size={16} className="text-amber-500" />
                  {t('homePage.topDrivers')}
                </h2>
              </div>
              {driverRanking.isLoading ? <LoadingPanel /> : topDrivers.length === 0 ? (
                <EmptyState icon={Award} title={t('homePage.emptyRanking')} />
              ) : (
                <ul className="divide-y divide-surface-border dark:divide-slate-800">
                  {topDrivers.map((d, index) => (
                    <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent dark:bg-accent/15">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{d.fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('homePage.missionsCount', { count: formatNumber(d.totalMissions) })}</p>
                      </div>
                      <ScoreBadge score={d.performanceScore} ratingClass={d.ratingClass} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <DirectionMessage />
        </div>
      </div>
    </PageShell>
  );
}
