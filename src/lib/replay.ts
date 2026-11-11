import type { SnappedTrack, TrackHistoryPoint } from '@/types/api';

/** Un point du trajet avec son heure (ms epoch) : la lecture interpole entre deux points voisins. */
export interface TimelinePoint {
  t: number;
  lat: number;
  lng: number;
}

export interface ReplayStop {
  startMs: number;
  endMs: number;
  lat: number;
  lng: number;
}

/** Seuil d'arret, comme le reglage serveur telematics.idle_speed_kmh. */
export const STOP_SPEED_KMH = 3;
/** Un arret plus court n'est pas liste (feu rouge, embouteillage). */
export const MIN_STOP_MS = 5 * 60 * 1000;

function meters(a: [number, number], b: [number, number]): number {
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Trajet sur les routes date : l'heure de chaque point de l'itineraire est interpolee entre les points GPS reels. */
export function buildRoadTimeline(track: SnappedTrack): TimelinePoint[] {
  const timeline: TimelinePoint[] = [];
  for (const segment of track.segments) {
    const g = segment.points;
    const anchors = [...segment.anchors].sort((a, b) => a.index - b.index);
    if (g.length === 0 || anchors.length === 0) continue;

    // Distance cumulee le long de l'itineraire, pour repartir le temps proportionnellement a la distance parcourue.
    const cumulative: number[] = [0];
    for (let i = 1; i < g.length; i++) cumulative.push(cumulative[i - 1] + meters(g[i - 1], g[i]));

    for (let k = 0; k + 1 < anchors.length; k++) {
      const a = anchors[k];
      const b = anchors[k + 1];
      const ta = new Date(a.at).getTime();
      const tb = new Date(b.at).getTime();
      const span = cumulative[b.index] - cumulative[a.index];
      for (let i = k === 0 ? a.index : a.index + 1; i <= b.index; i++) {
        const frac = span > 0 ? (cumulative[i] - cumulative[a.index]) / span : 0;
        timeline.push({ t: ta + (tb - ta) * frac, lat: g[i][0], lng: g[i][1] });
      }
    }
    if (anchors.length === 1) {
      const only = anchors[0];
      timeline.push({ t: new Date(only.at).getTime(), lat: g[only.index][0], lng: g[only.index][1] });
    }
  }
  // Garantit un temps croissant (arrondis, doublons aux jonctions de portions).
  for (let i = 1; i < timeline.length; i++) {
    if (timeline[i].t < timeline[i - 1].t) timeline[i] = { ...timeline[i], t: timeline[i - 1].t };
  }
  return timeline;
}

/** Points GPS bruts : le marqueur va en ligne droite d'un point au suivant, comme dans Traccar. */
export function buildRawTimeline(points: TrackHistoryPoint[]): TimelinePoint[] {
  return points.map((p) => ({ t: new Date(p.at).getTime(), lat: p.latitude, lng: p.longitude }));
}

/** Indice du dernier point dont l'heure est <= t (-1 avant le premier). */
export function indexAt<T extends { t: number }>(timeline: T[], t: number): number {
  let lo = 0;
  let hi = timeline.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timeline[mid].t <= t) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/** Position du camion a l'instant t, interpolee entre deux points voisins. */
export function positionAt(timeline: TimelinePoint[], t: number): { lat: number; lng: number; index: number } | null {
  if (timeline.length === 0) return null;
  const i = indexAt(timeline, t);
  if (i < 0) return { lat: timeline[0].lat, lng: timeline[0].lng, index: -1 };
  if (i >= timeline.length - 1) {
    const last = timeline[timeline.length - 1];
    return { lat: last.lat, lng: last.lng, index: timeline.length - 1 };
  }
  const a = timeline[i];
  const b = timeline[i + 1];
  const frac = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
  return { lat: a.lat + (b.lat - a.lat) * frac, lng: a.lng + (b.lng - a.lng) * frac, index: i };
}

export interface StampedSample {
  t: number;
  p: TrackHistoryPoint;
}

/** Releves bruts dates (ms), prets pour la recherche par heure. A calculer une fois par trajet. */
export function stampPoints(points: TrackHistoryPoint[]): StampedSample[] {
  return points.map((p) => ({ t: new Date(p.at).getTime(), p }));
}

/** Dernier releve brut a l'instant t : vitesse et contact affiches pendant la lecture. */
export function sampleAt(stamped: StampedSample[], t: number): TrackHistoryPoint | null {
  const i = indexAt(stamped, t);
  return i < 0 ? null : stamped[i].p;
}

/** Arrets de plus de MIN_STOP_MS : de la premiere position a l'arret jusqu'au premier releve en mouvement qui suit. */
export function computeStops(points: TrackHistoryPoint[]): ReplayStop[] {
  const stops: ReplayStop[] = [];
  let runStart: TrackHistoryPoint | null = null;
  const flush = (end: TrackHistoryPoint) => {
    if (!runStart) return;
    const startMs = new Date(runStart.at).getTime();
    const endMs = new Date(end.at).getTime();
    if (endMs - startMs >= MIN_STOP_MS) {
      stops.push({ startMs, endMs, lat: runStart.latitude, lng: runStart.longitude });
    }
    runStart = null;
  };
  for (const p of points) {
    const stopped = (p.speedKmh ?? 0) <= STOP_SPEED_KMH;
    if (stopped && !runStart) runStart = p;
    if (!stopped) flush(p);
  }
  if (runStart && points.length > 0) flush(points[points.length - 1]);
  return stops;
}

export function formatClock(ms: number, withSeconds = true): string {
  return new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', ...(withSeconds ? { second: '2-digit' } : {}) });
}

export function formatDurationMs(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}
