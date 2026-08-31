import type { Alert } from '@/types/api';

/** Alertes carburant : la fiche camion de l'ecran Carburant est la source la plus utile. */
const FUEL_TYPES = new Set(['CARBURANT_BAS', 'SIPHONNAGE', 'SURCONSOMMATION']);

/** Alertes maintenance : pas d'identifiant d'intervention precis sur l'alerte, seulement le camion. */
const MAINTENANCE_TYPES = new Set(['PANNE_DETECTEE', 'MAINTENANCE_ECHUE']);

const DRIVER_ONLY_TYPES = new Set(['PERMIS_ECHEANCE']);

const MISSION_TYPES = new Set(['PEAGE_IMPAYE', 'MISSION_SANS_CA']);

/**
 * Route la plus pertinente pour "voir la source" d'une alerte, selon
 * son type et les identifiants dont elle dispose. Retourne null si
 * aucune source n'est identifiable (alerte sans camion/chauffeur/
 * mission rattache).
 */
export function alertSourceRoute(alert: Alert): string | null {
  if (FUEL_TYPES.has(alert.alertType) && alert.vehicleId != null) {
    return `/carburant?vehicleId=${alert.vehicleId}`;
  }
  if (MAINTENANCE_TYPES.has(alert.alertType)) {
    return alert.registrationNumber
      ? `/maintenance?q=${encodeURIComponent(alert.registrationNumber)}`
      : '/maintenance';
  }
  if (DRIVER_ONLY_TYPES.has(alert.alertType) && alert.driverId != null) {
    return `/chauffeurs?driverId=${alert.driverId}`;
  }
  if (MISSION_TYPES.has(alert.alertType) && alert.missionId != null) {
    return `/missions?missionId=${alert.missionId}`;
  }

  // Repli generique, selon les identifiants disponibles.
  if (alert.vehicleId != null) return `/camions?vehicleId=${alert.vehicleId}`;
  if (alert.driverId != null) return `/chauffeurs?driverId=${alert.driverId}`;
  if (alert.missionId != null) return `/missions?missionId=${alert.missionId}`;
  return null;
}
