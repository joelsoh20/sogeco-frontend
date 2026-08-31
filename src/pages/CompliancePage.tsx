import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CreditCard, FileBadge, IdCard, Pencil, Plus, ShieldCheck, Wrench } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { DataTable } from '@/components/ui/DataTable';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { UnifiedSchedule } from '@/components/compliance/UnifiedSchedule';
import { CreatePolicyDrawer } from '@/components/compliance/CreatePolicyDrawer';
import { EditPolicyDrawer } from '@/components/compliance/EditPolicyDrawer';
import { CreateInspectionDrawer } from '@/components/compliance/CreateInspectionDrawer';
import { EditInspectionDrawer } from '@/components/compliance/EditInspectionDrawer';
import { CreateClaimDrawer } from '@/components/compliance/CreateClaimDrawer';
import { EditClaimDrawer } from '@/components/compliance/EditClaimDrawer';
import { CreateCarteBleueDrawer } from '@/components/compliance/CreateCarteBleueDrawer';
import { EditCarteBleueDrawer } from '@/components/compliance/EditCarteBleueDrawer';
import { CreateCarteGriseDrawer } from '@/components/compliance/CreateCarteGriseDrawer';
import { EditCarteGriseDrawer } from '@/components/compliance/EditCarteGriseDrawer';
import { CreateLicenceTransportDrawer } from '@/components/compliance/CreateLicenceTransportDrawer';
import { EditLicenceTransportDrawer } from '@/components/compliance/EditLicenceTransportDrawer';
import { complianceApi } from '@/api/compliance';
import { useAuthStore } from '@/store/authStore';
import { canEditRecord } from '@/lib/editWindow';
import { formatDate, formatFcfa, formatFcfaCompact } from '@/lib/utils';
import type { CarteBleue, CarteGrise, Claim, InsurancePolicy, TechnicalInspection, TransportLicense } from '@/types/compliance';

/** RG-8-EDIT : un document reste modifiable 24h apres sa creation (au-dela, admin uniquement). */
const DOCUMENT_EDIT_WINDOW_HOURS = 24;

type Tab = 'echeancier' | 'assurances' | 'visites' | 'sinistres' | 'cartes_bleues' | 'cartes_grises' | 'licences_transport';

const TABS: { id: Tab; labelKey: string }[] = [
  { id: 'echeancier', labelKey: 'compliancePage.tabSchedule' },
  { id: 'assurances', labelKey: 'compliancePage.tabPolicies' },
  { id: 'visites', labelKey: 'compliancePage.tabInspections' },
  { id: 'sinistres', labelKey: 'compliancePage.tabClaims' },
  { id: 'cartes_bleues', labelKey: 'compliancePage.tabCartesBleues' },
  { id: 'cartes_grises', labelKey: 'compliancePage.tabCartesGrises' },
  { id: 'licences_transport', labelKey: 'compliancePage.tabLicenses' },
];

const CLAIM_TYPE_KEYS: Record<string, string> = {
  COLLISION: 'compliancePage.claimTypeCollision', VOL: 'compliancePage.claimTypeTheft', INCENDIE: 'compliancePage.claimTypeFire',
  DEGATS_MATERIELS: 'compliancePage.claimTypeMaterialDamage', DOMMAGES_CORPORELS: 'compliancePage.claimTypeBodilyDamage', AUTRE: 'compliancePage.claimTypeOther',
};

const CLAIM_STATUS_KEYS: Record<string, string> = {
  DECLARE: 'compliancePage.claimStatusDeclared', EN_INSTRUCTION: 'compliancePage.claimStatusUnderReview',
  ACCEPTE: 'compliancePage.claimStatusAccepted', REFUSE: 'compliancePage.claimStatusRefused', CLOTURE: 'compliancePage.claimStatusClosed',
};

export function CompliancePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('echeancier');
  const [createPolicyOpen, setCreatePolicyOpen] = useState(false);
  const [editPolicyTarget, setEditPolicyTarget] = useState<InsurancePolicy | null>(null);
  const [createInspectionOpen, setCreateInspectionOpen] = useState(false);
  const [editInspectionTarget, setEditInspectionTarget] = useState<TechnicalInspection | null>(null);
  const [createClaimOpen, setCreateClaimOpen] = useState(false);
  const [editClaimTarget, setEditClaimTarget] = useState<Claim | null>(null);
  const [createCarteBleueOpen, setCreateCarteBleueOpen] = useState(false);
  const [editCarteBleueTarget, setEditCarteBleueTarget] = useState<CarteBleue | null>(null);
  const [createCarteGriseOpen, setCreateCarteGriseOpen] = useState(false);
  const [editCarteGriseTarget, setEditCarteGriseTarget] = useState<CarteGrise | null>(null);
  const [createLicenceTransportOpen, setCreateLicenceTransportOpen] = useState(false);
  const [editLicenceTarget, setEditLicenceTarget] = useState<TransportLicense | null>(null);

  const canUpdateInsurance = useAuthStore((state) => state.hasPermission('INSURANCE_UPDATE'));
  const isAdmin = useAuthStore((state) => state.hasRole('ROLE_ADMIN'));

  const stats = useQuery({ queryKey: ['compliance', 'stats'], queryFn: () => complianceApi.stats() });
  const schedule = useQuery({ queryKey: ['compliance', 'schedule'], queryFn: () => complianceApi.schedule(90) });
  const policies = useQuery({
    queryKey: ['compliance', 'policies'], queryFn: () => complianceApi.policies(0, 20), enabled: tab === 'assurances',
  });
  const inspections = useQuery({
    queryKey: ['compliance', 'inspections'], queryFn: () => complianceApi.inspections(0, 20), enabled: tab === 'visites',
  });
  const claims = useQuery({
    queryKey: ['compliance', 'claims'], queryFn: () => complianceApi.claims(0, 20), enabled: tab === 'sinistres',
  });
  const cartesBleues = useQuery({
    queryKey: ['compliance', 'cartes-bleues'],
    queryFn: () => complianceApi.cartesBleues(0, 20),
    enabled: tab === 'cartes_bleues',
  });
  const cartesGrises = useQuery({
    queryKey: ['compliance', 'cartes-grises'],
    queryFn: () => complianceApi.cartesGrises(0, 20),
    enabled: tab === 'cartes_grises',
  });
  const transportLicenses = useQuery({
    queryKey: ['compliance', 'transport-licenses'],
    queryFn: () => complianceApi.transportLicenses(0, 20),
    enabled: tab === 'licences_transport',
  });

  return (
    <PageShell
      title={t('compliancePage.title')}
      subtitle={t('compliancePage.subtitle')}
    >
      <div className="space-y-6">
        <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t('compliancePage.statActivePolicies')}
            value={String(stats.data?.activePolicies ?? '—')}
            icon={ShieldCheck}
            hint={t('compliancePage.statActivePoliciesHint', { count: stats.data?.expiringPolicies30Days ?? 0 })}
            accent="blue"
          />
          <StatCard
            label={t('compliancePage.statNonConformInspections')}
            value={String(stats.data?.nonConformInspections ?? '—')}
            icon={Wrench}
            accent={(stats.data?.nonConformInspections ?? 0) > 0 ? 'red' : 'green'}
          />
          <StatCard
            label={t('compliancePage.statOpenClaims')}
            value={String(stats.data?.openClaims ?? '—')}
            icon={AlertTriangle}
            hint={t('compliancePage.statOpenClaimsHint', { count: stats.data?.totalClaims ?? 0 })}
            accent="amber"
          />
          <StatCard
            label={t('compliancePage.statClaimsCost')}
            value={formatFcfaCompact(stats.data?.totalEstimatedCost)}
            hint={t('compliancePage.statClaimsCostHint', { amount: formatFcfaCompact(stats.data?.totalReimbursed) })}
            accent="slate"
          />
        </StatGrid>

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

          {tab === 'assurances' && (
            <button onClick={() => setCreatePolicyOpen(true)} className="btn-primary">
              <Plus size={16} />{t('compliancePage.newPolicy')}
            </button>
          )}
          {tab === 'visites' && (
            <button onClick={() => setCreateInspectionOpen(true)} className="btn-primary">
              <Plus size={16} />{t('compliancePage.newInspection')}
            </button>
          )}
          {tab === 'sinistres' && (
            <button onClick={() => setCreateClaimOpen(true)} className="btn-primary">
              <Plus size={16} />{t('compliancePage.declareClaim')}
            </button>
          )}
          {tab === 'cartes_bleues' && (
            <button onClick={() => setCreateCarteBleueOpen(true)} className="btn-primary">
              <Plus size={16} />{t('compliancePage.newCarteBleue')}
            </button>
          )}
          {tab === 'cartes_grises' && (
            <button onClick={() => setCreateCarteGriseOpen(true)} className="btn-primary">
              <Plus size={16} />{t('compliancePage.newCarteGrise')}
            </button>
          )}
          {tab === 'licences_transport' && (
            <button onClick={() => setCreateLicenceTransportOpen(true)} className="btn-primary">
              <Plus size={16} />{t('compliancePage.newLicense')}
            </button>
          )}
        </div>

        {tab === 'echeancier' && (
          schedule.isLoading ? <LoadingPanel /> : <UnifiedSchedule items={schedule.data ?? []} />
        )}

        {tab === 'assurances' && (
          policies.isLoading ? <LoadingPanel /> : !policies.data?.content.length ? (
            <EmptyState icon={ShieldCheck} title={t('compliancePage.emptyPoliciesTitle')}
                        action={t('compliancePage.emptyPoliciesAction')} />
          ) : (
            <DataTable
              data={policies.data.content}
              keyOf={(p) => p.id}
              columns={[
                { header: t('compliancePage.colPolicyNumber'), accessor: (p) => <span className="font-medium tabular">{p.policyNumber}</span> },
                { header: t('compliancePage.colInsurer'), accessor: (p) => p.insurerName },
                {
                  header: t('compliancePage.colVehicle'),
                  accessor: (p) => p.coversFleet
                    ? t('compliancePage.wholeFleet', { count: p.vehicles.length })
                    : p.vehicles.join(', ') || p.vehicleRegistration || '—',
                },
                { header: t('compliancePage.colDueDate'), accessor: (p) => formatDate(p.endDate) },
                { header: t('compliancePage.colPremium'), accessor: (p) => formatFcfa(p.premiumAmount), align: 'right' },
                {
                  header: t('compliancePage.colStatus'),
                  accessor: (p) => (
                    <span className={p.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-500'}>
                      {p.status === 'ACTIVE' ? t('compliancePage.statusActive') : p.status === 'EXPIREE' ? t('compliancePage.statusExpired') : t('compliancePage.statusTerminated')}
                    </span>
                  ),
                },
                {
                  header: '',
                  accessor: (p) => (
                    canUpdateInsurance && canEditRecord(p.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS) && (
                      <button onClick={() => setEditPolicyTarget(p)} className="btn-ghost py-1 text-xs">
                        <Pencil size={13} />
                        {t('common.edit')}
                      </button>
                    )
                  ),
                  align: 'right',
                },
              ]}
            />
          )
        )}

        {tab === 'visites' && (
          inspections.isLoading ? <LoadingPanel /> : !inspections.data?.content.length ? (
            <EmptyState icon={Wrench} title={t('compliancePage.emptyInspectionsTitle')}
                        action={t('compliancePage.emptyInspectionsAction')} />
          ) : (
            <DataTable
              data={inspections.data.content}
              keyOf={(i) => i.id}
              columns={[
                { header: t('compliancePage.colVehicle'), accessor: (i) => <span className="font-medium">{i.registrationNumber}</span> },
                { header: t('compliancePage.colDate'), accessor: (i) => formatDate(i.inspectionDate) },
                { header: t('compliancePage.colCenter'), accessor: (i) => i.centerName ?? '—' },
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
                { header: t('compliancePage.colCost'), accessor: (i) => formatFcfa(i.cost), align: 'right' },
                {
                  header: '',
                  accessor: (i) => (
                    canUpdateInsurance && canEditRecord(i.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS) && (
                      <button onClick={() => setEditInspectionTarget(i)} className="btn-ghost py-1 text-xs">
                        <Pencil size={13} />
                        {t('common.edit')}
                      </button>
                    )
                  ),
                  align: 'right',
                },
              ]}
            />
          )
        )}

        {tab === 'sinistres' && (
          claims.isLoading ? <LoadingPanel /> : !claims.data?.content.length ? (
            <EmptyState icon={AlertTriangle} title={t('compliancePage.emptyClaimsTitle')}
                        action={t('compliancePage.emptyClaimsAction')} />
          ) : (
            <DataTable
              data={claims.data.content}
              keyOf={(c) => c.id}
              columns={[
                { header: t('compliancePage.colClaimNumber'), accessor: (c) => <span className="font-medium tabular">{c.claimNumber}</span> },
                { header: t('compliancePage.colVehicle'), accessor: (c) => c.registrationNumber },
                { header: t('compliancePage.colDate'), accessor: (c) => formatDate(c.incidentDate) },
                { header: t('compliancePage.colType'), accessor: (c) => t(CLAIM_TYPE_KEYS[c.claimType]) },
                { header: t('compliancePage.colStatus'), accessor: (c) => t(CLAIM_STATUS_KEYS[c.status]) },
                { header: t('compliancePage.colNetCost'), accessor: (c) => formatFcfa(c.netCost), align: 'right' },
                {
                  header: '',
                  accessor: (c) => (
                    canUpdateInsurance && canEditRecord(c.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS) && (
                      <button onClick={() => setEditClaimTarget(c)} className="btn-ghost py-1 text-xs">
                        <Pencil size={13} />
                        {t('common.edit')}
                      </button>
                    )
                  ),
                  align: 'right',
                },
              ]}
            />
          )
        )}

        {tab === 'cartes_bleues' && (
          cartesBleues.isLoading ? <LoadingPanel /> : !cartesBleues.data?.content.length ? (
            <EmptyState icon={CreditCard} title={t('compliancePage.emptyCartesBleuesTitle')}
                        action={t('compliancePage.emptyCartesBleuesAction')} />
          ) : (
            <DataTable
              data={cartesBleues.data.content}
              keyOf={(c) => c.id}
              columns={[
                { header: t('compliancePage.colVehicle'), accessor: (c) => <span className="font-medium">{c.registrationNumber}</span> },
                { header: t('compliancePage.colReceiptNumber'), accessor: (c) => <span className="tabular">{c.receiptNumber}</span> },
                { header: t('compliancePage.colCategory'), accessor: (c) => c.category ?? '—' },
                { header: t('compliancePage.colPower'), accessor: (c) => c.power != null ? t('compliancePage.powerCv', { power: c.power }) : '—' },
                { header: t('compliancePage.colExpiry'), accessor: (c) => formatDate(c.expiryDate) },
                { header: t('compliancePage.colCost'), accessor: (c) => formatFcfa(c.cost), align: 'right' },
                {
                  header: '',
                  accessor: (c) => (
                    canUpdateInsurance && canEditRecord(c.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS) && (
                      <button onClick={() => setEditCarteBleueTarget(c)} className="btn-ghost py-1 text-xs">
                        <Pencil size={13} />
                        {t('common.edit')}
                      </button>
                    )
                  ),
                  align: 'right',
                },
              ]}
            />
          )
        )}

        {tab === 'cartes_grises' && (
          cartesGrises.isLoading ? <LoadingPanel /> : !cartesGrises.data?.content.length ? (
            <EmptyState icon={IdCard} title={t('compliancePage.emptyCartesGrisesTitle')}
                        action={t('compliancePage.emptyCartesGrisesAction')} />
          ) : (
            <DataTable
              data={cartesGrises.data.content}
              keyOf={(c) => c.id}
              columns={[
                { header: t('compliancePage.colVehicle'), accessor: (c) => <span className="font-medium">{c.vehicleRegistrationNumber}</span> },
                { header: t('compliancePage.colRegistrationNumber'), accessor: (c) => <span className="tabular">{c.registrationNumber}</span> },
                { header: t('compliancePage.colChassisNumber'), accessor: (c) => c.chassisNumber },
                { header: t('compliancePage.colBrand'), accessor: (c) => c.brand },
                { header: t('compliancePage.colExpiry'), accessor: (c) => formatDate(c.expiryDate) },
                { header: t('compliancePage.colAmount'), accessor: (c) => formatFcfa(c.cost), align: 'right' },
                {
                  header: '',
                  accessor: (c) => (
                    canUpdateInsurance && canEditRecord(c.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS) && (
                      <button onClick={() => setEditCarteGriseTarget(c)} className="btn-ghost py-1 text-xs">
                        <Pencil size={13} />
                        {t('common.edit')}
                      </button>
                    )
                  ),
                  align: 'right',
                },
              ]}
            />
          )
        )}

        {tab === 'licences_transport' && (
          transportLicenses.isLoading ? <LoadingPanel /> : !transportLicenses.data?.content.length ? (
            <EmptyState icon={FileBadge} title={t('compliancePage.emptyLicensesTitle')}
                        action={t('compliancePage.emptyLicensesAction')} />
          ) : (
            <DataTable
              data={transportLicenses.data.content}
              keyOf={(l) => l.id}
              columns={[
                { header: t('compliancePage.colReference'), accessor: (l) => <span className="font-medium tabular">{l.reference}</span> },
                { header: t('compliancePage.colReceiptNumber'), accessor: (l) => l.receiptNumber ?? '—' },
                { header: t('compliancePage.colPower'), accessor: (l) => l.power ?? '—' },
                { header: t('compliancePage.colAuthority'), accessor: (l) => l.issuingAuthority ?? '—' },
                { header: t('compliancePage.colExpiry'), accessor: (l) => formatDate(l.expiryDate) },
                {
                  header: t('compliancePage.colStatus'),
                  accessor: (l) => (
                    <span className={l.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-500'}>
                      {l.status === 'ACTIVE' ? t('compliancePage.statusActive') : l.status === 'EXPIREE' ? t('compliancePage.statusExpired') : t('compliancePage.statusTerminated')}
                    </span>
                  ),
                },
                { header: t('compliancePage.colCost'), accessor: (l) => formatFcfa(l.cost), align: 'right' },
                {
                  header: '',
                  accessor: (l) => (
                    canUpdateInsurance && canEditRecord(l.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS) && (
                      <button onClick={() => setEditLicenceTarget(l)} className="btn-ghost py-1 text-xs">
                        <Pencil size={13} />
                        {t('common.edit')}
                      </button>
                    )
                  ),
                  align: 'right',
                },
              ]}
            />
          )
        )}
      </div>

      <CreatePolicyDrawer open={createPolicyOpen} onClose={() => setCreatePolicyOpen(false)} />
      {editPolicyTarget && (
        <EditPolicyDrawer open={!!editPolicyTarget} onClose={() => setEditPolicyTarget(null)} policy={editPolicyTarget} />
      )}
      <CreateInspectionDrawer open={createInspectionOpen} onClose={() => setCreateInspectionOpen(false)} />
      {editInspectionTarget && (
        <EditInspectionDrawer open={!!editInspectionTarget} onClose={() => setEditInspectionTarget(null)} inspection={editInspectionTarget} />
      )}
      <CreateClaimDrawer open={createClaimOpen} onClose={() => setCreateClaimOpen(false)} />
      {editClaimTarget && (
        <EditClaimDrawer open={!!editClaimTarget} onClose={() => setEditClaimTarget(null)} claim={editClaimTarget} />
      )}
      <CreateCarteBleueDrawer open={createCarteBleueOpen} onClose={() => setCreateCarteBleueOpen(false)} />
      {editCarteBleueTarget && (
        <EditCarteBleueDrawer open={!!editCarteBleueTarget} onClose={() => setEditCarteBleueTarget(null)} carte={editCarteBleueTarget} />
      )}
      <CreateCarteGriseDrawer open={createCarteGriseOpen} onClose={() => setCreateCarteGriseOpen(false)} />
      {editCarteGriseTarget && (
        <EditCarteGriseDrawer open={!!editCarteGriseTarget} onClose={() => setEditCarteGriseTarget(null)} carte={editCarteGriseTarget} />
      )}
      <CreateLicenceTransportDrawer open={createLicenceTransportOpen} onClose={() => setCreateLicenceTransportOpen(false)} />
      {editLicenceTarget && (
        <EditLicenceTransportDrawer open={!!editLicenceTarget} onClose={() => setEditLicenceTarget(null)} license={editLicenceTarget} />
      )}
    </PageShell>
  );
}
