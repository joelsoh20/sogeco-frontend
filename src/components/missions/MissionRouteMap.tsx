import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { boundingExtent } from 'ol/extent';
import { defaults as defaultInteractions } from 'ol/interaction/defaults';
import 'ol/ol.css';

export interface RoutePoint {
  lat: number;
  lng: number;
  label: string;
}

interface PickablePlace {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

interface MissionRouteMapProps {
  origin: RoutePoint | null;
  destination: RoutePoint | null;
  /** Trace routier reel [lat, lng][] renvoye par OpenRouteService — absent si la source de l'estimation n'est pas ROUTING_API. */
  routeGeometry?: [number, number][] | null;

  /** Villes cliquables pour selection directe sur la carte (referentiel connu, avec coordonnees). */
  pickableCities?: PickablePlace[];
  onPickCity?: (cityId: number) => void;
  /** Quartiers cliquables — generalement ceux de la ville deja choisie. */
  pickableQuartiers?: PickablePlace[];
  onPickQuartier?: (quartierId: number) => void;
  /** Sites/agences cliquables (depot, siege...) — le lieu le plus precis, prioritaire sur ville/quartier. */
  pickableSites?: PickablePlace[];
  onPickSite?: (siteId: number) => void;

  /** Clic n'importe ou sur le fond de carte (pas sur un marqueur) — geocodage inverse par l'appelant. */
  onMapClick?: (lat: number, lng: number) => void;
}

const DOUALA_CENTER_LONLAT: [number, number] = [9.7679, 4.0511];
const CAMEROON_ZOOM = 6;

function dotStyle(color: string, radius: number) {
  return new Style({
    image: new CircleStyle({
      radius,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
  });
}

const ORIGIN_STYLE = dotStyle('#10b981', 8);
const DESTINATION_STYLE = dotStyle('#ef4444', 8);
const CITY_STYLE = dotStyle('#94a3b8', 5);
const QUARTIER_STYLE = dotStyle('#a855f7', 4.5);
const SITE_STYLE = dotStyle('#6366f1', 5.5);
const ROUTE_STYLE = new Style({ stroke: new Stroke({ color: '#3b82f6', width: 3 }) });
const ROUTE_DASHED_STYLE = new Style({ stroke: new Stroke({ color: '#3b82f6', width: 2, lineDash: [6, 6] }) });

/**
 * Carte de mission a double usage, batie sur OpenLayers (pas d'equivalent
 * officiel a react-leaflet ici : integration manuelle via useRef/useEffect).
 *  1. Selection — les villes (et, une fois une ville choisie, ses quartiers)
 *     connues du referentiel s'affichent en petits points cliquables,
 *     alternative visuelle aux listes deroulantes. Un clic ailleurs sur la
 *     carte declenche un geocodage inverse (onMapClick) pour proposer le
 *     lieu le plus proche, meme s'il n'est pas encore dans le referentiel.
 *  2. Verification — une fois origine/destination resolues, elles
 *     s'affichent en gros points colores, relies par le trace routier reel
 *     (routeGeometry, OpenRouteService) ou a defaut une ligne droite en
 *     pointilles — pour reperer un geocodage errone avant de valider.
 */
export function MissionRouteMap({
  origin, destination, routeGeometry,
  pickableCities = [], onPickCity,
  pickableQuartiers = [], onPickQuartier,
  pickableSites = [], onPickSite,
  onMapClick,
}: MissionRouteMapProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap | null>(null);
  const sourceRef = useRef(new VectorSource());

  // Callbacks en ref : le handler de clic, enregistre une seule fois a l'init de la
  // carte, doit toujours voir la derniere version (les props changent a chaque frappe).
  const onPickCityRef = useRef(onPickCity);
  const onPickQuartierRef = useRef(onPickQuartier);
  const onPickSiteRef = useRef(onPickSite);
  const onMapClickRef = useRef(onMapClick);
  onPickCityRef.current = onPickCity;
  onPickQuartierRef.current = onPickQuartier;
  onPickSiteRef.current = onPickSite;
  onMapClickRef.current = onMapClick;

  const cityMarkers = pickableCities.filter(
    (c): c is PickablePlace & { latitude: number; longitude: number } => c.latitude != null && c.longitude != null,
  );
  const quartierMarkers = pickableQuartiers.filter(
    (q): q is PickablePlace & { latitude: number; longitude: number } => q.latitude != null && q.longitude != null,
  );
  const siteMarkers = pickableSites.filter(
    (s): s is PickablePlace & { latitude: number; longitude: number } => s.latitude != null && s.longitude != null,
  );
  const hasRealRoute = Boolean(routeGeometry && routeGeometry.length >= 2);
  const namedPoints = [origin, destination].filter((p): p is RoutePoint => p !== null);
  const hasAnything = hasRealRoute || namedPoints.length > 0
    || cityMarkers.length > 0 || quartierMarkers.length > 0 || siteMarkers.length > 0;

  // Initialisation de la carte — une seule fois, quand le conteneur existe.
  useEffect(() => {
    if (!containerRef.current || !tooltipRef.current || mapRef.current) return;

    const overlay = new Overlay({
      element: tooltipRef.current,
      offset: [0, -12],
      positioning: 'bottom-center',
    });

    const map = new OlMap({
      target: containerRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({ source: sourceRef.current }),
      ],
      overlays: [overlay],
      view: new View({ center: fromLonLat(DOUALA_CENTER_LONLAT), zoom: CAMEROON_ZOOM }),
      interactions: defaultInteractions({ mouseWheelZoom: false }),
    });

    map.on('singleclick', (evt) => {
      // Un site, son quartier et sa ville peuvent se superposer visuellement (marqueurs
      // proches, voire confondus au zoom "toute la ville") — on privilégie toujours le
      // lieu le plus precis sous le clic : site > quartier > ville.
      let cityHit: import('ol/Feature').default | undefined;
      let quartierHit: import('ol/Feature').default | undefined;
      let siteHit: import('ol/Feature').default | undefined;
      map.forEachFeatureAtPixel(
        evt.pixel,
        (f) => {
          const kind = f.get('kind');
          if (kind === 'site' && !siteHit) siteHit = f as import('ol/Feature').default;
          else if (kind === 'quartier' && !quartierHit) quartierHit = f as import('ol/Feature').default;
          else if (kind === 'city' && !cityHit) cityHit = f as import('ol/Feature').default;
        },
        { hitTolerance: 6 },
      );
      const feature = siteHit ?? quartierHit ?? cityHit;
      if (feature) {
        const kind = feature.get('kind');
        const refId = feature.get('refId');
        if (kind === 'city') onPickCityRef.current?.(refId);
        else if (kind === 'quartier') onPickQuartierRef.current?.(refId);
        else if (kind === 'site') onPickSiteRef.current?.(refId);
        return;
      }
      if (onMapClickRef.current) {
        const [lng, lat] = toLonLat(evt.coordinate);
        onMapClickRef.current(lat, lng);
      }
    });

    map.on('pointermove', (evt) => {
      let cityHit: import('ol/Feature').default | undefined;
      let quartierHit: import('ol/Feature').default | undefined;
      let siteHit: import('ol/Feature').default | undefined;
      let otherHit: import('ol/Feature').default | undefined;
      map.forEachFeatureAtPixel(
        evt.pixel,
        (f) => {
          const kind = f.get('kind');
          if (kind === 'site' && !siteHit) siteHit = f as import('ol/Feature').default;
          else if (kind === 'quartier' && !quartierHit) quartierHit = f as import('ol/Feature').default;
          else if (kind === 'city' && !cityHit) cityHit = f as import('ol/Feature').default;
          else if (!otherHit) otherHit = f as import('ol/Feature').default;
        },
        { hitTolerance: 6 },
      );
      const feature = siteHit ?? quartierHit ?? cityHit ?? otherHit;
      const name = feature?.get('name') as string | undefined;
      const targetEl = map.getTargetElement();
      if (name) {
        tooltipRef.current!.textContent = name;
        tooltipRef.current!.style.display = 'block';
        overlay.setPosition(evt.coordinate);
        if (targetEl) targetEl.style.cursor = 'pointer';
      } else {
        tooltipRef.current!.style.display = 'none';
        if (targetEl) targetEl.style.cursor = '';
      }
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [hasAnything]);

  // Reconstruit les features et recadre la vue a chaque changement de selection.
  useEffect(() => {
    const map = mapRef.current;
    const source = sourceRef.current;
    if (!map) return;

    source.clear();

    for (const c of cityMarkers) {
      const feature = new Feature({ geometry: new Point(fromLonLat([c.longitude, c.latitude])) });
      feature.set('kind', 'city');
      feature.set('refId', c.id);
      feature.set('name', c.name);
      feature.setStyle(CITY_STYLE);
      source.addFeature(feature);
    }

    for (const q of quartierMarkers) {
      const feature = new Feature({ geometry: new Point(fromLonLat([q.longitude, q.latitude])) });
      feature.set('kind', 'quartier');
      feature.set('refId', q.id);
      feature.set('name', q.name);
      feature.setStyle(QUARTIER_STYLE);
      source.addFeature(feature);
    }

    for (const s of siteMarkers) {
      const feature = new Feature({ geometry: new Point(fromLonLat([s.longitude, s.latitude])) });
      feature.set('kind', 'site');
      feature.set('refId', s.id);
      feature.set('name', s.name);
      feature.setStyle(SITE_STYLE);
      source.addFeature(feature);
    }

    if (hasRealRoute) {
      const line = new Feature({
        geometry: new LineString(routeGeometry!.map(([lat, lng]) => fromLonLat([lng, lat]))),
      });
      line.setStyle(ROUTE_STYLE);
      source.addFeature(line);
    } else if (origin && destination) {
      const line = new Feature({
        geometry: new LineString([
          fromLonLat([origin.lng, origin.lat]),
          fromLonLat([destination.lng, destination.lat]),
        ]),
      });
      line.setStyle(ROUTE_DASHED_STYLE);
      source.addFeature(line);
    }

    if (origin) {
      const feature = new Feature({ geometry: new Point(fromLonLat([origin.lng, origin.lat])) });
      feature.set('name', origin.label);
      feature.setStyle(ORIGIN_STYLE);
      source.addFeature(feature);
    }
    if (destination) {
      const feature = new Feature({ geometry: new Point(fromLonLat([destination.lng, destination.lat])) });
      feature.set('name', destination.label);
      feature.setStyle(DESTINATION_STYLE);
      source.addFeature(feature);
    }

    const view = map.getView();
    if (hasRealRoute) {
      view.fit(boundingExtent(routeGeometry!.map(([lat, lng]) => fromLonLat([lng, lat]))),
        { padding: [30, 30, 30, 30], maxZoom: 15 });
    } else if (namedPoints.length === 1) {
      view.setCenter(fromLonLat([namedPoints[0].lng, namedPoints[0].lat]));
      view.setZoom(12);
    } else if (namedPoints.length >= 2) {
      view.fit(boundingExtent(namedPoints.map((p) => fromLonLat([p.lng, p.lat]))),
        { padding: [30, 30, 30, 30], maxZoom: 15 });
    } else if (cityMarkers.length > 0 || quartierMarkers.length > 0 || siteMarkers.length > 0) {
      const all = [...cityMarkers, ...quartierMarkers, ...siteMarkers];
      view.fit(boundingExtent(all.map((p) => fromLonLat([p.longitude, p.latitude]))),
        { padding: [20, 20, 20, 20], maxZoom: 8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, routeGeometry, pickableCities, pickableQuartiers, pickableSites]);

  if (!hasAnything && !onMapClick) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400 dark:bg-slate-800/50">
        {t('missionRouteMap.noKnownPosition')}
      </div>
    );
  }

  return (
    <div className="relative h-56 overflow-hidden rounded-lg border border-surface-border dark:border-slate-700">
      <div ref={containerRef} className="h-full w-full" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-10 rounded bg-slate-900 px-1.5 py-0.5 text-[11px] text-white shadow"
        style={{ display: 'none' }}
      />
    </div>
  );
}
