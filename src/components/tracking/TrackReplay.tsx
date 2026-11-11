import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pause, Play, RotateCcw } from 'lucide-react';
import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { boundingExtent } from 'ol/extent';
import 'ol/ol.css';
import {
  STOP_SPEED_KMH, buildRawTimeline, buildRoadTimeline, computeStops, formatClock, formatDurationMs,
  positionAt, sampleAt, stampPoints, type TimelinePoint,
} from '@/lib/replay';
import { formatNumber } from '@/lib/utils';
import type { SnappedTrack, TrackHistoryPoint } from '@/types/api';

type Mode = 'road' | 'raw';

const SPEEDS = [10, 30, 60, 120, 300];

const FULL_STYLES = {
  SNAPPED: new Style({ stroke: new Stroke({ color: 'rgba(37, 99, 235, 0.30)', width: 4 }) }),
  ESTIMATED: new Style({ stroke: new Stroke({ color: 'rgba(245, 158, 11, 0.60)', width: 3, lineDash: [8, 8] }) }),
  RAW: new Style({ stroke: new Stroke({ color: 'rgba(100, 116, 139, 0.55)', width: 2, lineDash: [4, 6] }) }),
};
const TRAIL_STYLE = new Style({ stroke: new Stroke({ color: '#1d4ed8', width: 5 }) });

function dot(color: string, radius: number) {
  return new Style({
    image: new CircleStyle({ radius, fill: new Fill({ color }), stroke: new Stroke({ color: '#ffffff', width: 2 }) }),
  });
}
const START_STYLE = dot('#10b981', 6);
const END_STYLE = dot('#ef4444', 6);
const STOP_STYLE = dot('#f59e0b', 5);
const MOVING_STYLE = dot('#16a34a', 10);
const STOPPED_STYLE = dot('#f59e0b', 10);

interface TrackReplayProps {
  track: SnappedTrack;
  /** Releves GPS bruts du jour (heure, vitesse, contact). */
  points: TrackHistoryPoint[];
}

/**
 * Rejouage d'un trajet : un marqueur parcourt la journee, avec lecture / pause, barre de temps et vitesse
 * reglable. L'interrupteur choisit le trace : « Sur les routes » (itineraire OpenRouteService, dates interpolees
 * entre les points GPS) ou « Points GPS » (ligne droite d'un releve au suivant, comme Traccar).
 */
export function TrackReplay({ track, points }: TrackReplayProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('road');
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(60);

  const roadTimeline = useMemo(() => buildRoadTimeline(track), [track]);
  const rawTimeline = useMemo(() => buildRawTimeline(points), [points]);
  const rawAvailable = rawTimeline.length > 1;
  const effectiveMode: Mode = mode === 'raw' && rawAvailable ? 'raw' : 'road';
  const timeline: TimelinePoint[] = effectiveMode === 'raw' ? rawTimeline : roadTimeline;
  const stops = useMemo(() => computeStops(points), [points]);

  const startMs = timeline.length > 0 ? timeline[0].t : 0;
  const endMs = timeline.length > 0 ? timeline[timeline.length - 1].t : 0;

  // Nouveau trajet (autre jour ou camion) : retour au debut, lecture arretee.
  useEffect(() => {
    setNow(startMs);
    setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, points]);

  // Boucle de lecture : le temps du trajet avance de « speed » secondes par seconde reelle.
  const speedRef = useRef(speed);
  speedRef.current = speed;
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = 0;
    const tick = (time: number) => {
      const dt = time - last;
      last = time;
      let reachedEnd = false;
      setNow((prev) => {
        const next = prev + dt * speedRef.current;
        if (next >= endMs) {
          reachedEnd = true;
          return endMs;
        }
        return next;
      });
      if (reachedEnd) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, endMs]);

  // --- Carte ----------------------------------------------------------------
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap | null>(null);
  const fullSource = useRef(new VectorSource());
  const liveSource = useRef(new VectorSource());
  const trailFeature = useRef(new Feature(new LineString([])));
  const markerFeature = useRef(new Feature(new Point(fromLonLat([9.7679, 4.0511]))));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    trailFeature.current.setStyle(TRAIL_STYLE);
    liveSource.current.addFeatures([trailFeature.current, markerFeature.current]);
    const map = new OlMap({
      target: containerRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({ source: fullSource.current }),
        new VectorLayer({ source: liveSource.current }),
      ],
      view: new View({ center: fromLonLat([9.7679, 4.0511]), zoom: 12 }),
    });
    mapRef.current = map;
    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  // Trace complet (fond pale), arrets, depart et arrivee : redessines quand le mode change.
  useEffect(() => {
    const source = fullSource.current;
    source.clear();
    const extent: number[][] = [];
    if (effectiveMode === 'road') {
      for (const segment of track.segments) {
        const coords = segment.points.map(([lat, lng]) => fromLonLat([lng, lat]));
        extent.push(...coords);
        const f = new Feature(new LineString(coords));
        f.setStyle(FULL_STYLES[segment.kind]);
        source.addFeature(f);
      }
    } else {
      const coords = rawTimeline.map((p) => fromLonLat([p.lng, p.lat]));
      extent.push(...coords);
      const f = new Feature(new LineString(coords));
      f.setStyle(FULL_STYLES.RAW);
      source.addFeature(f);
    }
    for (const stop of stops) {
      const f = new Feature(new Point(fromLonLat([stop.lng, stop.lat])));
      f.setStyle(STOP_STYLE);
      source.addFeature(f);
    }
    if (timeline.length > 0) {
      const first = new Feature(new Point(fromLonLat([timeline[0].lng, timeline[0].lat])));
      first.setStyle(START_STYLE);
      const last = timeline[timeline.length - 1];
      const end = new Feature(new Point(fromLonLat([last.lng, last.lat])));
      end.setStyle(END_STYLE);
      source.addFeatures([first, end]);
    }
    if (extent.length > 0) {
      mapRef.current?.getView().fit(boundingExtent(extent as [number, number][]), { padding: [30, 30, 30, 30], maxZoom: 17 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMode, track, rawTimeline, stops]);

  // Marqueur et trace parcouru : mis a jour a chaque image.
  const stamped = useMemo(() => stampPoints(points), [points]);
  const sample = sampleAt(stamped, now);
  const moving = (sample?.speedKmh ?? 0) > STOP_SPEED_KMH;
  useEffect(() => {
    const position = positionAt(timeline, now);
    if (!position) return;
    const coord = fromLonLat([position.lng, position.lat]);
    (markerFeature.current.getGeometry() as Point).setCoordinates(coord);
    markerFeature.current.setStyle(moving ? MOVING_STYLE : STOPPED_STYLE);
    const done = timeline.slice(0, position.index + 1).map((p) => fromLonLat([p.lng, p.lat]));
    done.push(coord);
    (trailFeature.current.getGeometry() as LineString).setCoordinates(done);

    // Le marqueur sort du cadre : la carte le recentre.
    const map = mapRef.current;
    const size = map?.getSize();
    if (map && size) {
      const view = map.getView();
      const extent = view.calculateExtent(size);
      if (coord[0] < extent[0] || coord[0] > extent[2] || coord[1] < extent[1] || coord[1] > extent[3]) {
        view.setCenter(coord);
      }
    }
  }, [timeline, now, moving]);

  const jumpTo = (ms: number) => {
    setPlaying(false);
    setNow(Math.min(Math.max(ms, startMs), endMs));
  };

  const atEnd = now >= endMs && endMs > 0;

  return (
    <div className="space-y-3">
      {/* Interrupteur : trace sur les routes / points GPS bruts */}
      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800" role="group" aria-label={t('trackHistory.replay.mode')}>
        <button type="button" onClick={() => setMode('road')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${effectiveMode === 'road' ? 'bg-white text-accent shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>
          {t('trackHistory.replay.modeRoad')}
        </button>
        <button type="button" onClick={() => setMode('raw')} disabled={!rawAvailable}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${effectiveMode === 'raw' ? 'bg-white text-accent shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>
          {t('trackHistory.replay.modeRaw')}
        </button>
      </div>

      <div ref={containerRef} className="h-[24rem] w-full overflow-hidden rounded-xl border border-surface-border dark:border-slate-700" />

      {/* Commandes de lecture */}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button"
          onClick={() => {
            if (atEnd) setNow(startMs);
            setPlaying((p) => !p);
          }}
          className="btn-primary px-3 py-1.5 text-sm">
          {playing ? <Pause size={15} /> : <Play size={15} />}
          {playing ? t('trackHistory.replay.pause') : t('trackHistory.replay.play')}
        </button>
        <button type="button" onClick={() => jumpTo(startMs)} className="btn-ghost px-2.5 py-1.5" aria-label={t('trackHistory.replay.restart')}>
          <RotateCcw size={15} />
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span>{t('trackHistory.replay.speed')}</span>
          <select className="input w-auto py-1 text-xs" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => <option key={s} value={s}>×{s}</option>)}
          </select>
        </div>
        <span className="ml-auto font-mono text-sm font-semibold tabular text-slate-800 dark:text-slate-200">
          {timeline.length > 0 ? formatClock(now) : '—'}
        </span>
      </div>

      <input
        type="range"
        className="w-full accent-blue-600"
        min={startMs}
        max={endMs}
        step={1000}
        value={Math.min(Math.max(now, startMs), endMs)}
        onChange={(e) => { setPlaying(false); setNow(Number(e.target.value)); }}
        aria-label={t('trackHistory.replay.timeline')}
        disabled={timeline.length === 0}
      />
      <div className="-mt-2 flex justify-between text-[11px] text-slate-400">
        <span>{timeline.length > 0 ? formatClock(startMs, false) : ''}</span>
        <span>{timeline.length > 0 ? formatClock(endMs, false) : ''}</span>
      </div>

      {/* Etat a l'instant courant */}
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className="font-semibold tabular text-slate-800 dark:text-slate-200">
            {sample ? `${formatNumber(sample.speedKmh ?? 0, 0)} km/h` : '—'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('trackHistory.replay.currentSpeed')}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className={`font-semibold ${moving ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {sample ? t(moving ? 'trackHistory.replay.moving' : 'trackHistory.replay.stopped') : '—'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('trackHistory.replay.state')}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {sample?.ignitionOn == null ? '—' : t(sample.ignitionOn ? 'trackHistory.replay.ignitionOn' : 'trackHistory.replay.ignitionOff')}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('trackHistory.replay.ignition')}</p>
        </div>
      </div>

      {/* Arrets de la journee */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('trackHistory.replay.stops')}</p>
        {stops.length === 0 ? (
          <p className="text-sm text-slate-400">{t('trackHistory.replay.noStops')}</p>
        ) : (
          <ul className="divide-y divide-surface-border text-sm dark:divide-slate-800">
            {stops.map((s) => (
              <li key={s.startMs}>
                <button type="button" onClick={() => jumpTo(s.startMs)}
                  className="flex w-full items-center justify-between py-1.5 text-left hover:text-accent">
                  <span>{formatClock(s.startMs, false)} → {formatClock(s.endMs, false)}</span>
                  <span className="text-slate-500 dark:text-slate-400">{formatDurationMs(s.endMs - s.startMs)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
