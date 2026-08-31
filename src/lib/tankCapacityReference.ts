import type { BodyType } from '@/types/api';

/**
 * Plages de capacite de reservoir usuelles par type de carrosserie —
 * sert a alerter (jamais a bloquer) sur une quantite de plein
 * invraisemblable dans le formulaire Carburant, quand le camion n'a
 * pas de tankCapacityLiters renseigne au niveau de sa fiche.
 *
 * CITERNE, FOURGON et PLATEAU n'ont pas de plage propre observee :
 * ils reprennent celle du Porteur, le gabarit le plus proche.
 */
export const TANK_CAPACITY_RANGE_LITERS: Record<BodyType, { min: number; max: number }> = {
  UTILITAIRE: { min: 60, max: 100 },
  PORTEUR: { min: 120, max: 200 },
  CITERNE: { min: 120, max: 200 },
  FOURGON: { min: 120, max: 200 },
  PLATEAU: { min: 120, max: 200 },
  BENNE: { min: 300, max: 400 },
  TRACTEUR: { min: 600, max: 1500 },
  MOTO: { min: 8, max: 15 },
  TRICYCLE: { min: 10, max: 20 },
  VOITURE_LIVRAISON: { min: 40, max: 60 },
  // Remorque sans moteur, donc sans reservoir propre : tout plein saisi
  // contre ce type est par construction suspect (0 x la marge = 0).
  SEMI_REMORQUE: { min: 0, max: 0 },
};

/** Marge tolérée au-delà du maximum habituel avant de considérer une quantité suspecte. */
const TOLERANCE = 1.1;

/**
 * Seuil au-dela duquel une quantite de plein est jugee suspecte pour ce
 * camion. Priorite au reservoir reellement mesure sur la fiche du
 * camion (tankCapacityLiters) — bien plus fiable qu'une plage generique
 * par type — sinon repli sur TANK_CAPACITY_RANGE_LITERS.
 */
export function suspiciousFuelThreshold(bodyType: BodyType, tankCapacityLiters: number | null): number {
  const base = tankCapacityLiters ?? TANK_CAPACITY_RANGE_LITERS[bodyType].max;
  return base * TOLERANCE;
}
