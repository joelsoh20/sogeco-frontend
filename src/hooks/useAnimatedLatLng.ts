import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * Interpole une position GPS entre son ancienne et sa nouvelle valeur,
 * au lieu de sauter instantanement de l'une a l'autre.
 *
 * C'est le geste signature de l'application : la preuve visuelle du
 * suivi en temps reel, pas une decoration. Leaflet n'offre rien de
 * natif pour ca — un marqueur dont on change position se teleporte.
 *
 * useReducedMotion (Motion) est verifie une seule fois ici : si
 * l'utilisateur a demande moins de mouvement au niveau systeme, la
 * position saute directement a la cible, sans aucune boucle
 * d'animation declenchee.
 */
export function useAnimatedLatLng(
  target: [number, number],
  durationMs = 900,
): [number, number] {
  const prefersReducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState<[number, number]>(target);

  const fromRef = useRef<[number, number]>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayed(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    const [fromLat, fromLng] = from;
    const [toLat, toLng] = target;

    // Rien a faire si la position n'a pas reellement change — evite de
    // relancer une boucle d'animation a chaque rendu du parent.
    if (fromLat === toLat && fromLng === toLng) {
      return;
    }

    const startTime = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutCubic(progress);

      const lat = fromLat + (toLat - fromLat) * eased;
      const lng = fromLng + (toLng - fromLng) * eased;
      setDisplayed([lat, lng]);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[1], durationMs, prefersReducedMotion]);

  return displayed;
}
