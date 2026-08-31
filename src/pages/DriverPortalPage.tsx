import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, IdCard, Package, Plus, Truck, User, Wrench } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { DataTable } from '@/components/ui/DataTable';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MissionStatusBadge } from '@/components/ui/StatusBadge';
import { CreateMyInspectionDrawer } from '@/components/driver-portal/CreateMyInspectionDrawer';
import { CreateMyCarteGriseDrawer } from '@/components/driver-portal/CreateMyCarteGriseDrawer';
import { CreateMyClaimDrawer } from '@/components/driver-portal/CreateMyClaimDrawer';
import { complianceApi } from '@/api/compliance';
import { driverApi, missionApi } from '@/api/endpoints';
import { formatDate, formatDateTime } from '@/lib/utils';

type Tab = 'missions' | 'visites' | 'sinistres' | 'cartes_grises';

const TABS: { id: Tab; labelKey: string }[] = [
  { id: 'missions', labelKey: 'driverPortalPage.tabMissions' },
  { id: 'visites', labelKey: 'compliancePage.tabInspections' },
  { id: 'sinistres', labelKey: 'compliancePage.tabClaims' },
  { id: 'cartes_grises', labelKey: 'compliancePage.tabCartesGrises' },
];

// Reutilise les cles deja definies pour la page Conformite (memes types/statuts de sinistre).
const CLAIM_TYPE_KEYS: Record<string, string> = {
  COLLISION: 'compliancePage.claimTypeCollision', VOL: 'compliancePage.claimTypeTheft', INCENDIE: 'compliancePage.claimTypeFire',
  DEGATS_MATERIELS: 'compliancePage.claimTypeMaterialDamage', DOMMAGES_CORPORELS: 'compliancePage.claimTypeBodilyDamage', AUTRE: 'compliancePage.claimTypeOther',
};

const CLAIM_STATUS_KEYS: Record<string, string> = {
  DECLARE: 'compliancePage.claimStatusDeclared', EN_INSTRUCTION: 'compliancePage.claimStatusUnderReview',
  ACCEPTE: 'compliancePage.claimStatusAccepted', REFUSE: 'compliancePage.claimStatusRefused', CLOTURE: 'compliancePage.claimStatusClosed',
};

/**
 * Espace chauffeur.
 *
 * Chaque chauffeur y voit ses missions et ce qu'il a lui-meme saisi —
 * jamais les entrees d'un autre. Une fois enregistree, une entree ne
 * peut plus etre modifiee : il n'existe volontairement aucune action
 * d'edition sur cette page (RG espace chauffeur).
 */
export function DriverPortalPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('missions');
  const [createInspectionOpen, setCreateInspectionOpen] = useState(false);
  const [createClaimOpen, setCreateClaimOpen] = useState(false);
  const [createCarteGriseOpen, setCreateCarteGriseOpen] = useState(false);

  const me = useQuery({ queryKey: ['driver-portal', 'me'], queryFn: () => driverApi.me(), retry: false });
  const missions = useQuery({
    queryKey: ['driver-portal', 'missions'], queryFn: () => missionApi.mine(),
    enabled: tab === 'missions', retry: false,
  });
  const inspections = useQuery({
    queryKey: ['driver-portal', 'inspections'], queryFn: () => complianceApi.mineInspections(), enabled: tab === 'visites',
  });
  const claims = useQuery({
    queryKey: ['driver-portal', 'claims'], queryFn: () => complianceApi.mineClaims(), enabled: tab === 'sinistres',
  });
  const cartesGrises = useQuery({
    queryKey: ['driver-portal', 'cartes-grises'],
    queryFn: () => complianceApi.mineCartesGrises(),
    enabled: tab === 'cartes_grises',
  });

  const hasVehicle = Boolean(me.data?.vehicleId && me.data?.registrationNumber);

  if (me.isError) {
    return (
      <PageShell title={t('driverPortalPage.title')} subtitle={t('driverPortalPage.subtitle')}>
        <EmptyState icon={User} title={t('driverPortalPage.noProfileTitle')}
                    action={t('driverPortalPage.noProfileAction')} />
      </PageShell>
    );
  }

  return (
    <PageShell title={t('driverPortalPage.title')} subtitle={t('driverPortalPage.subtitle')}>
      <div className="space-y-6">
        <div className="card flex flex-wrap items-center gap-3 px-5 py-4">
          <Truck size={18} className="shrink-0 text-accent" />
          {me.isLoading ? (
            <span className="text-sm text-slate-500">{t('common.loading')}</span>
          ) : hasVehicle ? (
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {t('driverPortalPage.assignedVehicle')} <span className="font-medium">{me.data?.registrationNumber}</span>
            </span>
          ) : (
            <span className="text-sm text-amber-700 dark:text-amber-500">
              {t('driverPortalPage.noVehicleAssigned')}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`btn-ghost ${tab === item.id ? 'border-accent bg-accent-soft text-accent' : ''}`}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>

          {tab === 'visites' && (
            <button onClick={() => setCreateInspectionOpen(true)} className="btn-primary" disabled={!hasVehicle}>
              <Plus size={16} />{t('compliancePage.newInspection')}
            </button>
          )}
          {tab === 'sinistres' && (
            <button onClick={() => setCreateClaimOpen(true)} className="btn-primary" disabled={!hasVehicle}>
              <Plus size={16} />{t('compliancePage.declareClaim')}
            </button>
          )}
          {tab === 'cartes_grises' && (
            <button onClick={() => setCreateCarteGriseOpen(true)} className="btn-primary" disabled={!hasVehicle}>
              <Plus size={16} />{t('compliancePage.newCarteGrise')}
            </button>
          )}
        </div>

        {tab === 'missions' && (
          missions.isLoading ? <LoadingPanel /> : !missions.data?.length ? (
            <EmptyState icon={Package} title={t('driverPortalPage.emptyMissionsTitle')}
                        action={t('driverPortalPage.emptyMissionsAction')} />
          ) : (
            <DataTable
              data={missions.data}
              keyOf={(m) => m.id}
              columns={[
                { header: t('driverPortalPage.colMissionNumber'), accessor: (m) => <span className="font-medium tabular">{m.missionNumber}</span> },
                { header: t('compliancePage.colDate'), accessor: (m) => formatDateTime(m.plannedStart) },
                { header: t('driverPortalPage.colClient'), accessor: (m) => m.clientName ?? '—' },
                { header: t('driverPortalPage.colOrigin'), accessor: (m) => m.originLabel },
                { header: t('driverPortalPage.colDestination'), accessor: (m) => m.destinationLabel },
                { header: t('compliancePage.colStatus'), accessor: (m) => <MissionStatusBadge status={m.status} /> },
              ]}
            />
          )
        )}

        {tab === 'visites' && (
          inspections.isLoading ? <LoadingPanel /> : !inspections.data?.length ? (
            <EmptyState icon={Wrench} title={t('driverPortalPage.emptyInspectionsTitle')}
                        action={t('driverPortalPage.emptyInspectionsAction')} />
          ) : (
            <DataTable
              data={inspections.data}
              keyOf={(i) => i.id}
              columns={[
                { header: t('compliancePage.colVehicle'), accessor: (i) => <span className="font-medium">{i.registrationNumber}</span> },
                { header: t('compliancePage.colDate'), accessor: (i) => formatDate(i.inspectionDate) },
                { header: t('compliancePage.colNextDueDate'), accessor: (i) => formatDate(i.nextInspectionDate) },
                {
                  header: t('compliancePage.colResult'),
                  accessor: (i) => (
                    <span className={
                      i.result === 'CONFORME' ? 'text-emerald-600'
                        : i.result === 'NON_CONFORME' ? 'text-red-600' : 'text-amber-600'
                    }>
                      {i.result === 'CONFORME' ? t('compliancePage.resultConform')
                        : i.result === 'NON_CONFORME' ? t('compliancePage.resultNonConform') : t('compliancePage.resultWithReservations')}
                    </span>
                  ),
                },
              ]}
            />
          )
        )}

        {tab === 'sinistres' && (
          claims.isLoading ? <LoadingPanel /> : !claims.data?.length ? (
            <EmptyState icon={AlertTriangle} title={t('compliancePage.emptyClaimsTitle')}
                        action={t('compliancePage.emptyClaimsAction')} />
          ) : (
            <DataTable
              data={claims.data}
              keyOf={(c) => c.id}
              columns={[
                { header: t('compliancePage.colClaimNumber'), accessor: (c) => <span className="font-medium tabular">{c.claimNumber}</span> },
                { header: t('compliancePage.colDate'), accessor: (c) => formatDate(c.incidentDate) },
                { header: t('compliancePage.colType'), accessor: (c) => t(CLAIM_TYPE_KEYS[c.claimType]) },
                { header: t('compliancePage.colStatus'), accessor: (c) => t(CLAIM_STATUS_KEYS[c.status]) },
              ]}
            />
          )
        )}

        {tab === 'cartes_grises' && (
          cartesGrises.isLoading ? <LoadingPanel /> : !cartesGrises.data?.length ? (
            <EmptyState icon={IdCard} title={t('driverPortalPage.emptyCartesGrisesTitle')}
                        action={t('driverPortalPage.emptyCartesGrisesAction')} />
          ) : (
            <DataTable
              data={cartesGrises.data}
              keyOf={(c) => c.id}
              columns={[
                { header: t('compliancePage.colRegistrationNumber'), accessor: (c) => <span className="font-medium tabular">{c.registrationNumber}</span> },
                { header: t('compliancePage.colChassisNumber'), accessor: (c) => c.chassisNumber },
                { header: t('compliancePage.colBrand'), accessor: (c) => c.brand },
                { header: t('compliancePage.colExpiry'), accessor: (c) => formatDate(c.expiryDate) },
              ]}
            />
          )
        )}
      </div>

      {hasVehicle && me.data && (
        <>
          <CreateMyInspectionDrawer
            open={createInspectionOpen}
            onClose={() => setCreateInspectionOpen(false)}
            vehicleId={me.data.vehicleId as number}
            registrationNumber={me.data.registrationNumber as string}
          />
          <CreateMyClaimDrawer
            open={createClaimOpen}
            onClose={() => setCreateClaimOpen(false)}
            vehicleId={me.data.vehicleId as number}
            registrationNumber={me.data.registrationNumber as string}
          />
          <CreateMyCarteGriseDrawer
            open={createCarteGriseOpen}
            onClose={() => setCreateCarteGriseOpen(false)}
            vehicleId={me.data.vehicleId as number}
            registrationNumber={me.data.registrationNumber as string}
          />
        </>
      )}
    </PageShell>
  );
}
