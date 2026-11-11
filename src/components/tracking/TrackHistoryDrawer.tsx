import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Drawer } from '@/components/ui/Drawer';
import { LoadingPanel } from '@/components/ui/Spinner';
import { trackingApi } from '@/api/endpoints';
import { errorMessage } from '@/api/client';
import { toLocalDateString } from '@/lib/utils';
import { TrackHistoryMap } from './TrackHistoryMap';

interface TrackHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  vehicleId: number;
  registrationNumber: string;
}

/** Debut et fin du jour choisi, en heure locale, en instants ISO pour le serveur. */
function dayBounds(day: string): { from: string; to: string } {
  const [y, m, d] = day.split('-').map(Number);
  return {
    from: new Date(y, m - 1, d, 0, 0, 0).toISOString(),
    to: new Date(y, m - 1, d + 1, 0, 0, 0).toISOString(),
  };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Historique d'un camion pour une journee, redessine sur les routes (OpenRouteService) a la place des lignes
 * droites entre points GPS. Les trous de reception sont traces en pointille orange : le chemin y est estime.
 */
export function TrackHistoryDrawer({ open, onClose, vehicleId, registrationNumber }: TrackHistoryDrawerProps) {
  const { t } = useTranslation();
  const today = toLocalDateString(new Date());
  const [day, setDay] = useState(today);

  const track = useQuery({
    queryKey: ['tracking', 'snapped-history', vehicleId, day],
    queryFn: () => {
      const { from, to } = dayBounds(day);
      return trackingApi.snappedHistory(vehicleId, from, to);
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toLocalDateString(d);
  })();
  const data = track.data;

  return (
    <Drawer open={open} onClose={onClose} wide title={t('trackHistory.title')} subtitle={registrationNumber}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">{t('trackHistory.day')}</label>
            <input type="date" max={today} className="input" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
          </div>
          <button type="button" onClick={() => setDay(today)} className="btn-ghost py-1.5 text-xs">{t('trackHistory.today')}</button>
          <button type="button" onClick={() => setDay(yesterday)} className="btn-ghost py-1.5 text-xs">{t('trackHistory.yesterday')}</button>
        </div>

        {track.isLoading && <LoadingPanel />}
        {track.isError && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage(track.error)}</p>}

        {data && data.positionCount === 0 && (
          <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            {t('trackHistory.noData')}
          </p>
        )}

        {data && data.positionCount > 0 && (
          <>
            <TrackHistoryMap track={data} />

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-6 bg-blue-600" />{t('trackHistory.legendRoad')}</span>
              <span className="flex items-center gap-1.5"><span className="h-0 w-6 border-t-2 border-dashed border-amber-500" />{t('trackHistory.legendEstimated')}</span>
              <span className="flex items-center gap-1.5"><span className="h-0 w-6 border-t-2 border-dashed border-slate-400" />{t('trackHistory.legendRaw')}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="font-semibold tabular text-slate-800 dark:text-slate-200">{data.positionCount}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('trackHistory.points')}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="font-semibold tabular text-slate-800 dark:text-slate-200">
                  {data.start && data.end ? `${formatTime(data.start.at)} → ${formatTime(data.end.at)}` : '—'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('trackHistory.period')}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className={`font-semibold tabular ${data.gapCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {data.gapCount}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('trackHistory.gaps')}</p>
              </div>
            </div>

            {!data.snappingAvailable && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{t('trackHistory.snappingUnavailable')}</p>
            )}
            {data.gapCount > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('trackHistory.gapHint')}</p>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
