/**
 * Types des modules Conformite et Rapports (sprints 6 et 7).
 *
 * Fichier separe de api.ts : ces deux domaines sont volumineux et
 * n'ont ete raccordes qu'apres coup — les isoler evite de repartir sur
 * le gros fichier de types deja bien rempli.
 */

import type { BodyType } from './api';

// ----------------------------------------------------------- Conformite

export type InsuranceCoverageType = 'TOUS_RISQUES' | 'TIERS' | 'TIERS_VOL_INCENDIE';
export type PaymentFrequency = 'ANNUEL' | 'SEMESTRIEL' | 'TRIMESTRIEL' | 'MENSUEL';
export type PolicyStatus = 'ACTIVE' | 'EXPIREE' | 'RESILIEE';
export type InspectionResult = 'CONFORME' | 'NON_CONFORME' | 'CONFORME_AVEC_RESERVES';
export type ClaimType = 'COLLISION' | 'VOL' | 'INCENDIE' | 'DEGATS_MATERIELS' | 'DOMMAGES_CORPORELS' | 'AUTRE';
export type ClaimStatus = 'DECLARE' | 'EN_INSTRUCTION' | 'ACCEPTE' | 'REFUSE' | 'CLOTURE';
export type DocumentStatus = 'VALIDE' | 'A_RENOUVELER' | 'EXPIRE' | 'SANS_ECHEANCE';

export interface InsurancePolicy {
  id: number;
  policyNumber: string;
  insurerId: number;
  insurerName: string;
  coverageType: InsuranceCoverageType;
  category: BodyType | null;
  vehicleRegistration: string | null;
  premiumAmount: number | null;
  paymentFrequency: PaymentFrequency;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  status: PolicyStatus;
  vehicles: string[];
  coversFleet: boolean;
  notes: string | null;
}

export interface InsurancePolicyRequest {
  policyNumber: string;
  partnerId: number;
  coverageType: InsuranceCoverageType;
  category?: BodyType;
  vehicleRegistration?: string;
  premiumAmount?: number;
  paymentFrequency?: PaymentFrequency;
  startDate: string;
  endDate: string;
  vehicleIds?: number[];
  notes?: string;
}

export interface TechnicalInspection {
  id: number;
  vehicleId: number;
  registrationNumber: string;
  centerId: number | null;
  centerName: string | null;
  inspectionDate: string;
  nextInspectionDate: string;
  daysUntilNext: number;
  result: InspectionResult;
  defectsNoted: string | null;
  cost: number;
}

export interface TechnicalInspectionRequest {
  vehicleId: number;
  partnerId?: number;
  inspectionDate: string;
  nextInspectionDate?: string;
  result: InspectionResult;
  defectsNoted?: string;
  cost?: number;
}

export interface Claim {
  id: number;
  claimNumber: string;
  vehicleId: number;
  registrationNumber: string;
  driverId: number | null;
  driverName: string | null;
  policyId: number | null;
  policyNumber: string | null;
  incidentDate: string;
  claimType: ClaimType;
  description: string;
  locationLabel: string | null;
  policeReportNumber: string | null;
  estimatedCost: number | null;
  deductibleAmount: number | null;
  reimbursedAmount: number | null;
  netCost: number | null;
  status: ClaimStatus;
  createdAt: string;
}

export interface ClaimRequest {
  vehicleId: number;
  driverId?: number;
  insurancePolicyId?: number;
  incidentDate: string;
  claimType: ClaimType;
  description: string;
  locationLabel?: string;
  policeReportNumber?: string;
  estimatedCost?: number;
  deductibleAmount?: number;
}

export interface CarteBleue {
  id: number;
  vehicleId: number;
  registrationNumber: string;
  receiptNumber: string;
  category: string | null;
  issueDate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  power: number | null;
  cost: number | null;
  notes: string | null;
}

export interface CarteBleueRequest {
  vehicleId: number;
  receiptNumber: string;
  category?: string;
  issueDate: string;
  expiryDate: string;
  power?: number;
  cost?: number;
  notes?: string;
}

export interface CarteGrise {
  id: number;
  vehicleId: number;
  vehicleRegistrationNumber: string;
  registrationNumber: string;
  chassisNumber: string;
  brand: string;
  genre: string | null;
  bodyType: BodyType | null;
  seatCount: number | null;
  firstCirculationDate: string | null;
  issueDate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  cost: number | null;
  notes: string | null;
}

export interface CarteGriseRequest {
  vehicleId: number;
  registrationNumber: string;
  chassisNumber: string;
  brand: string;
  genre?: string;
  bodyType?: BodyType;
  seatCount?: number;
  firstCirculationDate?: string;
  issueDate: string;
  expiryDate?: string;
  cost?: number;
  notes?: string;
}

/** Pas de vehicleId : couvre toute la flotte, jamais un camion en particulier. */
export interface TransportLicense {
  id: number;
  reference: string;
  issuingAuthority: string | null;
  receiptNumber: string | null;
  power: string | null;
  issueDate: string;
  expiryDate: string;
  daysRemaining: number;
  status: PolicyStatus;
  cost: number | null;
  notes: string | null;
}

export interface TransportLicenseRequest {
  reference: string;
  issuingAuthority?: string;
  receiptNumber?: string;
  power?: string;
  issueDate: string;
  expiryDate: string;
  cost?: number;
  notes?: string;
}

export interface ComplianceStats {
  totalPolicies: number;
  activePolicies: number;
  expiringPolicies30Days: number;
  totalClaims: number;
  openClaims: number;
  totalEstimatedCost: number;
  totalReimbursed: number;
  nonConformInspections: number;
}

export interface DeadlineItem {
  category: 'ASSURANCE' | 'VISITE_TECHNIQUE' | 'PERMIS' | 'CARTE_BLEUE' | 'CARTE_GRISE' | 'LICENCE_TRANSPORT';
  entityId: number;
  entityLabel: string;
  documentLabel: string;
  dueDate: string;
  daysRemaining: number;
  status: DocumentStatus;
}

// -------------------------------------------------------------- Rapports

/** Depense d'un mois (1 = janvier ... 12 = decembre), pour la vue Charges. */
export interface MonthlyAmount {
  month: number;
  amount: number;
}

/** Charges d'un camion pour une annee — missions + entretien + carburant hors mission. Pas de CA ni de marge. */
export interface VehicleExpenseSummary {
  vehicleId: number;
  registrationNumber: string;
  cityId: number | null;
  cityName: string | null;
  monthly: MonthlyAmount[];
  yearTotal: number;
}

/** Charges cumulees des camions affectes a une ville, pour une annee. */
export interface CityExpenseSummary {
  cityId: number;
  cityName: string;
  vehicleCount: number;
  monthly: MonthlyAmount[];
  yearTotal: number;
}

export interface VehicleProfitability {
  vehicleId: number;
  registrationNumber: string;
  missionCount: number;
  totalRevenue: number;
  directCost: number;
  directMargin: number;
  maintenanceCost: number;
  netMargin: number;
  netMarginPercent: number | null;
  kmDriven: number;
  costPerKm: number | null;
}

export interface ClientProfitability {
  clientId: number;
  clientName: string;
  missionCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  marginPercent: number | null;
}

export interface CorridorProfitability {
  routeId: number;
  routeLabel: string;
  missionCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  kmDriven: number;
  avgCostPerKm: number | null;
}

export interface AgencyProfitability {
  agencyId: number;
  agencyName: string;
  missionCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
}

export type CostCategory = 'CARBURANT' | 'MAINTENANCE' | 'LAVERIE' | 'ASSURANCE' | 'VISITE_TECHNIQUE' | 'PEAGES' | 'FRAIS_MISSION' | 'AUTRES';

export interface CostBreakdown {
  total: number;
  categories: {
    category: CostCategory;
    amount: number;
    sharePercent: number | null;
  }[];
}

export interface MonthlyFinancialPoint {
  month: string;
  revenue: number;
  cost: number;
  margin: number;
  categories: {
    category: CostCategory;
    amount: number;
    sharePercent: number | null;
  }[];
}

/** Cout carburant/maintenance mensuel, restreint aux villes d'implantation actives — courbe "Performance de la flotte" de l'accueil. */
export interface FleetPerformancePoint {
  month: string;
  fuelCost: number;
  maintenanceCost: number;
}

export interface FleetKpis {
  periodStart: string;
  periodEnd: string;
  totalRevenue: number;
  totalDirectCost: number;
  totalMaintenanceCost: number;
  netMargin: number;
  netMarginPercent: number | null;
  utilizationRate: number;
  punctualityRate: number | null;
  avgFillRate: number | null;
  availabilityRate: number;
  costPerKm: number | null;
  totalKm: number;
}

export interface VehicleMarginSummary {
  vehicleId: number;
  registrationNumber: string;
  margin: number;
  missionCount: number;
}

export interface ClientMarginSummary {
  clientId: number;
  clientName: string;
  margin: number;
}

export interface ExecutiveDashboard {
  periodStart: string;
  periodEnd: string;
  kpis: FleetKpis;
  topVehicles: VehicleMarginSummary[];
  bottomVehicles: VehicleMarginSummary[];
  topClients: ClientMarginSummary[];
  criticalAlertsCount: number;
  missionsWithoutRevenue: number;
}

export interface OperationalDashboard {
  missionsToday: number;
  missionsInProgress: number;
  missionsPending: number;
  vehiclesInMaintenance: number;
  vehiclesInBreakdown: number;
  unassignedDrivers: number;
  openAlerts: number;
  criticalAlerts: number;
  upcomingDeadlines: DeadlineItem[];
}

export type ReportType =
  | 'RENTABILITE_CAMIONS' | 'RENTABILITE_CLIENTS'
  | 'RENTABILITE_CORRIDORS' | 'RENTABILITE_AGENCES' | 'SYNTHESE_MENSUELLE';

export type ReportFormat = 'CSV' | 'XLSX';

export interface GeneratedReport {
  id: number;
  reportType: ReportType;
  format: ReportFormat;
  periodStart: string;
  periodEnd: string;
  filePath: string;
  rowCount: number;
  isScheduled: boolean;
  generatedAt: string;
}
