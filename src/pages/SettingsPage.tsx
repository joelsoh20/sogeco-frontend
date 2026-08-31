import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, Building2, Check, Copy, KeyRound, MapPin, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2, Truck, UserPlus, Users,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Drawer } from '@/components/ui/Drawer';
import { CreateUserDrawer } from '@/components/admin/CreateUserDrawer';
import { EditUserDrawer } from '@/components/admin/EditUserDrawer';
import { ChangeMyPasswordModal } from '@/components/layout/ChangeMyPasswordModal';
import { CreateInsurerDrawer } from '@/components/settings/CreateInsurerDrawer';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { DataTable } from '@/components/ui/DataTable';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { adminApi, driverApi, partnerApi, vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime } from '@/lib/utils';
import type { AlertRule, User } from '@/types/api';

type Tab = 'utilisateurs' | 'roles' | 'sites' | 'assurances' | 'alertes' | 'chauffeurs' | 'camions';

const TABS: { id: Tab; labelKey: string }[] = [
  { id: 'utilisateurs', labelKey: 'settingsPage.tabUsers' },
  { id: 'roles', labelKey: 'settingsPage.tabRoles' },
  { id: 'sites', labelKey: 'settingsPage.tabSites' },
  { id: 'chauffeurs', labelKey: 'settingsPage.tabDrivers' },
  { id: 'camions', labelKey: 'settingsPage.tabVehicles' },
  { id: 'assurances', labelKey: 'settingsPage.tabInsurers' },
  { id: 'alertes', labelKey: 'settingsPage.tabAlertRules' },
];

export function SettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('utilisateurs');
  const [page, setPage] = useState(0);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createInsurerOpen, setCreateInsurerOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const currentUserId = useAuthStore((state) => state.user?.id);

  const users = useQuery({ queryKey: ['admin', 'users', page], queryFn: () => adminApi.users(page, 20) });
  const roles = useQuery({ queryKey: ['admin', 'roles'], queryFn: adminApi.roles });
  const agencies = useQuery({ queryKey: ['admin', 'agencies'], queryFn: adminApi.agencies });
  const cities = useQuery({ queryKey: ['admin', 'cities'], queryFn: adminApi.cities });
  const rules = useQuery({ queryKey: ['admin', 'alertRules'], queryFn: adminApi.alertRules });
  const vehicleStats = useQuery({ queryKey: ['vehicles', 'stats'], queryFn: vehicleApi.stats });
  const drivers = useQuery({
    queryKey: ['drivers', 'list', page],
    queryFn: () => driverApi.list(page, 20),
    enabled: tab === 'chauffeurs',
  });
  const vehicles = useQuery({
    queryKey: ['vehicles', 'list', page],
    queryFn: () => vehicleApi.list(page, 20),
    enabled: tab === 'camions',
  });

  // Villes ayant reellement une implantation (agence, depot ou siege) — le referentiel
  // complet en compte des centaines, sans rapport avec l'administration du systeme.
  const citiesWithSite = (cities.data ?? []).filter((c) => c.hasSite);

  // Aperçu, pas une liste exhaustive : les 5 connexions les plus recentes parmi les
  // utilisateurs deja charges (page courante), triees par derniere connexion.
  const recentUsers = [...(users.data?.content ?? [])]
    .sort((a, b) => (b.lastLoginAt ?? '').localeCompare(a.lastLoginAt ?? ''))
    .slice(0, 5);
  const insurers = useQuery({
    queryKey: ['partners', 'ASSUREUR'],
    queryFn: () => partnerApi.active('ASSUREUR'),
    enabled: tab === 'assurances',
  });

  const toggleRule = useMutation({
    mutationFn: (rule: AlertRule) =>
      adminApi.updateAlertRule(rule.id, {
        thresholdValue: rule.thresholdValue,
        comparisonOperator: rule.comparisonOperator,
        level: rule.level,
        cooldownMinutes: rule.cooldownMinutes,
        notifyRoleCodes: rule.notifiedRoles.join(','),
        active: !rule.active,
      } as Partial<AlertRule>),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'alertRules'] }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess: () => {
      toast.success(t('settingsPage.accountDeleted'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deleteDriver = useMutation({
    mutationFn: (id: number) => driverApi.delete(id),
    onSuccess: () => {
      toast.success(t('settingsPage.driverRemoved'));
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const deleteVehicle = useMutation({
    mutationFn: (id: number) => vehicleApi.delete(id),
    onSuccess: () => {
      toast.success(t('settingsPage.vehicleRemoved'));
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const [resetResult, setResetResult] = useState<{ user: User; temporaryPassword: string } | null>(null);
  const [resetCopied, setResetCopied] = useState(false);
  const resetPassword = useMutation({
    mutationFn: (user: User) => adminApi.resetPassword(user.id).then((r) => ({ user, temporaryPassword: r.temporaryPassword })),
    onSuccess: (result) => {
      setResetResult(result);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const closeResetResult = () => {
    setResetResult(null);
    setResetCopied(false);
  };
  const copyResetPassword = () => {
    if (resetResult) {
      navigator.clipboard.writeText(resetResult.temporaryPassword);
      setResetCopied(true);
    }
  };

  return (
    <PageShell
      title={t('settingsPage.title')}
      subtitle={t('settingsPage.subtitle')}
    >
      <div className="space-y-6">
        <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label={t('settingsPage.statUsers')} value={String(users.data?.totalElements ?? '—')} icon={Users} accent="blue" />
          <StatCard label={t('settingsPage.statRoles')} value={String(roles.data?.length ?? '—')} icon={KeyRound} accent="slate" />
          <StatCard label={t('settingsPage.statActiveAgencies')} value={String(agencies.data?.length ?? '—')} icon={Building2} accent="green" />
          <StatCard label={t('settingsPage.statVehicles')} value={String(vehicleStats.data?.total ?? '—')} icon={Truck} accent="slate" />
          <StatCard
            label={t('settingsPage.statActiveRules')}
            value={rules.data ? `${rules.data.filter((r) => r.active).length} / ${rules.data.length}` : '—'}
            icon={ShieldAlert}
            accent="amber"
          />
        </StatGrid>

        {/* Aperçu : donnees deja chargees ci-dessus, presentees en un coup d'œil — chaque
            carte renvoie vers l'onglet correspondant pour la vue complete/paginee. */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-padded">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('settingsPage.recentUsers')}</h2>
            </div>
            {users.isLoading ? <LoadingPanel /> : (
              <ul className="divide-y divide-surface-border dark:divide-slate-800">
                {recentUsers.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-200">{u.fullName}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.roles.join(', ')}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={u.status === 'ACTIF' ? 'text-xs text-emerald-600' : 'text-xs text-slate-500'}>
                        {u.status === 'ACTIF' ? t('settingsPage.statusActive') : t('settingsPage.statusSuspended')}
                      </span>
                      <p className="text-xs text-slate-400">{formatDateTime(u.lastLoginAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setTab('utilisateurs')} className="btn-ghost mt-4 w-full justify-center">
              {t('settingsPage.viewAllUsers')}
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="card-padded">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('settingsPage.agencies')}</h2>
            </div>
            {agencies.isLoading ? <LoadingPanel /> : (
              <ul className="divide-y divide-surface-border dark:divide-slate-800">
                {(agencies.data ?? []).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800 dark:text-slate-200">{a.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{a.cityName} · {a.siteType}</p>
                    </div>
                    <span className={a.active ? 'shrink-0 text-xs text-emerald-600' : 'shrink-0 text-xs text-slate-500'}>
                      {a.active ? t('settingsPage.statusActive') : t('settingsPage.statusInactive')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setTab('sites')} className="btn-ghost mt-4 w-full justify-center">
              {t('settingsPage.manageAgencies')}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="card-padded">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('settingsPage.roleManagement')}</h2>
            <button onClick={() => setTab('roles')} className="btn-ghost">
              {t('settingsPage.viewAllRoles')}
              <ArrowRight size={14} />
            </button>
          </div>
          {roles.isLoading ? <LoadingPanel /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">{t('settingsPage.colRole')}</th>
                    <th className="table-header">{t('settingsPage.colUsers')}</th>
                    <th className="table-header">{t('maintenancePage.colDescription')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border dark:divide-slate-800">
                  {(roles.data ?? []).map((r) => (
                    <tr key={r.id}>
                      <td className="table-cell font-medium">{r.label}</td>
                      <td className="table-cell tabular">{r.userCount}</td>
                      <td className="table-cell text-slate-500 dark:text-slate-400">{r.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                onClick={() => { setTab(item.id); setPage(0); }}
                className={`btn-ghost ${tab === item.id ? 'border-accent bg-accent-soft text-accent' : ''}`}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>

          {tab === 'utilisateurs' && (
            <button onClick={() => setCreateUserOpen(true)} className="btn-primary">
              <UserPlus size={16} />
              {t('settingsPage.newUser')}
            </button>
          )}
          {tab === 'assurances' && (
            <button onClick={() => setCreateInsurerOpen(true)} className="btn-primary">
              <Plus size={16} />
              {t('settingsPage.newInsurer')}
            </button>
          )}
        </div>

        {tab === 'utilisateurs' && (
          users.isLoading ? <LoadingPanel /> : (
            <DataTable
              data={users.data?.content ?? []}
              keyOf={(u) => u.id}
              page={users.data?.page}
              totalPages={users.data?.totalPages}
              totalElements={users.data?.totalElements}
              onPageChange={setPage}
              columns={[
                { header: t('settingsPage.colFullName'), accessor: (u) => <span className="font-medium">{u.fullName}</span> },
                { header: t('settingsPage.colAddress'), accessor: (u) => u.email },
                { header: t('settingsPage.colRole'), accessor: (u) => u.roles.join(', ') },
                { header: t('settingsPage.colManagedCity'), accessor: (u) => u.cityName ?? t('settingsPage.allCities') },
                {
                  header: t('compliancePage.colStatus'),
                  accessor: (u) => (
                    <span className={u.status === 'ACTIF' ? 'text-emerald-600' : 'text-slate-500'}>
                      {u.status === 'ACTIF' ? t('settingsPage.statusActive') : u.status === 'SUPPRIME' ? t('settingsPage.statusDeleted') : t('settingsPage.statusSuspended')}
                      {u.locked && <span className="ml-1.5 text-red-600">· {t('settingsPage.statusLocked')}</span>}
                    </span>
                  ),
                },
                { header: t('settingsPage.colLastLogin'), accessor: (u) => formatDateTime(u.lastLoginAt) },
                {
                  header: '',
                  accessor: (u) => (
                    u.id === currentUserId ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="btn-ghost py-1 text-xs"
                        >
                          <Pencil size={13} />
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => setChangePasswordOpen(true)}
                          className="btn-ghost py-1 text-xs"
                        >
                          <KeyRound size={13} />
                          {t('topbar.changePassword')}
                        </button>
                      </div>
                    ) : u.status !== 'SUPPRIME' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="btn-ghost py-1 text-xs"
                        >
                          <Pencil size={13} />
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(t('settingsPage.confirmResetPassword', { name: u.fullName }))) {
                              resetPassword.mutate(u);
                            }
                          }}
                          disabled={resetPassword.isPending}
                          className="btn-ghost py-1 text-xs"
                        >
                          <KeyRound size={13} />
                          {t('settingsPage.reset')}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(t('settingsPage.confirmDeleteAccount', { name: u.fullName }))) {
                              deleteUser.mutate(u.id);
                            }
                          }}
                          disabled={deleteUser.isPending}
                          className="btn-ghost py-1 text-xs text-red-600 dark:text-red-400"
                        >
                          <Trash2 size={13} />
                          {t('common.delete')}
                        </button>
                      </div>
                    )
                  ),
                  align: 'right',
                },
              ]}
            />
          )
        )}

        {tab === 'roles' && (
          roles.isLoading ? <LoadingPanel /> : (
            <DataTable
              data={roles.data ?? []}
              keyOf={(r) => r.id}
              columns={[
                { header: t('settingsPage.colRole'), accessor: (r) => <span className="font-medium">{r.label}</span> },
                { header: t('maintenancePage.colDescription'), accessor: (r) => r.description ?? '—' },
                { header: t('settingsPage.colUsers'), accessor: (r) => r.userCount, align: 'right' },
                { header: t('settingsPage.colPermissions'), accessor: (r) => r.permissions.length, align: 'right' },
                {
                  header: t('settingsPage.colType'),
                  accessor: (r) => (
                    <span className="text-xs text-slate-500">
                      {r.isSystem ? t('settingsPage.typeSystem') : t('settingsPage.typeCustom')}
                    </span>
                  ),
                },
              ]}
            />
          )
        )}

        {tab === 'sites' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="border-b border-surface-border px-5 py-4">
                <h2 className="font-semibold text-slate-900">{t('settingsPage.sites')}</h2>
              </div>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="table-header">{t('settingsPage.colCode')}</th>
                    <th className="table-header">{t('settingsPage.colName')}</th>
                    <th className="table-header">{t('reportsPage.colCity')}</th>
                    <th className="table-header">{t('settingsPage.colType')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {(agencies.data ?? []).map((agency) => (
                    <tr key={agency.id}>
                      <td className="table-cell tabular font-medium">{agency.code}</td>
                      <td className="table-cell">{agency.name}</td>
                      <td className="table-cell">{agency.cityName}</td>
                      <td className="table-cell text-slate-500">{agency.siteType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-surface-border px-5 py-4">
                <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                  <MapPin size={16} className="text-slate-400" />
                  {t('settingsPage.cities')}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">{t('settingsPage.citiesHint')}</p>
              </div>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="table-header">{t('settingsPage.colCode')}</th>
                    <th className="table-header">{t('settingsPage.colName')}</th>
                    <th className="table-header">{t('settingsPage.colRegion')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {citiesWithSite.map((city) => (
                    <tr key={city.id}>
                      <td className="table-cell tabular font-medium">{city.code}</td>
                      <td className="table-cell">{city.name}</td>
                      <td className="table-cell text-slate-500">{city.region ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'chauffeurs' && (
          drivers.isLoading ? <LoadingPanel /> : (
            <DataTable
              data={drivers.data?.content ?? []}
              keyOf={(d) => d.id}
              page={drivers.data?.page}
              totalPages={drivers.data?.totalPages}
              totalElements={drivers.data?.totalElements}
              onPageChange={setPage}
              columns={[
                { header: t('driversPage.colDriver'), accessor: (d) => <span className="font-medium">{d.fullName}</span> },
                { header: t('driversPage.colMatricule'), accessor: (d) => d.matricule },
                { header: t('reportsPage.colCity'), accessor: (d) => d.cityName ?? t('settingsPage.allCities') },
                { header: t('vehiclesPage.colRegistration'), accessor: (d) => d.registrationNumber ?? '—' },
                { header: t('compliancePage.colStatus'), accessor: (d) => (
                  <span className={d.active ? 'text-emerald-600' : 'text-slate-500'}>{d.status}</span>
                ) },
                {
                  header: '',
                  accessor: (d) => d.active && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          if (window.confirm(t('settingsPage.confirmDeleteDriver', { name: d.fullName }))) {
                            deleteDriver.mutate(d.id);
                          }
                        }}
                        disabled={deleteDriver.isPending}
                        className="btn-ghost py-1 text-xs text-red-600 dark:text-red-400"
                      >
                        <Trash2 size={13} />
                        {t('common.delete')}
                      </button>
                    </div>
                  ),
                  align: 'right',
                },
              ]}
            />
          )
        )}

        {tab === 'camions' && (
          vehicles.isLoading ? <LoadingPanel /> : (
            <DataTable
              data={vehicles.data?.content ?? []}
              keyOf={(v) => v.id}
              page={vehicles.data?.page}
              totalPages={vehicles.data?.totalPages}
              totalElements={vehicles.data?.totalElements}
              onPageChange={setPage}
              columns={[
                { header: t('vehiclesPage.colRegistration'), accessor: (v) => <span className="font-medium">{v.registrationNumber}</span> },
                { header: t('vehiclesPage.colBrandModel'), accessor: (v) => `${v.brand} ${v.model}` },
                { header: t('reportsPage.colCity'), accessor: (v) => v.cityName ?? '—' },
                { header: t('compliancePage.colStatus'), accessor: (v) => (
                  <span className={v.active ? 'text-emerald-600' : 'text-slate-500'}>{v.status}</span>
                ) },
                {
                  header: '',
                  accessor: (v) => v.active && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          if (window.confirm(t('settingsPage.confirmRemoveVehicle', { registration: v.registrationNumber }))) {
                            deleteVehicle.mutate(v.id);
                          }
                        }}
                        disabled={deleteVehicle.isPending}
                        className="btn-ghost py-1 text-xs text-red-600 dark:text-red-400"
                      >
                        <Trash2 size={13} />
                        {t('settingsPage.removeFromFleet')}
                      </button>
                    </div>
                  ),
                  align: 'right',
                },
              ]}
            />
          )
        )}

        {tab === 'assurances' && (
          insurers.isLoading ? <LoadingPanel /> : !insurers.data?.length ? (
            <EmptyState icon={ShieldCheck} title={t('settingsPage.emptyInsurersTitle')}
                        action={t('settingsPage.emptyInsurersAction')} />
          ) : (
            <DataTable
              data={insurers.data}
              keyOf={(p) => p.id}
              columns={[
                { header: t('settingsPage.colName'), accessor: (p) => <span className="font-medium">{p.name}</span> },
                { header: t('settingsPage.colContact'), accessor: (p) => p.contactName ?? '—' },
                { header: t('settingsPage.colPhone'), accessor: (p) => p.phone ?? '—' },
                { header: t('settingsPage.colEmail'), accessor: (p) => p.email ?? '—' },
                { header: t('reportsPage.colCity'), accessor: (p) => p.cityName ?? '—' },
              ]}
            />
          )
        )}

        {tab === 'alertes' && (
          rules.isLoading ? <LoadingPanel /> : (
            <>
              <DataTable
                data={rules.data ?? []}
                keyOf={(r) => r.id}
                columns={[
                  { header: t('settingsPage.colAlert'), accessor: (r) => <span className="font-medium">{r.label}</span> },
                  {
                    header: t('settingsPage.colThreshold'),
                    accessor: (r) => r.thresholdValue !== null
                      ? `${r.comparisonOperator === 'GT' ? '>' : r.comparisonOperator === 'LT' ? '<' : '≥'} ${r.thresholdValue}`
                      : '—',
                    align: 'right',
                  },
                  { header: t('settingsPage.colLevel'), accessor: (r) => r.level },
                  { header: t('settingsPage.colCooldown'), accessor: (r) => `${r.cooldownMinutes} min`, align: 'right' },
                  { header: t('settingsPage.colEvaluation'), accessor: (r) => r.realTime ? t('settingsPage.realTime') : t('settingsPage.scheduled') },
                  {
                    header: t('settingsPage.colState'),
                    accessor: (r) => (
                      <button
                        onClick={() => toggleRule.mutate(r)}
                        disabled={toggleRule.isPending}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors ${
                          r.active
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                            : 'bg-slate-100 text-slate-500 ring-slate-400/20'
                        }`}
                      >
                        {r.active ? t('settingsPage.ruleActive') : t('settingsPage.ruleInactive')}
                      </button>
                    ),
                  },
                ]}
              />
            </>
          )
        )}
      </div>

      <CreateUserDrawer open={createUserOpen} onClose={() => setCreateUserOpen(false)} />
      <EditUserDrawer user={editingUser} onClose={() => setEditingUser(null)} />
      <CreateInsurerDrawer open={createInsurerOpen} onClose={() => setCreateInsurerOpen(false)} />
      <ChangeMyPasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />

      {resetResult && (
        <Drawer open={!!resetResult} onClose={closeResetResult} title={t('settingsPage.passwordResetTitle')}>
          <div className="space-y-5">
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {t('settingsPage.newPasswordGenerated')} <span className="font-medium">{resetResult.user.fullName}</span>.
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <KeyRound size={16} />
                {t('settingsPage.temporaryPassword')}
              </div>
              <p className="mt-1.5 text-xs text-amber-800">
                {t('settingsPage.temporaryPasswordHint', { name: resetResult.user.firstName })}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-sm tracking-wide text-slate-800 ring-1 ring-amber-200">
                  {resetResult.temporaryPassword}
                </code>
                <button
                  onClick={copyResetPassword}
                  className={`btn-ghost ${resetCopied ? 'border-emerald-300 text-emerald-700' : ''}`}
                >
                  {resetCopied ? <Check size={15} /> : <Copy size={15} />}
                  {resetCopied ? t('settingsPage.copied') : t('settingsPage.copy')}
                </button>
              </div>
              <p className="mt-2 text-xs text-amber-700">
                {t('settingsPage.passwordRemainsValid', { name: resetResult.user.firstName })}
              </p>
            </div>

            <button
              onClick={closeResetResult}
              disabled={!resetCopied}
              className="btn-primary w-full"
            >
              {!resetCopied ? t('settingsPage.copyToContinue') : t('settingsPage.done')}
            </button>
          </div>
        </Drawer>
      )}
    </PageShell>
  );
}
