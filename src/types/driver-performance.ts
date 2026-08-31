/**
 * Types du panneau de performance chauffeur (ecran Chauffeurs).
 *
 * Fichier separe de api.ts : ce domaine, ajoute apres coup en
 * comparant l'ecran a la maquette validee, est volumineux et
 * n'a pas vocation a fusionner avec le reste des types.
 */

export type RatingCriterionKey =
  | 'CONDUITE_SECURISEE' | 'CONSOMMATION_ECONOMIQUE'
  | 'RESPECT_DELAIS' | 'ENTRETIEN_VEHICULE' | 'RESPECT_REGLES';

export type DriverActionType = 'PRIME' | 'AVERTISSEMENT' | 'FORMATION' | 'ENTRETIEN' | 'FELICITATION';
export type BonusStatus = 'PROPOSEE' | 'VALIDEE' | 'VERSEE' | 'REFUSEE';

export interface RatingEntry {
  id: number;
  periodMonth: string;
  criterion: RatingCriterionKey;
  score100: number;
  isAutomatic: boolean;
  comment: string | null;
}

export interface DriverDetail {
  id: number;
  matricule: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  birthDate: string | null;
  hireDate: string | null;
  seniorityLabel: string | null;
  jobTitle: string | null;
  licenseNumber: string | null;
  licenseCategory: string | null;
  licenseExpiryDate: string | null;
  licenseDaysRemaining: number | null;
  licenseExpired: boolean;
  monthlySalary: number | null;
  status: string;
  cityId: number | null;
  cityName: string | null;
  vehicleId: number | null;
  registrationNumber: string | null;
  totalMissions: number;
  totalKilometers: number;
  incidentsCount: number;
  performanceScore: number | null;
  ratingClass: 'EXCELLENT' | 'BON' | 'MOYEN' | 'FAIBLE';
  ratings: RatingEntry[];
  currentBonus: number | null;
  assignable: boolean;
  active: boolean;
  createdAt: string;
}

export interface PerformancePoint {
  periodMonth: string;
  score: number;
}

export interface DriverFuelEconomy {
  driverId: number;
  driverName: string;
  averageConsumption: number;
  totalLiters: number;
  totalCost: number;
}

export interface BonusEntry {
  id: number;
  driverId: number;
  driverName: string;
  periodMonth: string;
  amount: number;
  performanceScore: number | null;
  reason: string | null;
  status: BonusStatus;
  grantedAt: string;
  paidAt: string | null;
}

export interface DriverActionEntry {
  id: number;
  driverId: number;
  actionType: DriverActionType;
  actionDate: string;
  motif: string;
  comment: string | null;
  createdBy: string | null;
}

export interface DriverActionRequest {
  actionType: DriverActionType;
  actionDate?: string;
  motif: string;
  comment?: string;
}

/** Correspond a DriverRequest cote backend — meme forme pour la creation et la modification. */
export interface CreateDriverRequest {
  matricule: string;
  firstName: string;
  lastName: string;
  phone?: string;
  birthDate?: string;
  hireDate: string;
  jobTitle?: string;
  licenseNumber?: string;
  licenseCategory?: string;
  licenseExpiryDate?: string;
  monthlySalary?: number;
  cityId?: number;
  userId?: number;
  /** Cree un nouveau compte de connexion (role Chauffeur) pour ce chauffeur. Ignoré si userId est fourni. */
  accountEmail?: string;
  /** Mot de passe initial du compte créé. Si absent, un mot de passe aléatoire est généré. */
  password?: string;
}

/**
 * Reponse a la creation d'un chauffeur.
 *
 * temporaryPassword n'est present que si accountEmail a ete fourni :
 * affiché une seule fois, jamais récupérable ensuite.
 */
export interface DriverCreationResult {
  driver: DriverDetail;
  temporaryPassword: string | null;
}
