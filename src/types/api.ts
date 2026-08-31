/**
 * Types miroir des DTO du backend.
 *
 * Maintenus a la main : le contrat d'API est stable et documente par
 * OpenAPI. Une generation automatique ajouterait une etape de build
 * pour un gain limite a ce stade du projet.
 */

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  errors?: { field: string; message: string }[];
}

// ---------------------------------------------------------------- Auth

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  userId: number;
  email: string;
  fullName: string;
  cityId: number | null;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
  totpEnabled: boolean;
}

export interface CurrentUser {
  id: number;
  email: string;
  fullName: string;
  cityId: number | null;
  roles: string[];
  permissions: string[];
  totpEnabled: boolean;
  mustChangePassword: boolean;
}

// ---------------------------------------------------------------- Parc

export type VehicleStatus =
  | 'DISPONIBLE'
  | 'EN_MISSION'
  | 'EN_MAINTENANCE'
  | 'EN_PANNE'
  | 'HORS_SERVICE';

export type BodyType =
  | 'TRACTEUR'
  | 'PORTEUR'
  | 'BENNE'
  | 'CITERNE'
  | 'FOURGON'
  | 'PLATEAU'
  | 'UTILITAIRE'
  | 'MOTO'
  | 'TRICYCLE'
  | 'VOITURE_LIVRAISON'
  | 'SEMI_REMORQUE';

/** TOUR_VILLE ouvre droit au lavage hebdomadaire automatique (chaque samedi). */
export type UsageType = 'VOYAGE' | 'TOUR_VILLE';

export interface Vehicle {
  id: number;
  registrationNumber: string;
  brand: string;
  model: string;
  bodyType: BodyType;
  capacityTons: number | null;
  tankCapacityLiters: number | null;
  status: VehicleStatus;
  cityId: number | null;
  cityName: string | null;
  driverId: number | null;
  driverName: string | null;
  currentKilometers: number;
  dailyKm: number;
  avgFuelConsumption: number | null;
  fuelLevelPercent: number | null;
  active: boolean;
  usageType: UsageType;
  weeklyWashCost: number | null;
}

/** Fiche complete, chargee au clic sur un camion — plus riche que Vehicle (ligne de liste). */
export interface VehicleDetail {
  id: number;
  registrationNumber: string;
  vinNumber: string | null;
  brand: string;
  model: string;
  bodyType: BodyType;
  capacityTons: number | null;
  tankCapacityLiters: number | null;
  grossWeightKg: number | null;
  firstRegistrationDate: string | null;
  ownerName: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  status: VehicleStatus;
  cityId: number | null;
  cityName: string | null;
  deviceId: string | null;
  currentKilometers: number;
  dailyKm: number;
  fuelLevelPercent: number | null;
  fuelLevelLiters: number | null;
  avgFuelConsumption: number | null;
  nextMaintenanceDate: string | null;
  nextMaintenanceKm: number | null;
  driverId: number | null;
  driverName: string | null;
  driverPhone: string | null;
  assignable: boolean;
  blockingReasons: string[];
  documents: DocumentInfo[];
  active: boolean;
  createdAt: string;
  usageType: UsageType;
  weeklyWashCost: number | null;
}

/** Affectation standing chauffeur <-> camion (RG-9.x) — historisee, une seule active a la fois de chaque cote. */
export interface AssignmentRequest {
  driverId: number;
  startDate?: string;
  notes?: string;
}

export interface Assignment {
  id: number;
  vehicleId: number;
  registrationNumber: string;
  driverId: number;
  driverName: string;
  startDate: string;
  endDate: string | null;
  active: boolean;
  notes: string | null;
}

export interface CreateVehicleRequest {
  registrationNumber: string;
  vinNumber?: string;
  brand: string;
  model: string;
  bodyType: BodyType;
  capacityTons?: number;
  tankCapacityLiters?: number;
  grossWeightKg?: number;
  firstRegistrationDate?: string;
  ownerName?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  cityId?: number;
  deviceId?: string;
  currentKilometers?: number;
  usageType: UsageType;
  weeklyWashCost?: number;
}

export interface VehicleStats {
  total: number;
  enMission: number;
  disponible: number;
  enMaintenance: number;
  enPanne: number;
  horsService: number;
  availabilityRate: number;
}

// ------------------------------------------------------------ Suivi GPS

export interface LivePosition {
  vehicleId: number;
  registrationNumber: string;
  deviceId: string | null;
  driverId: number | null;
  driverName: string | null;
  missionId: number | null;
  missionNumber: string | null;
  destination: string | null;
  status: VehicleStatus;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  heading: number | null;
  ignitionOn: boolean | null;
  fuelLevelPercent: number | null;
  fuelLevelLiters: number | null;
  dailyKm: number | null;
  recordedAt: string;
  /** Faux quand le camion n'a pas de boitier : position approchee depuis sa mission en cours. */
  gpsTracked: boolean;
}

export interface TrackingStats {
  enMouvement: number;
  aLArret: number;
  horsLigne: number;
  enMaintenance: number;
  total: number;
}

// ------------------------------------------------------------- Missions

export type MissionStatus = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export interface Client {
  id: number;
  code: string | null;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cityId: number | null;
  cityName: string | null;
  taxNumber: string | null;
  paymentTermsDays: number | null;
  notes: string | null;
  active: boolean;
}

/** Correspond a ClientRequest cote backend — meme forme pour la creation et la modification. */
export interface CreateClientRequest {
  code?: string;
  companyName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  cityId?: number;
  taxNumber?: string;
  paymentTermsDays?: number;
  notes?: string;
}

export interface ServiceType {
  id: number;
  code: string;
  label: string;
  description: string | null;
  billable: boolean;
  active: boolean;
}

export interface CreateMissionRequest {
  clientId?: number;
  serviceTypeId: number;
  vehicleId: number;
  driverId: number;
  agencyId?: number;
  destinationAgencyId?: number;
  originCityId?: number;
  destinationCityId?: number;
  originQuartierId?: number;
  destinationQuartierId?: number;
  departureAddress?: string;
  destinationAddress?: string;
  plannedStart?: string;
  plannedArrival?: string;
  cargoDescription?: string;
  cargoWeightKg?: number;
  cargoVolumeM3?: number;
  externalReference?: string;
  missionFeeCost?: number;
}

export type MissionEstimateSource =
  | 'CORRIDOR_REFERENCE' | 'ROUTING_API' | 'QUARTIER_COORDINATES' | 'SITE_COORDINATES'
  | 'CITY_COORDINATES' | 'INDISPONIBLE';

/** Estimation de distance/carburant avant execution — voir MissionEstimateResponse cote backend pour la fiabilite de chaque source. */
export interface MissionEstimate {
  distanceKm: number | null;
  estimatedFuelLiters: number | null;
  source: MissionEstimateSource;
  /** Trace routier reel [lat, lng][] — uniquement quand source = ROUTING_API. */
  routeGeometry: [number, number][] | null;
}

export interface Mission {
  id: number;
  missionNumber: string;
  plannedStart: string | null;
  clientName: string | null;
  originLabel: string | null;
  destinationLabel: string | null;
  registrationNumber: string;
  driverName: string;
  status: MissionStatus;
  progress: number;
  revenueAmount: number | null;
  totalCost: number | null;
  marginAmount: number | null;
  revenueMissing: boolean;
}

export interface MissionStats {
  total: number;
  terminees: number;
  enCours: number;
  enAttente: number;
  annulees: number;
  tauxCompletion: number;
  tauxAnnulation: number;
  chiffreAffaires: number | null;
  kilometresParcourus: number;
  missionsSansChiffreAffaires: number;
}

export type WaypointStatus = 'EN_ATTENTE' | 'ATTEINT' | 'IGNORE';

export interface Waypoint {
  id: number;
  sequenceNumber: number;
  label: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  plannedArrival: string | null;
  actualArrival: string | null;
  status: WaypointStatus;
  notes: string | null;
}

export type DocumentType =
  | 'CARTE_GRISE' | 'CHRONOTACHYGRAPHE' | 'LICENCE_TRANSPORT' | 'AUTORISATION_CIRCULER'
  | 'ASSURANCE' | 'VISITE_TECHNIQUE' | 'PERMIS_CONDUIRE' | 'CONTRAT_TRAVAIL' | 'PHOTO'
  | 'BON_LIVRAISON' | 'ORDRE_MISSION' | 'FACTURE' | 'RECU_CARBURANT' | 'AUTRE';

export interface DocumentInfo {
  id: number;
  entityType: string;
  entityId: number;
  documentType: DocumentType;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  referenceNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  daysRemaining: number | null;
  status: 'VALIDE' | 'A_RENOUVELER' | 'EXPIRE' | 'SANS_ECHEANCE';
  notes: string | null;
}

export type CancellationReason = 'PANNE' | 'ANNULATION_CLIENT' | 'INDISPONIBILITE_CHAUFFEUR' | 'METEO' | 'AUTRE';

/** Panneau de detail complet — correspond a MissionDetailResponse, plus riche que Mission (ligne de liste). */
export interface MissionDetail {
  id: number;
  missionNumber: string;
  status: MissionStatus;
  clientId: number | null;
  clientName: string | null;
  clientPhone: string | null;
  serviceTypeId: number;
  serviceTypeLabel: string;
  billable: boolean;
  vehicleId: number;
  registrationNumber: string;
  driverId: number;
  driverName: string;
  driverPhone: string | null;
  agencyId: number | null;
  agencyName: string | null;
  destinationAgencyId: number | null;
  destinationAgencyName: string | null;
  routeId: number | null;
  routeLabel: string | null;
  departureLabel: string | null;
  destinationLabel: string | null;
  distanceKm: number | null;
  referenceDistanceKm: number | null;
  plannedStart: string | null;
  plannedArrival: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  durationMinutes: number | null;
  onTime: boolean | null;
  cargoDescription: string | null;
  cargoWeightKg: number | null;
  cargoVolumeM3: number | null;
  fillRate: number | null;
  revenueAmount: number | null;
  revenueNote: string | null;
  fuelCost: number | null;
  tollCost: number | null;
  driverCost: number | null;
  otherCost: number | null;
  missionFeeCost: number | null;
  totalCost: number | null;
  marginAmount: number | null;
  revenueMissing: boolean;
  progress: number;
  cancellationReason: CancellationReason | null;
  cancellationComment: string | null;
  externalReference: string | null;
  waypoints: Waypoint[];
  documents: DocumentInfo[];
  createdAt: string;
}

/** Livraison quotidienne recurrente — genere une mission chaque jour a 9h30 tant qu'elle reste active. */
export interface MissionAutomation {
  id: number;
  label: string | null;
  cityId: number;
  cityName: string;
  serviceTypeLabel: string;
  clientName: string | null;
  vehicleId: number;
  registrationNumber: string;
  driverId: number;
  driverName: string;
  agencyName: string;
  destinationQuartierName: string;
  cargoDescription: string | null;
  active: boolean;
}

export interface CreateMissionAutomationRequest {
  label?: string;
  cityId: number;
  serviceTypeId: number;
  clientId?: number;
  vehicleId: number;
  driverId: number;
  agencyId: number;
  destinationQuartierId: number;
  cargoDescription?: string;
}

export interface MissionCompleteRequest {
  revenueAmount?: number;
  distanceKm?: number;
  tollCost?: number;
  otherCost?: number;
  revenueNote?: string;
}

export interface MissionCancelRequest {
  reason: CancellationReason;
  comment?: string;
}

/** Chargement complementaire signale en cours de route : le camion doit passer par un autre site avant sa destination. */
export interface MissionDetourRequest {
  agencyId: number;
  notes?: string;
}

// ------------------------------------------------------------ Carburant

export type FuelLogStatus = 'VALIDE' | 'ANOMALIE' | 'ANNULE';

export interface FuelLog {
  id: number;
  fuelDatetime: string;
  vehicleId: number;
  registrationNumber: string;
  driverId: number | null;
  driverName: string | null;
  stationId: number | null;
  stationName: string | null;
  missionId: number | null;
  missionNumber: string | null;
  quantityLiters: number;
  unitPrice: number;
  totalCost: number;
  odometerBefore: number | null;
  odometerAfter: number;
  distanceCovered: number | null;
  fullTank: boolean;
  computedConsumption: number | null;
  status: FuelLogStatus;
  anomalyReason: string | null;
  receiptNumber: string | null;
  createdAt: string;
}

/** Correspond a FuelLogRequest cote backend — meme forme pour la saisie et la correction d'un plein. */
export interface FuelLogRequest {
  vehicleId: number;
  driverId?: number;
  missionId?: number;
  partnerId?: number;
  fuelDatetime: string;
  quantityLiters: number;
  unitPrice: number;
  odometerBefore?: number;
  odometerAfter: number;
  fullTank?: boolean;
  receiptNumber?: string;
}

export interface FuelStats {
  coutTotal: number;
  litresConsommes: number;
  consommationMoyenne: number | null;
  coutMoyenParKm: number | null;
  kilometresParcourus: number;
  nombreAnomalies: number;
  repartitionParCamion: {
    vehicleId: number;
    registrationNumber: string;
    litres: number;
    cout: number;
    consommationMoyenne: number | null;
    partPourcent: number;
  }[];
  /** 6 derniers mois, premier jour de chaque mois — independant de la periode selectionnee. */
  consommationSixMois: {
    month: string;
    litres: number;
  }[];
}

export type TankLevelSource = 'TELEMATIQUE' | 'ESTIMATION_DISTANCE' | 'INDISPONIBLE';

/** Niveau de reservoir estime par camion — telematique si disponible, sinon estimation plein-a-plein. */
export interface TankLevel {
  vehicleId: number;
  registrationNumber: string;
  tankCapacityLiters: number | null;
  estimatedFuelLiters: number | null;
  estimatedFuelPercent: number | null;
  distanceSinceLastFillKm: number | null;
  lastFullTankAt: string | null;
  source: TankLevelSource;
}

/**
 * Km, consommation et carburant a ajouter sur la periode — pense pour les
 * vehicules a suivi allege (moto, tricycle, voiture de livraison), avant
 * le plein hebdomadaire du samedi.
 */
export interface WeeklyRefuel {
  vehicleId: number;
  registrationNumber: string;
  bodyType: BodyType;
  distanceKm: number;
  avgConsumptionPer100km: number | null;
  tankCapacityLiters: number | null;
  estimatedFuelLiters: number | null;
  suggestedRefillLiters: number | null;
  source: TankLevelSource;
}

// -------------------------------------------------------------- Alertes

export type AlertLevel = 'CRITIQUE' | 'IMPORTANT' | 'MINEUR' | 'INFORMATION';
export type AlertStatus = 'NON_RESOLUE' | 'EN_COURS' | 'RESOLUE' | 'IGNOREE';

export interface Alert {
  id: number;
  alertType: string;
  level: AlertLevel;
  title: string;
  description: string | null;
  triggeredAt: string;
  ageMinutes: number;
  status: AlertStatus;
  occurrences: number;
  vehicleId: number | null;
  registrationNumber: string | null;
  driverId: number | null;
  driverName: string | null;
  driverPhone: string | null;
  missionId: number | null;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolutionMinutes: number | null;
  resolutionNote: string | null;
}

export interface AlertStats {
  critiques: number;
  importantes: number;
  mineures: number;
  informations: number;
  totalActives: number;
  resolues: number;
  nonResolues: number;
  tauxResolution: number;
  delaiMoyenResolutionMinutes: number | null;
  repartitionParType: { alertType: string; count: number; sharePercent: number }[];
}

export interface AlertRule {
  id: number;
  alertType: string;
  label: string;
  thresholdValue: number | null;
  comparisonOperator: string | null;
  level: AlertLevel;
  cooldownMinutes: number;
  notifiedRoles: string[];
  realTime: boolean;
  active: boolean;
}

// ------------------------------------------------------------ Chauffeurs

export type DriverStatus = 'ACTIF' | 'EN_CONGE' | 'SUSPENDU' | 'SORTI';
export type RatingClass = 'EXCELLENT' | 'BON' | 'MOYEN' | 'FAIBLE';

export interface Driver {
  id: number;
  matricule: string;
  fullName: string;
  phone: string | null;
  status: DriverStatus;
  cityId: number | null;
  cityName: string | null;
  vehicleId: number | null;
  registrationNumber: string | null;
  totalMissions: number;
  totalKilometers: number;
  incidentsCount: number;
  performanceScore: number | null;
  ratingClass: RatingClass;
  currentBonus: number | null;
  licenseDaysRemaining: number | null;
  active: boolean;
}

/** Ligne du classement "meilleur chauffeur" par ville et type d'usage — livraisons et pannes sur le semestre écoulé. */
export interface DriverSemesterRanking {
  driverId: number;
  driverName: string;
  cityId: number | null;
  cityName: string | null;
  vehicleId: number | null;
  registrationNumber: string | null;
  usageType: UsageType | null;
  deliveries: number;
  breakdowns: number;
}

export interface DriverStats {
  total: number;
  actifs: number;
  enConge: number;
  suspendus: number;
  averagePerformance: number | null;
  totalKilometers: number;
  totalIncidents: number;
  licensesExpiringSoon: number;
  ratingDistribution: Record<string, number>;
}

// ----------------------------------------------------------- Maintenance

export type MaintenanceCategory =
  | 'ENTRETIEN_PREVENTIF' | 'REPARATION_MECANIQUE'
  | 'PNEUMATIQUE' | 'ELECTRICITE' | 'LAVERIE' | 'AUTRES';

export type MaintenanceStatus = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export interface MaintenanceLog {
  id: number;
  vehicleId: number;
  registrationNumber: string;
  garageId: number | null;
  garageName: string | null;
  category: MaintenanceCategory;
  description: string;
  interventionDate: string;
  completionDate: string | null;
  odometerKm: number | null;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  status: MaintenanceStatus;
  downtimeDays: number;
  isBreakdown: boolean;
  isRecurrence: boolean;
  errorCode: string | null;
  nextInterventionDate: string | null;
  nextInterventionKm: number | null;
  daysUntilNext: number | null;
  items: {
    id: number;
    itemType: 'PIECE' | 'MAIN_OEUVRE';
    label: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  createdAt: string;
}

/** Correspond a MaintenanceRequest cote backend — meme forme pour la creation et la modification. */
export interface MaintenanceItemRequest {
  itemType: 'PIECE' | 'MAIN_OEUVRE';
  label: string;
  quantity: number;
  unitPrice: number;
}

export interface MaintenanceRequest {
  vehicleId: number;
  partnerId?: number;
  category: MaintenanceCategory;
  description: string;
  interventionDate: string;
  completionDate?: string;
  odometerKm?: number;
  isBreakdown?: boolean;
  errorCode?: string;
  nextInterventionDate?: string;
  nextInterventionKm?: number;
  items?: MaintenanceItemRequest[];
}

export interface MaintenanceStats {
  coutTotal: number;
  interventions: number;
  camionsEnMaintenance: number;
  pannes: number;
  interventionsAVenir: number;
  tauxPreventif: number;
  coutMoyenParIntervention: number;
  repartitionParCategorie: {
    category: MaintenanceCategory;
    count: number;
    amount: number;
    sharePercent: number;
  }[];
  comparatifGarages: {
    garageId: number;
    garageName: string;
    interventions: number;
    totalCost: number;
    averageCost: number;
    recurrences: number;
    recurrenceRate: number;
  }[];
  tendanceCouts: {
    date: string;
    amount: number;
  }[];
}

/** Une ligne du bouton "Statistiques par ville" de l'ecran Maintenance. */
export interface MaintenanceCityStats {
  cityId: number;
  cityName: string;
  interventions: number;
  coutTotal: number;
  pannes: number;
}

// -------------------------------------------------------- Administration

export type UserStatus = 'ACTIF' | 'SUSPENDU' | 'SUPPRIME';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  cityId: number | null;
  cityName: string | null;
  status: UserStatus;
  roles: string[];
  totpEnabled: boolean;
  mustChangePassword: boolean;
  locked: boolean;
  lastLoginAt: string | null;
}

export interface Role {
  id: number;
  code: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  active: boolean;
  userCount: number;
  permissions: string[];
}

export interface Agency {
  id: number;
  code: string;
  name: string;
  cityId: number;
  cityName: string;
  quartierId: number | null;
  quartierName: string | null;
  siteType: 'SIEGE' | 'AGENCE' | 'DEPOT';
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
}

export interface City {
  id: number;
  code: string;
  name: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  hasSite: boolean;
  active: boolean;
}

/** Correspond a AgencyRequest cote backend — meme forme pour la creation et la modification. */
export interface CreateAgencyRequest {
  code?: string;
  name?: string;
  cityId: number;
  quartierId: number;
  siteType: 'SIEGE' | 'AGENCE' | 'DEPOT';
  address?: string;
  phone?: string;
  coordinates?: string;
}

/** Correspond a CityRequest cote backend. */
export interface CreateCityRequest {
  code?: string;
  name: string;
  region?: string;
  coordinates?: string;
  hasSite?: boolean;
}

/** Referentiel ouvert, comme les villes — cree depuis l'ecran Missions. */
export interface Quartier {
  id: number;
  name: string;
  cityId: number;
  cityName: string;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
}

/** Correspond a QuartierRequest cote backend. */
export interface CreateQuartierRequest {
  name: string;
  cityId: number;
  coordinates?: string;
}

/** Lieu connu le plus proche d'un point clique sur la carte (geocodage inverse). */
export interface ReverseGeocodeResult {
  placeName: string;
  cityName: string;
  latitude: number;
  longitude: number;
}

export interface CreateUserRequest {
  /** Facultatif : sans email, le compte se connecte par nom et prenom. */
  email?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  cityId?: number;
  roleCodes: string[];
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  /** Facultatif ou vide : l'adresse actuelle n'est pas modifiee. Fournie, elle la remplace. */
  email?: string;
  phone?: string;
  cityId?: number;
  roleCodes: string[];
}

/**
 * Reponse a la creation d'un utilisateur.
 *
 * temporaryPassword n'est present QUE si aucun mot de passe n'a ete
 * saisi a la creation : le backend en a genere un et le communique
 * une seule fois. Il n'est jamais recuperable ensuite.
 */
export interface UserCreationResult {
  user: User;
  temporaryPassword: string | null;
}
