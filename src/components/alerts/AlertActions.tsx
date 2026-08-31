import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, CheckCheck, Phone } from 'lucide-react';
import type { Alert } from '@/types/api';
import { alertApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';

export function AlertActions({ alert }: { alert: Alert }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canAcknowledge = useAuthStore((state) => state.hasPermission('ALERT_ACKNOWLEDGE'));
  const canResolve = useAuthStore((state) => state.hasPermission('ALERT_RESOLVE'));
  const [note, setNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['alerts'] });

  const acknowledge = useMutation({
    mutationFn: () => alertApi.acknowledge(alert.id),
    onSuccess: () => { toast.info(t('alertActions.acknowledged')); invalidate(); },
  });

  const resolve = useMutation({
    mutationFn: () => alertApi.resolve(alert.id, note),
    onSuccess: () => { toast.success(t('alertActions.resolved')); invalidate(); setResolving(false); setNote(''); },
  });

  if (alert.status === 'RESOLUE' || alert.status === 'IGNOREE') {
    return (
      <div className="rounded-lg bg-slate-50 px-3.5 py-3 text-sm text-slate-600">
        {alert.resolutionNote || t('alertActions.resolved')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {alert.driverPhone && (
          <a href={`tel:${alert.driverPhone}`} className="btn-ghost flex-1">
            <Phone size={15} />
            {t('alertActions.contactDriver')}
          </a>
        )}
        {canAcknowledge && alert.status === 'NON_RESOLUE' && (
          <button onClick={() => acknowledge.mutate()} disabled={acknowledge.isPending} className="btn-ghost flex-1">
            <Check size={15} />
            {t('alertActions.acknowledge')}
          </button>
        )}
      </div>

      {canResolve && (
        resolving ? (
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('alertActions.notePlaceholder')}
              className="input min-h-20 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => resolve.mutate()}
                disabled={!note.trim() || resolve.isPending}
                className="btn-primary flex-1"
              >
                {t('alertActions.confirmResolution')}
              </button>
              <button onClick={() => setResolving(false)} className="btn-ghost">{t('common.cancel')}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setResolving(true)} className="btn-primary w-full">
            <CheckCheck size={15} />
            {t('alertActions.resolveAlert')}
          </button>
        )
      )}
    </div>
  );
}
