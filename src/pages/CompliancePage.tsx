import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CreditCard, FileBadge, IdCard, Pencil, Plus, ShieldCheck, Stamp, Wrench } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { DataTable } from '@/components/ui/DataTable';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { UnifiedSchedule } from '@/components/compliance/UnifiedSchedule';
import { MissingDocumentsPanel } from '@/components/compliance/MissingDocumentsPanel';
import { ExpiredDocumentsPanel } from '@/components/compliance/ExpiredDocumentsPanel';
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
import { CreateCarteRoseDrawer } from '@/components/compliance/CreateCarteRoseDrawer';
import { EditCarteRoseDrawer } from '@/components/compliance/EditCarteRoseDrawer';
import { CreateLicenceTransportDrawer } from '@/components/compliance/CreateLicenceTransportDrawer';
import { EditLicenceTransportDrawer } from '@/components/compliance/EditLicenceTransportDrawer';
import { complianceApi } from '@/api/compliance';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { canEditRecord } from '@/lib/editWindow';
import { formatDate, formatFcfa, formatFcfaCompact } from '@/lib/utils';
import type { CarteBleue, CarteGrise, CarteRose, Claim, DeadlineItem, InsurancePolicy, MissingDocumentItem, TechnicalInspection, TransportLicense } from '@/types/compliance';

/** RG-8-EDIT : un document reste modifiable 24h apres sa creation (au-dela, admin uniquement). */
const DOCUMENT_EDIT_WINDOW_HOURS = 24;

type Tab = 'echeancier' | 'assurances' | 'visites' | 'sinistres' | 'cartes_bleues' | 'cartes_grises' | 'cartes_roses' | 'licences_transport';

const TABS: { id: Tab; labelKey: string }[] = [
  { id: 'echeancier', labelKey: 'compliancePage.tabSchedule' },
  { id: 'assurances', labelKey: 'compliancePage.tabPolicies' },
  { id: 'visites', labelKey: 'compliancePage.tabInspections' },
  { id: 'sinistres', labelKey: 'compliancePage.tabClaims' },
  { id: 'cartes_bleues', labelKey: 'compliancePage.tabCartesBleues' },
  { id: 'cartes_grises', labelKey: 'compliancePage.tabCartesGrises' },
  { id: 'cartes_roses', labelKey: 'compliancePage.tabCartesRoses' },
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
  const [createCarteRoseOpen, setCreateCarteRoseOpen] = useState(false);
  const [editCarteRoseTarget, setEditCarteRoseTarget] = useState<CarteRose | null>(null);
  const [createLicenceTransportOpen, setCreateLicenceTransportOpen] = useState(false);
  const [editLicenceTarget, setEditLicenceTarget] = useState<TransportLicense | null>(null);
  const [resolvingScheduleKey, setResolvingScheduleKey] = useState<string | null>(null);
  const [prefillVehicle, setPrefillVehicle] = useState<{ vehicleId: number; registrationNumber: string } | null>(null);

  const navigate = useNavigate();
  const canUpdateInsurance = useAuthStore((state) => state.hasPermission('INSURANCE_UPDATE'));
  const isAdmin = useAuthStore((state) => state.hasRole('ROLE_ADMIN'));

  /**
   * Clic sur une ligne de l'echeancier unifie : ouvre directement le
   * formulaire de mise a jour du document concerne, plutot que de
   * forcer l'utilisateur a retrouver le bon onglet puis la bonne ligne
   * lui-meme. Pour VISITE_TECHNIQUE/CARTE_BLEUE/CARTE_GRISE/CARTE_ROSE,
   * entityId designe le CAMION (pas le document) — ComplianceAnalyticsService
   * n'associe l'echeance qu'a un camion pour ces trois categories —
   * d'ou l'historique du camion suivi d'un rapprochement par date
   * d'echeance, plutot qu'un GET direct par id comme pour les deux
   * autres categories.
   */
  const handleScheduleItemClick = async (item: DeadlineItem) => {
    const key = `${item.category}-${item.entityId}-${item.dueDate}`;
    setResolvingScheduleKey(key);
    try {
      const canOpenEdit = canUpdateInsurance;

      switch (item.category) {
        case 'ASSURANCE': {
          const policy = await complianceApi.getPolicy(item.entityId);
          setTab('assurances');
          if (canOpenEdit && canEditRecord(policy.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS)) {
            setEditPolicyTarget(policy);
          }
          break;
        }
        case 'LICENCE_TRANSPORT': {
          const license = await complianceApi.getTransportLicense(item.entityId);
          setTab('licences_transport');
          if (canOpenEdit && canEditRecord(license.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS)) {
            setEditLicenceTarget(license);
          }
          break;
        }
        case 'VISITE_TECHNIQUE': {
          const history = await complianceApi.inspectionsForVehicle(item.entityId);
          const match = history.find((i) => i.nextInspectionDate === item.dueDate) ?? history[0];
          setTab('visites');
          if (match && canOpenEdit && canEditRecord(match.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS)) {
            setEditInspectionTarget(match);
          }
          break;
        }
        case 'CARTE_BLEUE': {
          const history = await complianceApi.cartesBleuesForVehicle(item.entityId);
          const match = history.find((c) => c.expiryDate === item.dueDate) ?? history[0];
          setTab('cartes_bleues');
          if (match && canOpenEdit && canEditRecord(match.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS)) {
            setEditCarteBleueTarget(match);
          }
          break;
        }
        case 'CARTE_GRISE': {
          const history = await complianceApi.cartesGrisesForVehicle(item.entityId);
          const match = history.find((c) => c.expiryDate === item.dueDate) ?? history[0];
          setTab('cartes_grises');
          if (match && canOpenEdit && canEditRecord(match.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS)) {
            setEditCarteGriseTarget(match);
          }
          break;
        }
        case 'CARTE_ROSE': {
          const history = await complianceApi.cartesRosesForVehicle(item.entityId);
          const match = history.find((c) => c.validTo === item.dueDate) ?? history[0];
          setTab('cartes_roses');
          if (match && canOpenEdit && canEditRecord(match.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS)) {
            setEditCarteRoseTarget(match);
          }
          break;
        }
        case 'PERMIS':
          // Le permis de conduire est une fiche chauffeur, pas un document
          // de cet ecran Conformite — direction la fiche du chauffeur concerne.
          navigate(`/chauffeurs?driverId=${item.entityId}`);
          break;
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setResolvingScheduleKey(null);
    }
  };

  /**
   * Clic sur une ligne du panneau "Documents manquants" : bascule sur le
   * bon onglet et ouvre directement le formulaire de creation, camion
   * deja selectionne — CreatePolicyDrawer identifie le camion par son
   * immatriculation (texte libre resolu cote serveur), les quatre autres
   * par son id (liste deroulante), d'ou prefillVehicle qui porte les deux.
   */
  const handleMissingDocumentClick = (item: MissingDocumentItem) => {
    setPrefillVehicle({ vehicleId: item.vehicleId, registrationNumber: item.registrationNumber });
    switch (item.category) {
      case 'ASSURANCE':
        setTab('assurances');
        setCreatePolicyOpen(true);
        break;
      case 'VISITE_TECHNIQUE':
        setTab('visites');
        setCreateInspectionOpen(true);
        break;
      case 'CARTE_BLEUE':
        setTab('cartes_bleues');
        setCreateCarteBleueOpen(true);
        break;
      case 'CARTE_GRISE':
        setTab('cartes_grises');
        setCreateCarteGriseOpen(true);
        break;
      case 'CARTE_ROSE':
        setTab('cartes_roses');
        setCreateCarteRoseOpen(true);
        break;
    }
  };

  const stats = useQuery({ queryKey: ['compliance', 'stats'], queryFn: () => complianceApi.stats() });
  const schedule = useQuery({ queryKey: ['compliance', 'schedule'], queryFn: () => complianceApi.schedule(90) });
  const missingDocuments = useQuery({
    queryKey: ['compliance', 'missing-documents'], queryFn: () => complianceApi.missingDocuments(),
  });
  // Notification a l'ouverture de l'ecran : documents expires et manquants, une fois par jour et par navigateur
  // (de nouveau si les chiffres changent).
  const expiredCount = (schedule.data ?? []).filter((i) => i.status === 'EXPIRE').length;
  const missingCount = (missingDocuments.data ?? []).length;
  useEffect(() => {
    if (!schedule.isSuccess || !missingDocuments.isSuccess || expiredCount + missingCount === 0) return;
    const key = `sogeco.compliance.notified.${new Date().toDateString()}`;
    if (sessionStorage.getItem(key) === `${expiredCount}/${missingCount}`) return;
    sessionStorage.setItem(key, `${expiredCount}/${missingCount}`);
    toast.error(t('expiredDocuments.toast', { expired: expiredCount, missing: missingCount }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.isSuccess, missingDocuments.isSuccess, expiredCount, missingCount]);

  const handleExpiredClick = (item: DeadlineItem) => {
    const tabByCategory: Partial<Record<DeadlineItem['category'], Tab>> = {
      ASSURANCE: 'assurances', VISITE_TECHNIQUE: 'visites', CARTE_BLEUE: 'cartes_bleues',
      CARTE_GRISE: 'cartes_grises', CARTE_ROSE: 'cartes_roses', LICENCE_TRANSPORT: 'licences_transport',
    };
    const target = tabByCategory[item.category];
    if (target) setTab(target);
  };

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
  const cartesRoses = useQuery({
    queryKey: ['compliance', 'cartes-roses'],
    queryFn: () => complianceApi.cartesRoses(0, 20),
    enabled: tab === 'cartes_roses',
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

        <ExpiredDocumentsPanel items={schedule.data ?? []} onItemClick={handleExpiredClick} />

        <MissingDocumentsPanel items={missingDocuments.data ?? []} onItemClick={handleMissingDocumentClick} />

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
          {tab === 'cartes_roses' && (
            <button onClick={() => setCreateCarteRoseOpen(true)} className="btn-primary">
              <Plus size={16} />{t('compliancePage.newCarteRose')}
            </button>
          )}
          {tab === 'licences_transport' && (
            <button onClick={() => setCreateLicenceTransportOpen(true)} className="btn-primary">
              <Plus size={16} />{t('compliancePage.newLicense')}
            </button>
          )}
        </div>

        {tab === 'echeancier' && (
          schedule.isLoading ? <LoadingPanel /> : (
            <UnifiedSchedule
              items={schedule.data ?? []}
              onItemClick={handleScheduleItemClick}
              resolvingKey={resolvingScheduleKey}
            />
          )
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

        {tab === 'cartes_roses' && (
          cartesRoses.isLoading ? <LoadingPanel /> : !cartesRoses.data?.content.length ? (
            <EmptyState icon={Stamp} title={t('compliancePage.emptyCartesRosesTitle')}
                        action={t('compliancePage.emptyCartesRosesAction')} />
          ) : (
            <DataTable
              data={cartesRoses.data.content}
              keyOf={(c) => c.id}
              columns={[
                { header: t('compliancePage.colVehicle'), accessor: (c) => <span className="font-medium">{c.vehicleRegistrationNumber}</span> },
                { header: t('carteRoseForm.insuredName'), accessor: (c) => c.insuredName },
                { header: t('compliancePage.colInsurer'), accessor: (c) => c.insurerName },
                { header: t('carteRoseForm.vehicleMakeType'), accessor: (c) => c.vehicleMakeType },
                { header: t('compliancePage.colExpiry'), accessor: (c) => formatDate(c.validTo) },
                { header: t('compliancePage.colCost'), accessor: (c) => formatFcfa(c.cost), align: 'right' },
                {
                  header: '',
                  accessor: (c) => (
                    canUpdateInsurance && canEditRecord(c.createdAt, isAdmin, DOCUMENT_EDIT_WINDOW_HOURS) && (
                      <button onClick={() => setEditCarteRoseTarget(c)} className="btn-ghost py-1 text-xs">
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

      <CreatePolicyDrawer
        open={createPolicyOpen}
        onClose={() => setCreatePolicyOpen(false)}
        initialVehicleRegistration={prefillVehicle?.registrationNumber}
      />
      {editPolicyTarget && (
        <EditPolicyDrawer open={!!editPolicyTarget} onClose={() => setEditPolicyTarget(null)} policy={editPolicyTarget} />
      )}
      <CreateInspectionDrawer
        open={createInspectionOpen}
        onClose={() => setCreateInspectionOpen(false)}
        initialVehicleId={prefillVehicle?.vehicleId}
      />
      {editInspectionTarget && (
        <EditInspectionDrawer open={!!editInspectionTarget} onClose={() => setEditInspectionTarget(null)} inspection={editInspectionTarget} />
      )}
      <CreateClaimDrawer open={createClaimOpen} onClose={() => setCreateClaimOpen(false)} />
      {editClaimTarget && (
        <EditClaimDrawer open={!!editClaimTarget} onClose={() => setEditClaimTarget(null)} claim={editClaimTarget} />
      )}
      <CreateCarteBleueDrawer
        open={createCarteBleueOpen}
        onClose={() => setCreateCarteBleueOpen(false)}
        initialVehicleId={prefillVehicle?.vehicleId}
      />
      {editCarteBleueTarget && (
        <EditCarteBleueDrawer open={!!editCarteBleueTarget} onClose={() => setEditCarteBleueTarget(null)} carte={editCarteBleueTarget} />
      )}
      <CreateCarteGriseDrawer
        open={createCarteGriseOpen}
        onClose={() => setCreateCarteGriseOpen(false)}
        initialVehicleId={prefillVehicle?.vehicleId}
      />
      {editCarteGriseTarget && (
        <EditCarteGriseDrawer open={!!editCarteGriseTarget} onClose={() => setEditCarteGriseTarget(null)} carte={editCarteGriseTarget} />
      )}
      <CreateCarteRoseDrawer
        open={createCarteRoseOpen}
        onClose={() => setCreateCarteRoseOpen(false)}
        initialVehicleId={prefillVehicle?.vehicleId}
      />
      {editCarteRoseTarget && (
        <EditCarteRoseDrawer open={!!editCarteRoseTarget} onClose={() => setEditCarteRoseTarget(null)} carte={editCarteRoseTarget} />
      )}
      <CreateLicenceTransportDrawer open={createLicenceTransportOpen} onClose={() => setCreateLicenceTransportOpen(false)} />
      {editLicenceTarget && (
        <EditLicenceTransportDrawer open={!!editLicenceTarget} onClose={() => setEditLicenceTarget(null)} license={editLicenceTarget} />
      )}
    </PageShell>
  );
}
