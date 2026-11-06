import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, Truck, Users, Wallet } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { DataTable } from '@/components/ui/DataTable';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { VehicleStatsPanel } from '@/components/reports/VehicleStatsPanel';
import { VehicleExpenseChart } from '@/components/reports/VehicleExpenseChart';
import { CityExpenseChart } from '@/components/reports/CityExpenseChart';
import { VehicleProfitabilityPanel } from '@/components/reports/VehicleProfitabilityPanel';
import { VehicleCostRankingPanel } from '@/components/reports/VehicleCostRankingPanel';
import { ClientListDrawer } from '@/components/clients/ClientListDrawer';
import { reportApi } from '@/api/compliance';
import { adminApi, driverApi, vehicleApi } from '@/api/endpoints';
import { formatFcfa, formatFcfaCompact, formatFcfaCompactNumber, formatNumber } from '@/lib/utils';
import type { MonthlyAmount } from '@/types/compliance';

const MONTH_LABELS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Villes ou l'entreprise a une implantation active. */
const CITY_STATS_NAMES = ['Douala', 'Yaoundé', 'Bafoussam'];

function amountFor(monthly: MonthlyAmount[], month: number): number {
  return monthly.find((m) => m.month === month)?.amount ?? 0;
}

function currentYear(): number {
  return new Date().getFullYear();
}

/**
 * Rapports & Statistiques — vue Charges.
 *
 * Pur suivi de cout, sans chiffre d'affaires ni marge : ce que chaque
 * camion coute mois par mois et sur l'annee (missions terminees +
 * entretien + carburant hors mission), et le meme total cumule par
 * ville d'affectation des camions. Voir ReportingService.vehicleExpenses
 * / cityExpenses cote backend pour le detail des sources agregees.
 */
export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const MONTH_LABELS = i18n.language === 'en' ? MONTH_LABELS_EN : MONTH_LABELS_FR;
  const [year, setYear] = useState(currentYear());
  const [clientListOpen, setClientListOpen] = useState(false);

  const vehicleExpenses = useQuery({
    queryKey: ['reports', 'vehicle-expenses', year],
    queryFn: () => reportApi.vehicleExpenses(year),
  });
  const cityExpenses = useQuery({
    queryKey: ['reports', 'city-expenses', year],
    queryFn: () => reportApi.cityExpenses(year),
  });
  const driverRanking = useQuery({ queryKey: ['drivers', 'ranking'], queryFn: driverApi.ranking });
  const allCities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities });
  const allVehicles = useQuery({ queryKey: ['vehicles', 'for-profitability'], queryFn: () => vehicleApi.list(0, 200) });
  const vehicleProfitability = useQuery({
    queryKey: ['reports', 'vehicle-profitability', year],
    queryFn: () => reportApi.vehicles(`${year}-01-01`, `${year}-12-31`),
  });

  const vehicles = vehicleExpenses.data ?? [];
  const cities = cityExpenses.data ?? [];
  const profitabilityCities = (allCities.data ?? []).filter((c) => CITY_STATS_NAMES.includes(c.name));

  const fleetTotal = vehicles.reduce((sum, v) => sum + v.yearTotal, 0);
  const costliestVehicle = vehicles[0]; // deja trie par yearTotal decroissant cote backend
  const costliestCity = cities[0];

  // Meme trois chiffres, par ville — deja disponibles dans les donnees chargees ci-dessus
  // (cities pour le total et le nombre de camions, vehicles pour le camion le plus couteux,
  // driverRanking pour le meilleur chauffeur, deja trie par score cote backend).
  const cityStats = cities.map((c) => ({
    city: c,
    costliestVehicle: vehicles.filter((v) => v.cityId === c.cityId)[0],
    bestDriver: (driverRanking.data ?? []).find((d) => d.cityId === c.cityId),
  }));

  const years = Array.from({ length: 5 }, (_, i) => currentYear() - i);

  return (
    <PageShell
      title={t('reportsPage.title')}
      subtitle={t('reportsPage.subtitle')}
      backgroundImage="/Rapport.jpg"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            className="input w-auto"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setClientListOpen(true)} className="btn-ghost">
            <Users size={15} />{t('reportsPage.clients')}
          </button>
        </div>

        <VehicleStatsPanel
          key={year}
          year={year}
          vehicles={(allVehicles.data?.content ?? []).map((v) => ({ id: v.id, registrationNumber: v.registrationNumber }))}
        />

        <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('reportsPage.statFleetTotal')} value={formatFcfaCompact(fleetTotal)} icon={Wallet} lowerIsBetter accent="amber" />
          <StatCard
            label={t('reportsPage.statCostliestVehicle')}
            value={costliestVehicle ? costliestVehicle.registrationNumber : '—'}
            hint={costliestVehicle ? formatFcfa(costliestVehicle.yearTotal) : undefined}
            icon={Truck}
            accent="slate"
          />
          <StatCard
            label={t('reportsPage.statCostliestCity')}
            value={costliestCity ? costliestCity.cityName : '—'}
            hint={costliestCity ? formatFcfa(costliestCity.yearTotal) : undefined}
            icon={MapPin}
            accent="slate"
          />
          <StatCard label={t('reportsPage.statActiveVehicles')} value={String(vehicles.length)} icon={Truck} accent="blue" />
        </StatGrid>

        {cityStats.length > 0 && (
          <div>
            <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">{t('reportsPage.statsByCity')}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {cityStats.map(({ city, costliestVehicle: cv, bestDriver }) => (
                <div key={city.cityId} className="card-padded">
                  <h3 className="mb-3 flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <MapPin size={15} className="text-slate-400" />
                    {city.cityName}
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-500 dark:text-slate-400">{t('reportsPage.statFleetTotal')}</dt>
                      <dd className="font-medium tabular text-slate-800 dark:text-slate-200">{formatFcfaCompact(city.yearTotal)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-500 dark:text-slate-400">{t('reportsPage.statActiveVehicles')}</dt>
                      <dd className="font-medium tabular text-slate-800 dark:text-slate-200">{formatNumber(city.vehicleCount)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-500 dark:text-slate-400">{t('reportsPage.statCostliestVehicle')}</dt>
                      <dd className="font-medium text-slate-800 dark:text-slate-200">{cv ? cv.registrationNumber : '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-500 dark:text-slate-400">{t('reportsPage.statBestDriver')}</dt>
                      <dd className="font-medium text-slate-800 dark:text-slate-200">{bestDriver ? bestDriver.fullName : '—'}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </div>
        )}

        <section>
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">
            {t('reportsPage.expensesByVehicle')} <span className="font-normal text-slate-400">({t('reportsPage.amountsInFcfa')})</span>
          </h2>
          {vehicleExpenses.isLoading ? <LoadingPanel /> : vehicles.length === 0 ? (
            <EmptyState icon={Truck} title={t('reportsPage.emptyVehicleExpenses')} />
          ) : (
            <>
              <div className="card-padded mb-4">
                <VehicleExpenseChart vehicles={vehicles} />
              </div>
              <DataTable
                data={vehicles}
                keyOf={(v) => v.vehicleId}
                maxBodyHeight="420px"
                columns={[
                  { header: t('compliancePage.colVehicle'), accessor: (v) => <span className="font-medium">{v.registrationNumber}</span> },
                  { header: t('reportsPage.colCity'), accessor: (v) => v.cityName ?? '—' },
                  ...MONTH_LABELS.map((label, index) => ({
                    header: label,
                    accessor: (v: typeof vehicles[number]) => <span className="whitespace-nowrap">{formatFcfaCompactNumber(amountFor(v.monthly, index + 1))}</span>,
                    align: 'right' as const,
                  })),
                  { header: t('reportsPage.colTotal'), accessor: (v) => <span className="whitespace-nowrap font-semibold">{formatFcfaCompactNumber(v.yearTotal)}</span>, align: 'right' },
                ]}
              />
            </>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">
            {t('reportsPage.expensesByCity')} <span className="font-normal text-slate-400">({t('reportsPage.amountsInFcfa')})</span>
          </h2>
          {cityExpenses.isLoading ? <LoadingPanel /> : cities.length === 0 ? (
            <EmptyState icon={MapPin} title={t('reportsPage.emptyCityExpenses')} />
          ) : (
            <>
              <div className="card-padded">
                <CityExpenseChart cities={cities} />
              </div>
            </>
          )}
        </section>

        <VehicleCostRankingPanel
          vehicles={vehicles}
          cities={profitabilityCities.map((c) => ({ id: c.id, name: c.name }))}
          isLoading={vehicleExpenses.isLoading}
        />

        <VehicleProfitabilityPanel
          vehicles={allVehicles.data?.content ?? []}
          profitability={vehicleProfitability.data ?? []}
          cities={profitabilityCities.map((c) => ({ id: c.id, name: c.name }))}
          isLoading={allVehicles.isLoading || vehicleProfitability.isLoading}
        />
      </div>

      <ClientListDrawer open={clientListOpen} onClose={() => setClientListOpen(false)} />
    </PageShell>
  );
}
