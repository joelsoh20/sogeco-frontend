import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Repeat } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { LoadingPanel } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { missionAutomationApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { CreateMissionAutomationDrawer } from './CreateMissionAutomationDrawer';

interface MissionAutomationListDrawerProps {
  open: boolean;
  onClose: () => void;
  canCreate: boolean;
}

/**
 * Liste des livraisons automatisees, avec la seule action qui manquait
 * au mecanisme d'annulation jour par jour deja existant : arreter
 * definitivement une automatisation (elle ne genere plus jamais de
 * mission ensuite).
 */
export function MissionAutomationListDrawer({ open, onClose, canCreate }: MissionAutomationListDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const automations = useQuery({
    queryKey: ['mission-automations'],
    queryFn: missionAutomationApi.list,
    enabled: open,
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => missionAutomationApi.deactivate(id),
    onSuccess: () => {
      toast.success(t('missionAutomationList.stopped'));
      queryClient.invalidateQueries({ queryKey: ['mission-automations'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const active = (automations.data ?? []).filter((a) => a.active);
  const inactive = (automations.data ?? []).filter((a) => !a.active);

  return (
    <>
      <Drawer open={open} onClose={onClose} title={t('missionAutomationList.title')} subtitle={t('missionAutomationList.subtitle')}>
        <div className="space-y-4">
          {canCreate && (
            <button onClick={() => setCreateOpen(true)} className="btn-primary w-full">
              <Plus size={16} />
              {t('missionAutomationList.automateButton')}
            </button>
          )}

          {automations.isLoading ? (
            <LoadingPanel />
          ) : active.length === 0 && inactive.length === 0 ? (
            <EmptyState icon={Repeat} title={t('missionAutomationList.empty')} />
          ) : (
            <>
              {active.length > 0 && (
                <div className="space-y-2">
                  {active.map((a) => (
                    <div key={a.id} className="rounded-lg border border-surface-border p-3 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                            {a.label || `${a.agencyName} → ${a.destinationQuartierName}`}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                            {a.cityName} · {a.registrationNumber} · {a.driverName}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {a.agencyName} → {a.destinationQuartierName}
                          </p>
                        </div>
                        <button
                          onClick={() => deactivate.mutate(a.id)}
                          disabled={deactivate.isPending}
                          className="btn-ghost shrink-0 py-1 text-xs text-red-600 dark:text-red-400"
                        >
                          {t('missionAutomationList.stop')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {inactive.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{t('missionAutomationList.stoppedSection')}</p>
                  <div className="space-y-2">
                    {inactive.map((a) => (
                      <div key={a.id} className="rounded-lg border border-surface-border p-3 opacity-60 dark:border-slate-700">
                        <p className="truncate text-sm font-medium text-slate-600 dark:text-slate-400">
                          {a.label || `${a.agencyName} → ${a.destinationQuartierName}`}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {a.cityName} · {a.registrationNumber} · {a.driverName}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Drawer>

      <CreateMissionAutomationDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
