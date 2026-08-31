import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Building2, CheckCircle2, Clock, Hourglass, MapPin, Package, Plus, Repeat, Search, XCircle } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { DataTable } from '@/components/ui/DataTable';
import { MissionStatusBadge } from '@/components/ui/StatusBadge';
import { Drawer } from '@/components/ui/Drawer';
import { MissionDetailPanel } from '@/components/missions/MissionDetailPanel';
import { CreateMissionDrawer } from '@/components/missions/CreateMissionDrawer';
import { MissionAutomationListDrawer } from '@/components/missions/MissionAutomationListDrawer';
import { CreateClientDrawer } from '@/components/clients/CreateClientDrawer';
import { CreateAgencyDrawer } from '@/components/settings/CreateAgencyDrawer';
import { CreatePositionDrawer } from '@/components/settings/CreatePositionDrawer';
import { ProgressBar } from '@/components/missions/ProgressBar';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { missionApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime } from '@/lib/utils';
import type { MissionStatus } from '@/types/api';

const PAGE_SIZE = 20;

const STATUSES: MissionStatus[] = ['EN_ATTENTE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

export function MissionsPage() {
  const { t } = useTranslation();
  const canCreate = useAuthStore((state) => state.hasPermission('MISSION_CREATE'));
  const canManageClients = useAuthStore((state) => state.hasPermission('CLIENT_MANAGE'));
  const canManageAgencies = useAuthStore((state) => state.hasPermission('AGENCY_MANAGE'));
  const canManageCities = useAuthStore((state) => state.hasPermission('CITY_MANAGE'));
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [automationsOpen, setAutomationsOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createAgencyOpen, setCreateAgencyOpen] = useState(false);
  const [createPositionOpen, setCreatePositionOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MissionStatus | ''>('');
  const [driverFilter, setDriverFilter] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Arrivee depuis une alerte ("Voir la source") : ouvre directement la mission visee.
  // Depend de searchParams (pas juste du montage) car on peut deja etre sur cette page
  // quand l'alerte est cliquee, auquel cas React Router ne remonte pas le composant.
  useEffect(() => {
    const missionId = searchParams.get('missionId');
    if (missionId) {
      setSelectedId(Number(missionId));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const stats = useQuery({ queryKey: ['missions', 'stats'], queryFn: () => missionApi.stats() });
  // Le backend ne filtre pas la liste par statut/chauffeur/destination : on recupere un lot
  // large et le filtrage + la pagination se font cote client, comme sur Maintenance et Carburant.
  const list = useQuery({ queryKey: ['missions', 'list-all'], queryFn: () => missionApi.list(0, 300) });

  const resetPage = () => setPage(0);

  const allMissions = list.data?.content ?? [];
  const driverOptions = Array.from(new Set(allMissions.map((m) => m.driverName))).sort();
  const destinationOptions = Array.from(new Set(allMissions.map((m) => m.destinationLabel).filter((d): d is string => !!d))).sort();

  const filtered = allMissions.filter((m) => {
    if (statusFilter && m.status !== statusFilter) return false;
    if (driverFilter && m.driverName !== driverFilter) return false;
    if (destinationFilter && m.destinationLabel !== destinationFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        m.missionNumber.toLowerCase().includes(q) ||
        (m.clientName ?? '').toLowerCase().includes(q) ||
        m.driverName.toLowerCase().includes(q)
      );
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedMission = allMissions.find((m) => m.id === selectedId);

  return (
    <PageShell
      title={t('missionsPage.title')}
      subtitle={t('missionsPage.subtitle')}
    >
      <div className="space-y-6">
        <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <StatCard label={t('missionsPage.statTotal')} value={String(stats.data?.total ?? '—')} icon={Package} accent="blue" />
          <StatCard label={t('status.mission.TERMINEE')} value={String(stats.data?.terminees ?? '—')} icon={CheckCircle2} accent="green" />
          <StatCard label={t('status.mission.EN_COURS')} value={String(stats.data?.enCours ?? '—')} icon={Clock} accent="amber" />
          <StatCard label={t('status.mission.EN_ATTENTE')} value={String(stats.data?.enAttente ?? '—')} icon={Hourglass} accent="slate" />
          <StatCard label={t('status.mission.ANNULEE')} value={String(stats.data?.annulees ?? '—')} icon={XCircle} accent="red" />
        </StatGrid>

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder={t('missionsPage.searchPlaceholder')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            />
          </div>
          <select
            className="input w-auto"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as MissionStatus | ''); resetPage(); }}
          >
            <option value="">{t('fuelPage.allStatuses')}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>{t(`status.mission.${value}`)}</option>
            ))}
          </select>
          <select
            className="input w-auto"
            value={driverFilter}
            onChange={(e) => { setDriverFilter(e.target.value); resetPage(); }}
          >
            <option value="">{t('missionsPage.allDrivers')}</option>
            {driverOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select
            className="input w-auto"
            value={destinationFilter}
            onChange={(e) => { setDestinationFilter(e.target.value); resetPage(); }}
          >
            <option value="">{t('missionsPage.allDestinations')}</option>
            {destinationOptions.map((dest) => <option key={dest} value={dest}>{dest}</option>)}
          </select>

          <div className="ml-auto flex gap-2">
            {canManageCities && (
              <button onClick={() => setCreatePositionOpen(true)} className="btn-ghost">
                <MapPin size={16} />
                {t('missionsPage.newDeliveryPoint')}
              </button>
            )}
            {canManageAgencies && (
              <button onClick={() => setCreateAgencyOpen(true)} className="btn-ghost">
                <Building2 size={16} />
                {t('missionsPage.newSite')}
              </button>
            )}
            {canManageClients && (
              <button onClick={() => setCreateClientOpen(true)} className="btn-ghost">
                <Building2 size={16} />
                {t('missionsPage.newClient')}
              </button>
            )}
            {canCreate && (
              <button onClick={() => setAutomationsOpen(true)} className="btn-ghost">
                <Repeat size={16} />
                {t('missionsPage.automateMission')}
              </button>
            )}
            {canCreate && (
              <button onClick={() => setCreateOpen(true)} className="btn-primary">
                <Plus size={16} />
                {t('missionsPage.newMission')}
              </button>
            )}
          </div>
        </div>

        {list.isLoading ? (
          <LoadingPanel />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t('missionsPage.emptyTitle')}
            action={allMissions.length ? t('fuelPage.emptyLogsActionFiltered') : t('missionsPage.emptyAction')}
          />
        ) : (
          <DataTable
            data={pageItems}
            keyOf={(m) => m.id}
            onRowClick={(m) => setSelectedId(m.id)}
            page={page}
            totalPages={totalPages}
            totalElements={filtered.length}
            onPageChange={setPage}
            columns={[
              { header: t('driverPortalPage.colMissionNumber'), accessor: (m) => <span className="font-medium tabular">{m.missionNumber}</span> },
              { header: t('compliancePage.colDate'), accessor: (m) => formatDateTime(m.plannedStart) },
              { header: t('driverPortalPage.colClient'), accessor: (m) => m.clientName ?? '—' },
              { header: t('missionsPage.colRoute'), accessor: (m) => `${m.originLabel ?? '—'} → ${m.destinationLabel ?? '—'}` },
              { header: t('compliancePage.colVehicle'), accessor: (m) => m.registrationNumber },
              { header: t('driversPage.colDriver'), accessor: (m) => m.driverName },
              { header: t('compliancePage.colStatus'), accessor: (m) => <MissionStatusBadge status={m.status} /> },
              { header: t('missionsPage.colProgress'), accessor: (m) => <ProgressBar value={m.progress} /> },
            ]}
          />
        )}
      </div>

      <Drawer
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={selectedMission?.missionNumber ?? ''}
        subtitle={selectedMission?.clientName ?? undefined}
      >
        {selectedId !== null && <MissionDetailPanel missionId={selectedId} />}
      </Drawer>

      <CreateMissionDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
      <MissionAutomationListDrawer open={automationsOpen} onClose={() => setAutomationsOpen(false)} canCreate={canCreate} />
      <CreateClientDrawer open={createClientOpen} onClose={() => setCreateClientOpen(false)} />
      <CreateAgencyDrawer open={createAgencyOpen} onClose={() => setCreateAgencyOpen(false)} />
      <CreatePositionDrawer open={createPositionOpen} onClose={() => setCreatePositionOpen(false)} />
    </PageShell>
  );
}
