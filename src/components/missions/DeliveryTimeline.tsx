import { useTranslation } from 'react-i18next';
import { Check, Flag, Truck } from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';
import type { MissionStatus } from '@/types/api';

interface DeliveryTimelineProps {
  status: MissionStatus;
  plannedStart: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  /** Lieu de depart / destination — affiches sous chaque etape correspondante du trajet. */
  departureLabel?: string | null;
  destinationLabel?: string | null;
}

/** Repere en 3 etapes (depart / en cours / livre), construit a partir des vrais horodatages de la mission — pas des waypoints intermediaires, qui sont un objet a part (etapes optionnelles ajoutees manuellement). */
export function DeliveryTimeline({
  status, plannedStart, actualStart, actualEnd, departureLabel, destinationLabel,
}: DeliveryTimelineProps) {
  const { t } = useTranslation();
  const stepIndex = status === 'ANNULEE' ? -1 : status === 'TERMINEE' ? 2 : status === 'EN_COURS' ? 1 : 0;

  const steps = [
    { label: t('deliveryTimeline.departure'), place: departureLabel, icon: Check, time: actualStart ?? (stepIndex >= 0 && status !== 'EN_ATTENTE' ? plannedStart : null) },
    { label: t('deliveryTimeline.inProgress'), place: null, icon: Truck, time: stepIndex >= 1 ? (actualStart ?? plannedStart) : null },
    { label: t('deliveryTimeline.delivered'), place: destinationLabel, icon: Flag, time: actualEnd },
  ];

  if (status === 'ANNULEE') {
    return <p className="text-sm text-slate-400">{t('deliveryTimeline.cancelled')}</p>;
  }

  return (
    <div className="flex items-start">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const reached = index <= stepIndex;
        const isLast = index === steps.length - 1;
        return (
          <div key={step.label} className={cn('flex items-center', !isLast && 'flex-1')}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full ring-2',
                reached
                  ? 'bg-accent text-white ring-accent'
                  : 'bg-slate-100 text-slate-400 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700',
              )}>
                <Icon size={16} />
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{step.label}</p>
              {step.place && (
                <p className="max-w-[100px] truncate text-[11px] text-slate-500 dark:text-slate-400" title={step.place}>
                  {step.place}
                </p>
              )}
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {step.time ? formatDateTime(step.time) : '—'}
              </p>
            </div>
            {!isLast && (
              <div className={cn(
                'mx-2 h-0.5 flex-1 rounded',
                index < stepIndex ? 'bg-accent' : 'bg-slate-200 dark:bg-slate-700',
              )} style={{ marginBottom: 32 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
