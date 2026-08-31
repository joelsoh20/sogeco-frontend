import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Award, GraduationCap, TriangleAlert } from 'lucide-react';
import { driverApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import type { DriverActionType } from '@/types/driver-performance';

interface DriverActionsProps {
  driverId: number;
  driverName: string;
}

/**
 * Les trois actions RH de la maquette : attribuer une prime, envoyer
 * un avertissement, planifier une formation.
 *
 * La prime suit un circuit different des deux autres — proposition
 * puis validation separee (DriverBonus), pas une simple action tracee
 * (DriverAction) — parce qu'une prime engage de l'argent reel et
 * merite une double validation, quand un avertissement est une trace
 * immediate, sans etape intermediaire.
 */
export function DriverActions({ driverId, driverName }: DriverActionsProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canManageBonus = useAuthStore((state) => state.hasPermission('DRIVER_BONUS_MANAGE'));
  const canManage = useAuthStore((state) => state.hasPermission('DRIVER_UPDATE'));
  const [formOpen, setFormOpen] = useState<DriverActionType | null>(null);
  const [motif, setMotif] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['drivers', 'detail', driverId] });
    queryClient.invalidateQueries({ queryKey: ['drivers', 'actions', driverId] });
    queryClient.invalidateQueries({ queryKey: ['drivers', 'bonuses', driverId] });
  };

  const proposeBonus = useMutation({
    mutationFn: () => driverApi.proposeBonus(driverId),
    onSuccess: (bonus) => {
      toast.success(t('driverActions.bonusProposed', { name: driverName, amount: bonus.amount.toLocaleString('fr-FR') }));
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const addAction = useMutation({
    mutationFn: (type: DriverActionType) => driverApi.addAction(driverId, { actionType: type, motif }),
    onSuccess: (_, type) => {
      toast.success(type === 'AVERTISSEMENT' ? t('driverActions.warningRecorded') : t('driverActions.trainingScheduled'));
      setFormOpen(null);
      setMotif('');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {canManageBonus && (
          <button
            onClick={() => proposeBonus.mutate()}
            disabled={proposeBonus.isPending}
            className="btn-ghost flex-col gap-1 py-3 text-xs"
          >
            <Award size={18} className="text-emerald-600" />
            {t('driverActions.grantBonus')}
          </button>
        )}
        {canManage && (
          <>
            <button onClick={() => setFormOpen('AVERTISSEMENT')} className="btn-ghost flex-col gap-1 py-3 text-xs">
              <TriangleAlert size={18} className="text-amber-600" />
              {t('driverActions.warning')}
            </button>
            <button onClick={() => setFormOpen('FORMATION')} className="btn-ghost flex-col gap-1 py-3 text-xs">
              <GraduationCap size={18} className="text-accent" />
              {t('driverActions.training')}
            </button>
          </>
        )}
      </div>

      {formOpen && (
        <div className="rounded-lg border border-surface-border p-3 dark:border-slate-700">
          <label className="label">
            {formOpen === 'AVERTISSEMENT' ? t('driverActions.motifWarning') : t('driverActions.motifTraining')}
          </label>
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            className="input min-h-16 resize-none"
            placeholder={formOpen === 'AVERTISSEMENT' ? t('driverActions.warningPlaceholder') : t('driverActions.trainingPlaceholder')}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => addAction.mutate(formOpen)}
              disabled={!motif.trim() || addAction.isPending}
              className="btn-primary flex-1"
            >
              {t('common.confirm')}
            </button>
            <button onClick={() => { setFormOpen(null); setMotif(''); }} className="btn-ghost">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
