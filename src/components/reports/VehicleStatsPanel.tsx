import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Banknote, ChevronDown, ClipboardList, FileDown, Fuel, Gauge, Route, TrendingUp, Truck, Wallet, Wrench } from 'lucide-react';
import { Spinner, LoadingPanel } from '@/components/ui/Spinner';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { reportApi } from '@/api/compliance';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { formatFcfa, formatLiters, formatNumber } from '@/lib/utils';
import type { ExpenseDomain, MissionTypeLine, VehicleExpenseSection } from '@/types/compliance';

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

/** Lundi de la semaine contenant d (semaine commencant le lundi). */
function mondayOf(d: Date): Date {
  const m = new Date(d);
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return m;
}

type PeriodPreset = 'thisWeek' | 'lastWeek' | 'thisMonth';

function presetPeriod(preset: PeriodPreset): { from: string; to: string } {
  const today = new Date();
  if (preset === 'thisMonth') {
    return { from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoDate(today) };
  }
  const monday = mondayOf(today);
  if (preset === 'thisWeek') return { from: isoDate(monday), to: isoDate(today) };
  const lastMonday = new Date(monday);
  lastMonday.setDate(monday.getDate() - 7);
  const lastSunday = new Date(monday);
  lastSunday.setDate(monday.getDate() - 1);
  return { from: isoDate(lastMonday), to: isoDate(lastSunday) };
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
  const [selected, setSelected] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingMissions, setDownloadingMissions] = useState(false);

  const invalidPeriod = !period.from || !period.to || period.to < period.from;

  const report = useQuery({
    queryKey: ['reports', 'vehicle-expense-report', period.from, period.to, selected],
    queryFn: () => reportApi.vehicleExpenseReport(period.from, period.to, selected),
    enabled: !invalidPeriod,
  });

  const data = report.data;
  const section = data && selected.length === 1 ? data.vehicles[0] : undefined;
  const comparing = Boolean(data && selected.length >= 2);

  const toggle = (id: number) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  // Un camion choisi : ses chiffres. Plusieurs : comparaison. Aucun : ceux de toute la flotte.
  const view = data && (selected.length === 1
    ? section && {
      expenses: section.expenses, total: section.totalExpenses, missionTypes: section.missionTypes,
      missionCount: section.missionCount, km: section.distanceKm, revenue: section.revenue,
      margin: section.missionMargin, perKm: section.expensePerKm, testFuel: section.testFuelLiters, downtime: section.downtimeDays,
    }
    : {
      expenses: data.fleetExpenses, total: data.fleetTotalExpenses, missionTypes: data.fleetMissionTypes,
      missionCount: data.fleetMissionCount, km: data.fleetKm, revenue: data.fleetRevenue,
      margin: data.vehicles.reduce((sum, v) => sum + v.missionMargin, 0),
      perKm: data.fleetKm > 0 ? data.fleetTotalExpenses / data.fleetKm : null,
      testFuel: data.fleetTestFuelLiters, downtime: data.fleetDowntimeDays,
    });

  const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const downloadMissionsPdf = async () => {
    setDownloadingMissions(true);
    try {
      saveBlob(await reportApi.missionsPdf(period.from, period.to, selected), `missions_${period.from}_${period.to}.pdf`);
    } catch (e) {
      toast.error(errorMessage(e) || t('reportsPage.pdfError'));
    } finally {
      setDownloadingMissions(false);
    }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await reportApi.vehicleExpensesPdf(period.from, period.to, selected);
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
        <div className="relative">
          <label className="label">{t('reportsPage.pdfVehicle')}</label>
          <button type="button" className="input flex min-w-[14rem] items-center justify-between gap-2 text-left"
            onClick={() => setPickerOpen((o) => !o)} aria-expanded={pickerOpen}>
            <span className="truncate">
              {selected.length === 0 ? t('reportsPage.pdfAllVehicles') : t('reportsPage.vehiclesSelected', { count: selected.length })}
            </span>
            <ChevronDown size={14} className="shrink-0 text-slate-400" />
          </button>
          {pickerOpen && (
            <div className="absolute z-20 mt-1 w-64 rounded-lg border border-surface-border bg-white p-2 shadow-panel dark:border-slate-700 dark:bg-slate-900">
              <div className="max-h-56 space-y-0.5 overflow-y-auto">
                {vehicles.map((v) => (
                  <label key={v.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input type="checkbox" checked={selected.includes(v.id)} onChange={() => toggle(v.id)} />
                    {v.registrationNumber}
                  </label>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t border-surface-border pt-2 text-xs dark:border-slate-800">
                <button type="button" className="text-slate-500 hover:text-slate-700 dark:text-slate-400" onClick={() => setSelected([])}>
                  {t('reportsPage.clearSelection')}
                </button>
                <button type="button" className="font-medium text-accent" onClick={() => setPickerOpen(false)}>OK</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-1.5 self-end pb-0.5">
          {(['thisWeek', 'lastWeek', 'thisMonth'] as PeriodPreset[]).map((p) => (
            <button key={p} type="button" onClick={() => setPeriod(presetPeriod(p))}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
              {t(`reportsPage.preset.${p}`)}
            </button>
          ))}
        </div>
        <button type="button" onClick={downloadMissionsPdf} disabled={downloadingMissions || invalidPeriod} className="btn-ghost">
          {downloadingMissions ? <Spinner /> : <ClipboardList size={16} />}
          {t('reportsPage.missionsReport')}
        </button>
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

      {comparing && data && <ComparisonView sections={data.vehicles} />}

      {!comparing && view && (
        <>
          <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label={t('reportsPage.kpiTotalExpenses')} value={formatFcfa(view.total)} icon={Wallet} lowerIsBetter accent="amber" />
            <StatCard label={t('reportsPage.kpiMissions')} value={String(view.missionCount)} icon={Truck} />
            <StatCard label={t('reportsPage.kpiRevenue')} value={formatFcfa(view.revenue)} icon={Banknote} accent="green" />
            <StatCard label={t('reportsPage.kpiDistance')} value={`${formatNumber(view.km)} km`} icon={Route} accent="slate" />
            <StatCard label={t('reportsPage.kpiExpensePerKm')} value={view.perKm == null ? '—' : formatFcfa(view.perKm)} icon={Gauge} lowerIsBetter accent="slate" />
            <StatCard label={t('reportsPage.kpiDowntime')} value={`${formatNumber(view.downtime)} ${t('reportsPage.daysUnit')}`} icon={Wrench} lowerIsBetter accent="red" />
            <StatCard label={t('reportsPage.kpiTestFuel')} value={formatLiters(view.testFuel)} icon={Fuel} accent="slate" />
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

function totalCell(value: number, formatter: (n: number) => string) {
  return <td className="tabular whitespace-nowrap py-2 pl-4 text-right font-medium">{formatter(value)}</td>;
}

/** Comparaison cote a cote : une colonne par vehicule, plus une colonne de total. */
function ComparisonView({ sections }: { sections: VehicleExpenseSection[] }) {
  const { t } = useTranslation();
  const sum = (pick: (v: VehicleExpenseSection) => number) => sections.reduce((acc, v) => acc + pick(v), 0);
  const typeLabels = [...new Set(sections.flatMap((v) => v.missionTypes.map((m) => m.typeLabel)))].sort();
  const countFor = (v: VehicleExpenseSection, label: string) =>
    v.missionTypes.find((m) => m.typeLabel === label)?.missionCount ?? 0;

  const head = (
    <tr className="text-xs text-slate-500 dark:text-slate-400">
      <th className="py-1.5 pr-4 text-left font-medium" />
      {sections.map((v) => (
        <th key={v.vehicleId} className="whitespace-nowrap py-1.5 pl-4 text-right font-semibold text-slate-700 dark:text-slate-200">
          {v.registrationNumber}
        </th>
      ))}
      <th className="py-1.5 pl-4 text-right font-semibold">{t('reportsPage.colTotal')}</th>
    </tr>
  );
  const rowClass = 'border-t border-surface-border dark:border-slate-800';
  const strongClass = 'border-t-2 border-surface-border font-semibold dark:border-slate-700';
  const labelClass = 'py-2 pr-4 text-slate-700 dark:text-slate-300';
  const valueClass = 'tabular whitespace-nowrap py-2 pl-4 text-right';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('reportsPage.statsCompare')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>{head}</thead>
            <tbody>
              {DOMAINS.map((d) => (
                <tr key={d} className={rowClass}>
                  <td className={labelClass}>{t(`reportsPage.domain.${d}`)}</td>
                  {sections.map((v) => <td key={v.vehicleId} className={valueClass}>{formatFcfa(v.expenses[d] ?? 0)}</td>)}
                  {totalCell(sum((v) => v.expenses[d] ?? 0), formatFcfa)}
                </tr>
              ))}
              <tr className={strongClass}>
                <td className="py-2 pr-4">{t('reportsPage.kpiTotalExpenses')}</td>
                {sections.map((v) => <td key={v.vehicleId} className={valueClass}>{formatFcfa(v.totalExpenses)}</td>)}
                {totalCell(sum((v) => v.totalExpenses), formatFcfa)}
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>{t('reportsPage.rowMissions')}</td>
                {sections.map((v) => <td key={v.vehicleId} className={valueClass}>{v.missionCount}</td>)}
                {totalCell(sum((v) => v.missionCount), String)}
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>{t('reportsPage.rowDistance')}</td>
                {sections.map((v) => <td key={v.vehicleId} className={valueClass}>{formatNumber(v.distanceKm)} km</td>)}
                {totalCell(sum((v) => v.distanceKm), (n) => `${formatNumber(n)} km`)}
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>{t('reportsPage.kpiDowntime')}</td>
                {sections.map((v) => <td key={v.vehicleId} className={valueClass}>{v.downtimeDays} {t('reportsPage.daysUnit')}</td>)}
                {totalCell(sum((v) => v.downtimeDays), (n) => `${n} ${t('reportsPage.daysUnit')}`)}
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>{t('reportsPage.kpiTestFuel')}</td>
                {sections.map((v) => <td key={v.vehicleId} className={valueClass}>{formatLiters(v.testFuelLiters)}</td>)}
                {totalCell(sum((v) => v.testFuelLiters), formatLiters)}
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>{t('reportsPage.rowRevenue')}</td>
                {sections.map((v) => <td key={v.vehicleId} className={valueClass}>{formatFcfa(v.revenue)}</td>)}
                {totalCell(sum((v) => v.revenue), formatFcfa)}
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>{t('reportsPage.rowMargin')}</td>
                {sections.map((v) => <td key={v.vehicleId} className={valueClass}>{formatFcfa(v.missionMargin)}</td>)}
                {totalCell(sum((v) => v.missionMargin), formatFcfa)}
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>{t('reportsPage.rowPerKm')}</td>
                {sections.map((v) => (
                  <td key={v.vehicleId} className={valueClass}>{v.expensePerKm == null ? '—' : formatFcfa(v.expensePerKm)}</td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {typeLabels.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('reportsPage.statsCompareMissions')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>{head}</thead>
              <tbody>
                {typeLabels.map((label) => (
                  <tr key={label} className={rowClass}>
                    <td className={labelClass}>{label}</td>
                    {sections.map((v) => <td key={v.vehicleId} className={valueClass}>{countFor(v, label)}</td>)}
                    {totalCell(sum((v) => countFor(v, label)), String)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
