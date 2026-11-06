import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { vehicleApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toast } from '@/store/toastStore';

/** Camions en panne et remise en service. Les camions encore a l'atelier (EN_MAINTENANCE) n'y figurent pas. */
export function BrokenVehicles({ canManage, onRepair }: { canManage: boolean; onRepair: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const vehicles = useQuery({ queryKey: ['vehicles', 'for-maintenance'], queryFn: () => vehicleApi.list(0, 200) });
  const broken = (vehicles.data?.content ?? []).filter((v) => v.status === 'EN_PANNE');

  const backInService = useMutation({
    mutationFn: (id: number) => vehicleApi.backInService(id),
    onSuccess: (v) => {
      toast.success(t('maintenancePage.backInServiceDone', { registration: v.registrationNumber }));
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (broken.length === 0) return null;

  return (
    <div className="card-padded border-red-200 dark:border-red-500/30">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
        <AlertTriangle size={16} className="text-red-500" />
        {t('maintenancePage.brokenTitle')} ({broken.length})
      </h2>
      <ul className="divide-y divide-surface-border dark:divide-slate-800">
        {broken.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {v.registrationNumber} <span className="font-normal text-slate-500 dark:text-slate-400">— {v.brand} {v.model}</span>
            </span>
            {canManage && (
              <span className="flex gap-2">
                <button type="button" onClick={onRepair} className="btn-ghost py-1 text-xs">
                  <Wrench size={13} />
                  {t('maintenancePage.openRepair')}
                </button>
                <button type="button" disabled={backInService.isPending} onClick={() => backInService.mutate(v.id)} className="btn-ghost py-1 text-xs">
                  <CheckCircle2 size={13} />
                  {t('maintenancePage.backInService')}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface DeclareBreakdownDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Appele une fois la panne declaree, pour proposer d'ouvrir la reparation. */
  onDeclared: () => void;
}

export function DeclareBreakdownDrawer({ open, onClose, onDeclared }: DeclareBreakdownDrawerProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [vehicleId, setVehicleId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const vehicles = useQuery({ queryKey: ['vehicles', 'for-maintenance'], queryFn: () => vehicleApi.list(0, 200), enabled: open });
  const available = (vehicles.data?.content ?? []).filter((v) => v.status === 'DISPONIBLE');

  const declare = useMutation({
    mutationFn: () => vehicleApi.declareBreakdown(Number(vehicleId)),
    onSuccess: (v) => {
      toast.success(t('maintenancePage.declared', { registration: v.registrationNumber }));
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setVehicleId('');
      onClose();
      onDeclared();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const handleClose = () => {
    setError(null);
    setVehicleId('');
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t('maintenancePage.declareTitle')} subtitle={t('maintenancePage.declareSubtitle')}>
      <form
        onSubmit={(e) => { e.preventDefault(); setError(null); declare.mutate(); }}
        className="space-y-4"
      >
        <div>
          <label className="label">{t('compliancePage.colVehicle')}</label>
          <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
            <option value="">{t('common.selectPlaceholder')}</option>
            {available.map((v) => (
              <option key={v.id} value={v.id}>{v.registrationNumber} — {v.brand} {v.model}</option>
            ))}
          </select>
          {!vehicles.isLoading && available.length === 0 && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('maintenancePage.noAvailableVehicle')}</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>
        )}

        <button type="submit" disabled={!vehicleId || declare.isPending} className="btn-primary w-full">
          {declare.isPending ? <Spinner className="text-white" /> : <AlertTriangle size={16} />}
          {t('maintenancePage.declareSubmit')}
        </button>
      </form>
    </Drawer>
  );
}
