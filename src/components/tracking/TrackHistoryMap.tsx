import { useEffect, useRef } from 'react';
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
import type { SnappedTrack } from '@/types/api';

const DOUALA_CENTER_LONLAT: [number, number] = [9.7679, 4.0511];

const STYLES: Record<SnappedTrack['segments'][number]['kind'], Style> = {
  // Itineraire routier reel entre des points GPS proches
  SNAPPED: new Style({ stroke: new Stroke({ color: '#2563eb', width: 4 }) }),
  // Trou de reception : chemin le plus court entre les deux points voisins, a prendre comme une estimation
  ESTIMATED: new Style({ stroke: new Stroke({ color: '#f59e0b', width: 3, lineDash: [8, 8] }) }),
  // Repli sans routage : ligne droite brute entre les points
  RAW: new Style({ stroke: new Stroke({ color: '#94a3b8', width: 2, lineDash: [4, 6] }) }),
};

function dot(color: string) {
  return new Style({
    image: new CircleStyle({ radius: 8, fill: new Fill({ color }), stroke: new Stroke({ color: '#ffffff', width: 2 }) }),
  });
}

/** Trajet d'un camion redessine sur les routes : trait plein bleu (route), pointille orange (trou de reception). */
export function TrackHistoryMap({ track }: { track: SnappedTrack | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap | null>(null);
  const sourceRef = useRef(new VectorSource());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new OlMap({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM() }), new VectorLayer({ source: sourceRef.current })],
      view: new View({ center: fromLonLat(DOUALA_CENTER_LONLAT), zoom: 12 }),
    });
    mapRef.current = map;
    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const source = sourceRef.current;
    source.clear();
    if (!track || track.segments.length === 0) return;

    const extentPoints: number[][] = [];
    for (const segment of track.segments) {
      const coords = segment.points.map(([lat, lng]) => fromLonLat([lng, lat]));
      extentPoints.push(...coords);
      const feature = new Feature(new LineString(coords));
      feature.setStyle(STYLES[segment.kind]);
      source.addFeature(feature);
    }
    if (track.start) {
      const start = new Feature(new Point(fromLonLat([track.start.longitude, track.start.latitude])));
      start.setStyle(dot('#10b981'));
      source.addFeature(start);
    }
    if (track.end) {
      const end = new Feature(new Point(fromLonLat([track.end.longitude, track.end.latitude])));
      end.setStyle(dot('#ef4444'));
      source.addFeature(end);
    }
    if (extentPoints.length > 0) {
      mapRef.current?.getView().fit(boundingExtent(extentPoints as [number, number][]), { padding: [30, 30, 30, 30], maxZoom: 17 });
    }
  }, [track]);

  return <div ref={containerRef} className="h-[26rem] w-full overflow-hidden rounded-xl border border-surface-border dark:border-slate-700" />;
}
