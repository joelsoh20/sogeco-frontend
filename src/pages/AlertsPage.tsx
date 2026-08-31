import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatGrid } from '@/components/ui/StatGrid';
import { DataTable } from '@/components/ui/DataTable';
import { AlertLevelBadge } from '@/components/ui/StatusBadge';
import { Drawer } from '@/components/ui/Drawer';
import { AlertDetailPanel } from '@/components/alerts/AlertDetailPanel';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { alertApi } from '@/api/endpoints';
import { useStompSubscription } from '@/hooks/useWebSocket';
import { formatAge, formatDateTime, formatPercent } from '@/lib/utils';
import type { Alert, AlertLevel } from '@/types/api';

const LEVELS: { value: AlertLevel | undefined; labelKey: string }[] = [
  { value: undefined, labelKey: 'alertsPage.levelAll' },
  { value: 'CRITIQUE', labelKey: 'alertsPage.levelCritical' },
  { value: 'IMPORTANT', labelKey: 'alertsPage.levelImportant' },
  { value: 'MINEUR', labelKey: 'alertsPage.levelMinor' },
];

export function AlertsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [level, setLevel] = useState<AlertLevel | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Alert | null>(null);

  const stats = useQuery({ queryKey: ['alerts', 'stats'], queryFn: () => alertApi.stats() });
  const list = useQuery({
    queryKey: ['alerts', 'list', page, level],
    queryFn: () => alertApi.list(page, 20, level),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['alerts'] });

  // Nouvelle alerte diffusee : rafraichit la liste sans que
  // l'utilisateur ait a recharger la page.
  useStompSubscription('/topic/alerts', () => refresh());

  return (
    <PageShell
      title={t('alertsPage.title')}
      subtitle={t('alertsPage.subtitle')}
    >
      <div className="space-y-6">
        <StatGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('alertsPage.statCritical')} value={String(stats.data?.critiques ?? '—')} icon={ShieldAlert} accent="red" />
          <StatCard label={t('alertsPage.statImportant')} value={String(stats.data?.importantes ?? '—')} icon={AlertTriangle} accent="amber" />
          <StatCard label={t('alertsPage.statResolutionRate')} value={formatPercent(stats.data?.tauxResolution)} icon={CheckCircle2} accent="green" />
          <StatCard
            label={t('alertsPage.statAvgDelay')}
            value={
              stats.data?.delaiMoyenResolutionMinutes
                ? formatAge(stats.data.delaiMoyenResolutionMinutes)
                : '—'
            }
            icon={Clock}
            lowerIsBetter
            accent="slate"
          />
        </StatGrid>

        <div className="flex gap-2">
          {LEVELS.map((item) => (
            <button
              key={item.labelKey}
              onClick={() => { setLevel(item.value); setPage(0); }}
              className={`btn-ghost ${level === item.value ? 'border-accent bg-accent-soft text-accent' : ''}`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        {list.isLoading ? (
          <LoadingPanel />
        ) : !list.data?.content.length ? (
          <EmptyState
            icon={CheckCircle2}
            title={t('alertsPage.emptyTitle')}
            action={t('alertsPage.emptyAction')}
          />
        ) : (
          <DataTable
            data={list.data.content}
            keyOf={(a) => a.id}
            onRowClick={setSelected}
            page={list.data.page}
            totalPages={list.data.totalPages}
            totalElements={list.data.totalElements}
            onPageChange={setPage}
            columns={[
              { header: t('alertsPage.colTime'), accessor: (a) => formatDateTime(a.triggeredAt) },
              { header: t('alertsPage.colType'), accessor: (a) => a.title },
              { header: t('alertsPage.colVehicle'), accessor: (a) => a.registrationNumber ?? '—' },
              { header: t('alertsPage.colLocation'), accessor: (a) => a.locationLabel ?? '—' },
              { header: t('alertsPage.colLevel'), accessor: (a) => <AlertLevelBadge level={a.level} /> },
              {
                header: t('alertsPage.colStatus'),
                accessor: (a) => (
                  <span className="text-xs text-slate-500">
                    {a.status === 'NON_RESOLUE' && `${t('alertsPage.statusUnresolved')} · ${formatAge(a.ageMinutes)}`}
                    {a.status === 'EN_COURS' && `${t('alertsPage.statusInProgress')} · ${formatAge(a.ageMinutes)}`}
                    {a.status === 'RESOLUE' && t('alertsPage.statusResolved')}
                    {a.status === 'IGNOREE' && t('alertsPage.statusIgnored')}
                  </span>
                ),
              },
            ]}
          />
        )}
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ''}
        subtitle={selected?.registrationNumber ?? undefined}
      >
        {selected && <AlertDetailPanel alert={selected} />}
      </Drawer>
    </PageShell>
  );
}
