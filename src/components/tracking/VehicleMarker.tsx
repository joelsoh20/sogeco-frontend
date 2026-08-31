import { useEffect } from 'react';
import type Overlay from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';
import { useAnimatedLatLng } from '@/hooks/useAnimatedLatLng';
import type { LivePosition, VehicleStatus } from '@/types/api';

/** Silhouette de camion (cabine + benne + roues), plus figurative que l'icone Truck de lucide. */
function TruckGlyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))' }}>
      <rect x="1" y="6" width="12" height="9" rx="1" />
      <path d="M13 9h4.2c.4 0 .8.2 1 .5l2.3 3.1c.3.4.5.9.5 1.4V15h-8V9z" />
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="17.5" cy="18" r="2.2" />
    </svg>
  );
}

/**
 * Icone de camion sur la carte, coloree par statut.
 *
 * Le meme code couleur que StatusBadge : un camion vert sur la carte
 * doit etre le meme vert que dans la liste, sinon l'utilisateur doit
 * reapprendre le systeme a chaque ecran.
 */
const COLORS: Record<VehicleStatus, string> = {
  DISPONIBLE: '#16A34A',
  EN_MISSION: '#1E5EFF',
  EN_MAINTENANCE: '#6366F1',
  EN_PANNE: '#DC2626',
  HORS_SERVICE: '#94A3B8',
};

interface VehicleIconProps {
  status: VehicleStatus;
  offline: boolean;
  heading?: number | null;
  /** Position approchee depuis la mission (pas de boitier GPS) : jamais de halo, contour pointille. */
  approximate?: boolean;
}

/**
 * Contenu HTML du marqueur, monte par portail dans l'element d'un
 * Overlay OpenLayers (voir FleetMap). Degrade + double ombre (contact
 * + ambiante) pour une impression de relief, liseré blanc en verre
 * plutot qu'un simple trait, et un reflet glossy en haut a gauche —
 * le meme traitement qu'on donnerait a un badge/bouton premium
 * ailleurs dans l'appli, applique ici au marqueur.
 */
function VehicleIcon({ status, offline, heading, approximate }: VehicleIconProps) {
  const color = offline || approximate ? '#94A3B8' : COLORS[status];
  const rotation = heading ?? 0;
  // Anneau qui respire derriere l'icone : uniquement pour un camion
  // reellement en mouvement, jamais pour un statut fige ni une position
  // approchee (on ne sait pas s'il bouge vraiment).
  const pulsing = status === 'EN_MISSION' && !offline && !approximate;

  return (
    <div style={{ position: 'relative', width: 19, height: 19 }}>
      {pulsing && (
        <span
          className="animate-pulse-ring"
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.55 }}
        />
      )}
      <div
        style={{
          position: 'relative',
          width: 19,
          height: 19,
          borderRadius: '50%',
          background: `linear-gradient(145deg, color-mix(in srgb, ${color} 100%, white 30%), ${color})`,
          opacity: approximate ? 0.65 : 1,
          border: approximate ? '1px dashed rgba(255,255,255,0.95)' : '1.25px solid white',
          boxShadow: approximate
            ? '0 1px 3px rgba(15,23,42,0.2)'
            : '0 2px 4px rgba(15,23,42,0.28), 0 1px 1px rgba(15,23,42,0.18)',
        }}
      >
        {/* Reflet : un calque independant, jamais affecte par la rotation du camion. */}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'linear-gradient(155deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 45%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `rotate(${rotation}deg)`,
          }}
        >
          <span style={{ display: 'flex', transform: `rotate(${-rotation}deg)` }}>
            <TruckGlyph size={9} />
          </span>
        </div>
      </div>
    </div>
  );
}

interface AnimatedVehicleMarkerProps {
  position: LivePosition;
  offline: boolean;
  onClick: () => void;
  /** Overlay OpenLayers dont ce composant est le contenu (monte par portail) — voir FleetMap. */
  overlay: Overlay;
}

/**
 * Marqueur qui glisse vers sa nouvelle position au lieu de s'y
 * teleporter.
 *
 * C'est le geste signature de l'application : OpenLayers n'anime rien
 * nativement quand une position change, un Overlay saute simplement
 * d'un point a l'autre. useAnimatedLatLng interpole la trajectoire
 * entre les deux, sur environ 900 ms — assez pour se voir, assez court
 * pour ne jamais donner l'impression d'un retard. Chaque frame de
 * l'interpolation repositionne directement l'Overlay.
 */
export function AnimatedVehicleMarker({ position, offline, onClick, overlay }: AnimatedVehicleMarkerProps) {
  const [lat, lng] = useAnimatedLatLng([position.latitude, position.longitude]);

  useEffect(() => {
    overlay.setPosition(fromLonLat([lng, lat]));
  }, [lat, lng, overlay]);

  return (
    <div onClick={onClick} style={{ position: 'relative', cursor: 'pointer' }}>
      {/* Matricule toujours visible au-dessus de l'icone : avec plusieurs
          camions proches, on doit savoir lequel est lequel sans avoir a cliquer. */}
      <span
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 3,
          whiteSpace: 'nowrap',
          background: 'rgba(255,255,255,0.97)',
          color: '#1E293B',
          fontSize: 8,
          fontWeight: 600,
          letterSpacing: 0.1,
          padding: '2px 5px',
          borderRadius: 999,
          border: '0.75px solid rgba(15,23,42,0.06)',
          boxShadow: '0 1px 4px rgba(15,23,42,0.18)',
          pointerEvents: 'none',
        }}
      >
        {position.registrationNumber}
      </span>
      <VehicleIcon
        status={position.status}
        offline={offline}
        heading={position.heading}
        approximate={!position.gpsTracked}
      />
    </div>
  );
}
