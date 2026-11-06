import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Banknote, FileDown, Gauge, Route, TrendingUp, Truck, Wallet } from 'lucide-react';
import { Spinner, LoadingPanel } from '@/components/ui/Spinner';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { reportApi } from '@/api/compliance';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { formatFcfa, formatNumber } from '@/lib/utils';
import type { ExpenseDomain, MissionTypeLine } from '@/types/compliance';

const DOMAINS: ExpenseDomain[] = [
  'CARBURANT', 'MAINTENANCE', 'LAVERIE', 'ASSURANCE', 'VISITE_TECHNIQUE',
  'PEAGES', 'FRAIS_MISSION', 'AUTRES_FRAIS_MISSION', 'DEPENSES_DIVERSES',
];

interface VehicleStatsPanelProps {
  year: number;
  vehicles: { id: number; registrationNumber: string }[];
}

function isoDate(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Debut et fin par defaut : l'annee choisie, arretee a aujourd'hui pour l'annee en cours. */
function defaultPeriod(year: number): { from: string; to: string } {
  const today = new Date();
  const end = year === today.getFullYear() ? today : new Date(year, 11, 31);
  return { from: `${year}-01-01`, to: isoDate(end) };
}

function share(part: number, total: number): string {
  return total === 0 ? '—' : `${formatNumber((part * 100) / total, 1)} %`;
}

/**
 * Statistiques d'un camion (ou de toute la flotte) sur une periode : depenses
 * dans chaque domaine de l'application, missions par type de mission, bilan.
 * Les memes chiffres alimentent le rapport PDF telecharge depuis cette section
 * (GET /reports/vehicle-expenses/report et /pdf).
 */
export function VehicleStatsPanel({ year, vehicles }: VehicleStatsPanelProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(() => defaultPeriod(year));
  const [vehicleId, setVehicleId] = useState('');
  const [downloading, setDownloading] = useState(false);

  const invalidPeriod = !period.from || !period.to || period.to < period.from;

  const report = useQuery({
    queryKey: ['reports', 'vehicle-expense-report', period.from, period.to, vehicleId],
    queryFn: () => reportApi.vehicleExpenseReport(period.from, period.to, vehicleId ? Number(vehicleId) : undefined),
    enabled: !invalidPeriod,
  });

  const data = report.data;
  const section = data && vehicleId ? data.vehicles[0] : undefined;

  // Un camion choisi : ses chiffres. Sinon : ceux de toute la flotte.
  const view = data && (vehicleId
    ? section && {
      expenses: section.expenses, total: section.totalExpenses, missionTypes: section.missionTypes,
      missionCount: section.missionCount, km: section.distanceKm, revenue: section.revenue,
      margin: section.missionMargin, perKm: section.expensePerKm,
    }
    : {
      expenses: data.fleetExpenses, total: data.fleetTotalExpenses, missionTypes: data.fleetMissionTypes,
      missionCount: data.fleetMissionCount, km: data.fleetKm, revenue: data.fleetRevenue,
      margin: data.vehicles.reduce((sum, v) => sum + v.missionMargin, 0),
      perKm: data.fleetKm > 0 ? data.fleetTotalExpenses / data.fleetKm : null,
    });

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await reportApi.vehicleExpensesPdf(period.from, period.to, vehicleId ? Number(vehicleId) : undefined);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `depenses-vehicules_${period.from}_${period.to}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorMessage(e) || t('reportsPage.pdfError'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card space-y-5 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('reportsPage.statsTitle')}</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('reportsPage.statsDescription')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">{t('reportsPage.pdfFrom')}</label>
          <input type="date" className="input" value={period.from}
            onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))} />
        </div>
        <div>
          <label className="label">{t('reportsPage.pdfTo')}</label>
          <input type="date" className="input" value={period.to}
            onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))} />
        </div>
        <div>
          <label className="label">{t('reportsPage.pdfVehicle')}</label>
          <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">{t('reportsPage.pdfAllVehicles')}</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.registrationNumber}</option>)}
          </select>
        </div>
        <button type="button" onClick={downloadPdf} disabled={downloading || invalidPeriod} className="btn-primary">
          {downloading ? <Spinner className="text-white" /> : <FileDown size={16} />}
          {t('reportsPage.pdfDownload')}
        </button>
      </div>
      {invalidPeriod && (
        <p className="text-xs text-red-600 dark:text-red-400">{t('reportsPage.pdfInvalidPeriod')}</p>
      )}

      {report.isLoading && <LoadingPanel />}
      {report.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage(report.error)}</p>
      )}

      {view && (
        <>
          <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label={t('reportsPage.kpiTotalExpenses')} value={formatFcfa(view.total)} icon={Wallet} lowerIsBetter accent="amber" />
            <StatCard label={t('reportsPage.kpiMissions')} value={String(view.missionCount)} icon={Truck} />
            <StatCard label={t('reportsPage.kpiRevenue')} value={formatFcfa(view.revenue)} icon={Banknote} accent="green" />
            <StatCard label={t('reportsPage.kpiDistance')} value={`${formatNumber(view.km)} km`} icon={Route} accent="slate" />
            <StatCard label={t('reportsPage.kpiExpensePerKm')} value={view.perKm == null ? '—' : formatFcfa(view.perKm)} icon={Gauge} lowerIsBetter accent="slate" />
            <StatCard label={t('reportsPage.kpiMargin')} value={formatFcfa(view.margin)} icon={TrendingUp} accent={view.margin < 0 ? 'red' : 'green'} />
          </StatGrid>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('reportsPage.statsExpenses')}
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-1.5 font-medium">{t('reportsPage.colDomain')}</th>
                    <th className="py-1.5 text-right font-medium">{t('reportsPage.colAmount')}</th>
                    <th className="py-1.5 text-right font-medium">{t('reportsPage.colShare')}</th>
                  </tr>
                </thead>
                <tbody>
                  {DOMAINS.map((d) => (
                    <tr key={d} className="border-t border-surface-border dark:border-slate-800">
                      <td className="py-2 text-slate-700 dark:text-slate-300">{t(`reportsPage.domain.${d}`)}</td>
                      <td className="tabular py-2 text-right">{formatFcfa(view.expenses[d] ?? 0)}</td>
                      <td className="tabular py-2 text-right text-slate-500 dark:text-slate-400">{share(view.expenses[d] ?? 0, view.total)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-surface-border font-semibold dark:border-slate-700">
                    <td className="py-2">{t('reportsPage.colTotal')}</td>
                    <td className="tabular py-2 text-right">{formatFcfa(view.total)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('reportsPage.statsMissions')}
              </h3>
              {view.missionTypes.length === 0 ? (
                <p className="text-sm text-slate-400">{t('reportsPage.statsNoMissions')}</p>
              ) : (
                <MissionTypesTable lines={view.missionTypes} total={view.missionCount} km={view.km} revenue={view.revenue} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MissionTypesTable({ lines, total, km, revenue }: { lines: MissionTypeLine[]; total: number; km: number; revenue: number }) {
  const { t } = useTranslation();
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
          <th className="py-1.5 font-medium">{t('reportsPage.colMissionType')}</th>
          <th className="py-1.5 text-right font-medium">{t('reportsPage.colMissionCount')}</th>
          <th className="py-1.5 text-right font-medium">{t('reportsPage.colDistance')}</th>
          <th className="py-1.5 text-right font-medium">{t('reportsPage.colRevenue')}</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.typeLabel} className="border-t border-surface-border dark:border-slate-800">
            <td className="py-2 text-slate-700 dark:text-slate-300">{l.typeLabel}</td>
            <td className="tabular py-2 text-right">{l.missionCount}</td>
            <td className="tabular py-2 text-right">{formatNumber(l.distanceKm)} km</td>
            <td className="tabular py-2 text-right">{formatFcfa(l.revenue)}</td>
          </tr>
        ))}
        <tr className="border-t-2 border-surface-border font-semibold dark:border-slate-700">
          <td className="py-2">{t('reportsPage.colTotal')}</td>
          <td className="tabular py-2 text-right">{total}</td>
          <td className="tabular py-2 text-right">{formatNumber(km)} km</td>
          <td className="tabular py-2 text-right">{formatFcfa(revenue)}</td>
        </tr>
      </tbody>
    </table>
  );
}
