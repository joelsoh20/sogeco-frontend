import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Download, FileText, MapPinPlus, Pencil, Play, XCircle } from 'lucide-react';
import { MissionStatusBadge } from '@/components/ui/StatusBadge';
import { DetailRow } from '@/components/ui/Drawer';
import { LoadingPanel } from '@/components/ui/Spinner';
import { ProgressBar } from './ProgressBar';
import { DeliveryTimeline } from './DeliveryTimeline';
import { EditMissionDrawer } from './EditMissionDrawer';
import { missionApi, documentApi, adminApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { formatDateTime, formatFcfa, formatKm, formatNumber } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { canEditRecord } from '@/lib/editWindow';
import type { CancellationReason, DocumentInfo } from '@/types/api';

const CANCELLATION_REASONS: CancellationReason[] = ['PANNE', 'ANNULATION_CLIENT', 'INDISPONIBILITE_CHAUFFEUR', 'METEO', 'AUTRE'];

function DocumentRow({ doc }: { doc: DocumentInfo }) {
  const download = useMutation({
    mutationFn: () => documentApi.download(doc.id),
    onSuccess: (res) => {
      const blob = new Blob([res.data], { type: doc.mimeType ?? undefined });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <li className="flex items-center gap-3 py-2">
      <FileText size={16} className="shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{doc.fileName}</span>
      <button
        onClick={() => download.mutate()}
        disabled={download.isPending}
        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-accent dark:hover:bg-slate-800"
      >
        <Download size={15} />
      </button>
    </li>
  );
}

export function MissionDetailPanel({ missionId }: { missionId: number }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canSeeFinance = useAuthStore((state) => state.hasPermission('FINANCE_READ'));
  const canUpdate = useAuthStore((state) => state.hasPermission('MISSION_UPDATE'));
  const canCancel = useAuthStore((state) => state.hasPermission('MISSION_CANCEL'));
  const isAdmin = useAuthStore((state) => state.hasRole('ROLE_ADMIN'));
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detourOpen, setDetourOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<CancellationReason | ''>('');
  const [cancelComment, setCancelComment] = useState('');
  const [detourAgencyId, setDetourAgencyId] = useState('');
  const [detourNotes, setDetourNotes] = useState('');

  const detail = useQuery({ queryKey: ['missions', 'detail', missionId], queryFn: () => missionApi.get(missionId) });
  const agencies = useQuery({ queryKey: ['admin', 'agencies'], queryFn: adminApi.agencies, enabled: detourOpen });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['missions'] });
  };

  const start = useMutation({
    mutationFn: () => missionApi.start(missionId),
    onSuccess: () => { toast.success(t('missionDetail.started')); invalidate(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const complete = useMutation({
    mutationFn: () => missionApi.complete(missionId, {}),
    onSuccess: () => { toast.success(t('missionDetail.completed')); invalidate(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const cancel = useMutation({
    mutationFn: () => missionApi.cancel(missionId, { reason: cancelReason as CancellationReason, comment: cancelComment || undefined }),
    onSuccess: () => { toast.success(t('missionDetail.cancelled')); setCancelOpen(false); setCancelReason(''); setCancelComment(''); invalidate(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const detour = useMutation({
    mutationFn: () => missionApi.addDetour(missionId, { agencyId: Number(detourAgencyId), notes: detourNotes || undefined }),
    onSuccess: () => {
      toast.success(t('missionDetail.detourAdded'));
      setDetourOpen(false);
      setDetourAgencyId('');
      setDetourNotes('');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (detail.isLoading || !detail.data) {
    return <LoadingPanel />;
  }

  const mission = detail.data;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <MissionStatusBadge status={mission.status} />
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium tabular text-slate-500 dark:text-slate-400">{mission.missionNumber}</span>
          {canUpdate && canEditRecord(mission.createdAt, isAdmin) && (
            <button onClick={() => setEditOpen(true)} className="btn-ghost py-1 text-xs">
              <Pencil size={13} />
              {t('common.edit')}
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('missionsPage.colProgress')}</p>
        <ProgressBar value={mission.progress} />
      </div>

      {mission.status === 'ANNULEE' && mission.cancellationReason && (
        <div className="rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300">
          <p className="font-medium">{t('missionDetail.cancelledReason', { reason: t(`status.cancellationReason.${mission.cancellationReason}`) })}</p>
          {mission.cancellationComment && <p className="mt-0.5 text-xs">{mission.cancellationComment}</p>}
        </div>
      )}

      <div>
        <DetailRow label={t('missionDetail.client')} value={mission.clientName ?? '—'} />
        <DetailRow label={t('missionDetail.service')} value={mission.serviceTypeLabel} />
        {mission.agencyName && <DetailRow label={t('missionAutomationForm.departureSite')} value={mission.agencyName} />}
        {mission.destinationAgencyName && <DetailRow label={t('missionDetail.arrivalSite')} value={mission.destinationAgencyName} />}
        <DetailRow label={t('compliancePage.colVehicle')} value={mission.registrationNumber} />
        <DetailRow
          label={t('driversPage.colDriver')}
          value={mission.driverPhone ? `${mission.driverName} · ${mission.driverPhone}` : mission.driverName}
        />
        <DetailRow label={t('missionDetail.distance')} value={formatKm(mission.distanceKm)} />
        {(mission.cargoWeightKg || mission.cargoVolumeM3) && (
          <DetailRow
            label={t('missionDetail.cargo')}
            value={`${mission.cargoDescription ?? '—'} · ${mission.cargoWeightKg ? `${formatNumber(mission.cargoWeightKg)} kg` : ''}${mission.cargoVolumeM3 ? ` / ${formatNumber(mission.cargoVolumeM3)} m³` : ''}`}
          />
        )}
        <DetailRow label={t('missionDetail.plannedDeparture')} value={formatDateTime(mission.plannedStart)} />
        {mission.plannedArrival && <DetailRow label={t('missionDetail.plannedArrival')} value={formatDateTime(mission.plannedArrival)} />}
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('missionDetail.deliveryProgress')}
        </p>
        <DeliveryTimeline
          status={mission.status}
          plannedStart={mission.plannedStart}
          actualStart={mission.actualStart}
          actualEnd={mission.actualEnd}
          departureLabel={mission.departureLabel}
          destinationLabel={mission.destinationLabel}
        />
      </div>

      {canSeeFinance && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('missionDetail.costs')}
          </p>
          {mission.missionFeeCost != null && mission.missionFeeCost > 0 && (
            <DetailRow label={t('missionDetail.missionFee')} value={formatFcfa(mission.missionFeeCost)} />
          )}
          <DetailRow label={t('missionDetail.totalCost')} value={formatFcfa(mission.totalCost)} />
        </div>
      )}

      {mission.documents.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('missionDetail.associatedDocuments')}
          </p>
          <ul className="divide-y divide-surface-border dark:divide-slate-800">
            {mission.documents.map((doc) => <DocumentRow key={doc.id} doc={doc} />)}
          </ul>
        </div>
      )}

      {(canUpdate || canCancel) && (mission.status === 'EN_ATTENTE' || mission.status === 'EN_COURS') && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('driverDetail.actions')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {canUpdate && mission.status === 'EN_ATTENTE' && (
              <button onClick={() => start.mutate()} disabled={start.isPending} className="btn-ghost flex-col gap-1 py-3 text-xs">
                <Play size={18} className="text-accent" />
                {t('maintenanceDetail.start')}
              </button>
            )}
            {canUpdate && mission.status === 'EN_COURS' && (
              <button onClick={() => complete.mutate()} disabled={complete.isPending} className="btn-ghost flex-col gap-1 py-3 text-xs">
                <CheckCircle2 size={18} className="text-emerald-600" />
                {t('maintenanceDetail.finish')}
              </button>
            )}
            {canUpdate && mission.status === 'EN_COURS' && (
              <button onClick={() => setDetourOpen((v) => !v)} className="btn-ghost flex-col gap-1 py-3 text-xs">
                <MapPinPlus size={18} className="text-accent" />
                {t('missionDetail.loadElsewhere')}
              </button>
            )}
            {canCancel && (
              <button onClick={() => setCancelOpen((v) => !v)} className="btn-ghost flex-col gap-1 py-3 text-xs">
                <XCircle size={18} className="text-red-600" />
                {t('common.cancel')}
              </button>
            )}
          </div>

          {detourOpen && (
            <div className="mt-3 rounded-lg border border-surface-border p-3 dark:border-slate-700">
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                {t('missionDetail.detourHint')}
              </p>
              <label className="label">{t('missionDetail.siteToVisit')}</label>
              <select className="input" value={detourAgencyId} onChange={(e) => setDetourAgencyId(e.target.value)}>
                <option value="">{t('common.selectPlaceholder')}</option>
                {agencies.data?.map((agency) => (
                  <option key={agency.id} value={agency.id}>{agency.name}</option>
                ))}
              </select>
              <label className="label mt-2">{t('missionDetail.noteOptional')}</label>
              <textarea
                className="input min-h-16 resize-none"
                value={detourNotes}
                onChange={(e) => setDetourNotes(e.target.value)}
                placeholder={t('missionDetail.detourNotesPlaceholder')}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => detour.mutate()}
                  disabled={!detourAgencyId || detour.isPending}
                  className="btn-primary flex-1"
                >
                  {t('missionDetail.confirmDetour')}
                </button>
                <button onClick={() => setDetourOpen(false)} className="btn-ghost">{t('missionDetail.back')}</button>
              </div>
            </div>
          )}

          {cancelOpen && (
            <div className="mt-3 rounded-lg border border-surface-border p-3 dark:border-slate-700">
              <label className="label">{t('missionDetail.cancellationReason')}</label>
              <select className="input" value={cancelReason} onChange={(e) => setCancelReason(e.target.value as CancellationReason)}>
                <option value="">{t('common.selectPlaceholder')}</option>
                {CANCELLATION_REASONS.map((value) => (
                  <option key={value} value={value}>{t(`status.cancellationReason.${value}`)}</option>
                ))}
              </select>
              <label className="label mt-2">{t('missionDetail.commentOptional')}</label>
              <textarea
                className="input min-h-16 resize-none"
                value={cancelComment}
                onChange={(e) => setCancelComment(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => cancel.mutate()}
                  disabled={!cancelReason || cancel.isPending}
                  className="btn-primary flex-1"
                >
                  {t('missionDetail.confirmCancellation')}
                </button>
                <button onClick={() => setCancelOpen(false)} className="btn-ghost">{t('missionDetail.back')}</button>
              </div>
            </div>
          )}
        </div>
      )}

      <EditMissionDrawer open={editOpen} onClose={() => setEditOpen(false)} mission={mission} />
    </div>
  );
}
