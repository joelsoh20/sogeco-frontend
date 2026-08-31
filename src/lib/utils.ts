import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatage monetaire en FCFA.
 *
 * Le franc CFA n'a pas de subdivision en circulation : les montants
 * s'affichent a l'unite, jamais avec des centimes.
 */
export function formatFcfa(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' FCFA';
}

/** Version compacte pour les cartes d'indicateurs : 125,4 M FCFA. */
export function formatFcfaCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.', ',')} M FCFA`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${Math.round(value / 1_000)} k FCFA`;
  }
  return `${value} FCFA`;
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatKm(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${formatNumber(value)} km`;
}

export function formatLiters(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${formatNumber(value)} L`;
}

export function formatConsumption(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${formatNumber(value, 1)} L/100km`;
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  return value === null || value === undefined ? '—' : `${formatNumber(value, decimals)} %`;
}

/** Couleur de jauge pour un niveau de reservoir (0-100). */
export function fuelLevelColor(percent: number): string {
  if (percent < 20) return 'bg-red-500';
  if (percent < 50) return 'bg-amber-500';
  return 'bg-emerald-500';
}

/** Horodatage relatif : "il y a 3 min", "il y a 2 h". */
export function formatAge(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes < 1) return "a l'instant";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h`;
  return `${Math.floor(minutes / 1440)} j`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso));
}
