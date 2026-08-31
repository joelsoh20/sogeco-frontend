import type { UsageType } from '@/types/api';

export const USAGE_TYPES: UsageType[] = ['VOYAGE', 'TOUR_VILLE'];

/** Les deux seuls montants acceptes pour le lavage hebdomadaire (tour de ville). */
export const WEEKLY_WASH_COST_OPTIONS = [2500, 3000] as const;
