import type { CostCategory } from '@/types/compliance';

export const COST_CATEGORIES: CostCategory[] = [
  'CARBURANT', 'MAINTENANCE', 'LAVERIE', 'ASSURANCE', 'VISITE_TECHNIQUE', 'PEAGES', 'FRAIS_MISSION', 'AUTRES',
];

export const COST_CATEGORY_COLORS: Record<CostCategory, string> = {
  CARBURANT: '#1E5EFF',
  MAINTENANCE: '#16A34A',
  LAVERIE: '#0891B2',
  ASSURANCE: '#7C3AED',
  VISITE_TECHNIQUE: '#0D9488',
  PEAGES: '#DC2626',
  FRAIS_MISSION: '#EA580C',
  AUTRES: '#64748B',
};
