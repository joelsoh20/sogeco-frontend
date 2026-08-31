import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { defaults as defaultControls } from 'ol/control';
import { fromLonLat } from 'ol/proj';
import { boundingExtent } from 'ol/extent';
import 'ol/ol.css';
import { AnimatedVehicleMarker } from './VehicleMarker';
import type { LivePosition } from '@/types/api';

interface FleetMapProps {
  positions: LivePosition[];
  center: { lat: number; lng: number };
  zoom: number;
  /** false pour la mini-carte d'accueil : ni zoom, ni pan, ni molette. */
  interactive?: boolean;
  offlineThresholdMs: number;
  onSelect?: (vehicleId: number) => void;
  /**
   * Terme de recherche valide (debounce cote appelant) — un simple filtre
   * silencieux sur les marqueurs ne "marche" pas aux yeux de l'utilisateur
   * si la vue ne bouge pas vers ce qu'il vient de trouver. Chaque
   * changement de valeur recentre/zoome sur les positions actuelles ; les
   * mises a jour GPS normales (positions qui changent sans que ce terme ne
   * change) ne redeclenchent jamais ce recadrage.
   */
  searchTerm?: string;
}

/**
 * Deux camions a une position identique (typiquement une position
 * approchee — meme depot, meme ville — jamais une vraie trame GPS)
 * se superposeraient exactement : ni distinguables, ni cliquables
 * individuellement, le dernier rendu captant seul le clic. On les
 * ecarte d'un petit rayon en pixels (donc constant quel que soit le
 * zoom), en cercle autour du point reel.
 */
const OVERLAP_RADIUS_PX = 26;

function computeOffsets(positions: LivePosition[]): Map<number, [number, number]> {
  const groups = new Map<string, number[]>();
  for (const p of positions) {
    const key = `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
    const group = groups.get(key);
    if (group) group.push(p.vehicleId);
    else groups.set(key, [p.vehicleId]);
  }

  const offsets = new Map<number, [number, number]>();
  for (const ids of groups.values()) {
    if (ids.length === 1) {
      offsets.set(ids[0], [0, 0]);
      continue;
    }
    // Un groupe plus grand a besoin de plus d'espace pour que les
    // etiquettes (bien plus larges que les icones) ne se chevauchent pas.
    const radius = OVERLAP_RADIUS_PX + Math.max(0, ids.length - 2) * 10;
    ids.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / ids.length - Math.PI / 2;
      offsets.set(id, [
        Math.round(radius * Math.cos(angle)),
        Math.round(radius * Math.sin(angle)),
      ]);
    });
  }
  return offsets;
}

/**
 * Carte flotte batie sur OpenLayers/OSM (meme pile que MissionRouteMap).
 *
 * Pas d'equivalent au Marker declaratif de Google Maps ici : chaque
 * camion a son propre Overlay OpenLayers, un simple element DOM
 * positionne sur la carte, dans lequel AnimatedVehicleMarker monte son
 * icone par portail React. La creation/suppression des Overlays suit
 * les arrivees/departs de vehicules ; le repositionnement continu
 * (animation comprise) est gere par chaque marqueur lui-meme.
 */
export function FleetMap({ positions, center, zoom, interactive = true, offlineThresholdMs, onSelect, searchTerm = '' }: FleetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap | null>(null);
  const overlaysRef = useRef(new Map<number, { overlay: Overlay; el: HTMLDivElement }>());
  const [, forceRender] = useState(0);

  // Lu par l'effet de recadrage ci-dessous, sans figurer dans ses
  // dependances : on veut toujours les positions les plus recentes au
  // moment ou l'utilisateur s'arrete de taper, jamais redeclencher ce
  // recadrage a chaque trame GPS recue entre-temps.
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new OlMap({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({ center: fromLonLat([center.lng, center.lat]), zoom }),
      controls: defaultControls({ zoom: interactive, rotate: false }),
      interactions: interactive ? undefined : [],
    });
    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
    // Centre/zoom/interactivite ne varient jamais apres le montage sur ces ecrans.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recadre la vue sur les resultats de recherche : un seul camion trouve
  // recoit un zoom rapproche, plusieurs sont tous cadres ensemble. Ne
  // depend que de `searchTerm` (deja debounce cote appelant) — jamais de
  // `positions`, pour ne jamais faire bouger la carte sous les pieds de
  // l'utilisateur au fil des trames GPS recues pendant qu'il consulte un
  // resultat.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !searchTerm.trim()) return;
    const current = positionsRef.current;
    if (current.length === 0) return;

    const coords = current.map((p) => fromLonLat([p.longitude, p.latitude]));
    const view = map.getView();
    if (coords.length === 1) {
      view.animate({ center: coords[0], zoom: Math.max(view.getZoom() ?? zoom, 14), duration: 500 });
    } else {
      view.fit(boundingExtent(coords), { padding: [90, 90, 90, 90], maxZoom: 15, duration: 500 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Un Overlay par camion present dans `positions`, cree ou retire au fil
  // des arrivees/departs. Ne gere pas la position elle-meme : c'est
  // AnimatedVehicleMarker (rendu ci-dessous) qui l'anime a chaque frame.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const overlays = overlaysRef.current;
    const currentIds = new Set(positions.map((p) => p.vehicleId));
    let changed = false;

    for (const [id, entry] of overlays) {
      if (!currentIds.has(id)) {
        map.removeOverlay(entry.overlay);
        overlays.delete(id);
        changed = true;
      }
    }

    for (const p of positions) {
      if (!overlays.has(p.vehicleId)) {
        const el = document.createElement('div');
        const overlay = new Overlay({ element: el, positioning: 'center-center' });
        map.addOverlay(overlay);
        overlays.set(p.vehicleId, { overlay, el });
        changed = true;
      }
    }

    // Ecarte les camions a position identique — recalcule a chaque
    // changement, un camion peut rejoindre ou quitter un groupe superpose.
    const offsets = computeOffsets(positions);
    for (const p of positions) {
      overlays.get(p.vehicleId)?.overlay.setOffset(offsets.get(p.vehicleId) ?? [0, 0]);
    }

    if (changed) forceRender((t) => t + 1);
  }, [positions]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {positions.map((p) => {
        const entry = overlaysRef.current.get(p.vehicleId);
        if (!entry) return null;
        const offline = Date.now() - new Date(p.recordedAt).getTime() > offlineThresholdMs;
        return createPortal(
          <AnimatedVehicleMarker
            key={p.vehicleId}
            position={p}
            offline={offline}
            onClick={() => onSelect?.(p.vehicleId)}
            overlay={entry.overlay}
          />,
          entry.el,
        );
      })}
    </div>
  );
}
