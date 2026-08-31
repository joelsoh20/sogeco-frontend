import { api } from './client';
import type {
  Agency, Alert, AlertRule, AlertStats, Assignment, AssignmentRequest, AuthResponse, City, Client,
  CreateAgencyRequest, CreateCityRequest, CreateClientRequest, CreateMissionAutomationRequest,
  CreateMissionRequest, CreateQuartierRequest, CreateUserRequest, CreateVehicleRequest, CurrentUser,
  Driver, DriverSemesterRanking, DriverStats, FuelLog, FuelLogRequest, FuelStats, LivePosition, MaintenanceCityStats,
  MaintenanceLog, MaintenanceRequest, MaintenanceStats, Mission, MissionAutomation, MissionCancelRequest,
  MissionCompleteRequest, MissionDetail, MissionDetourRequest, MissionEstimate, MissionStats, PageResponse, Quartier,
  ReverseGeocodeResult, Role, ServiceType, TankLevel, TrackingStats, UpdateUserRequest, User, UserCreationResult,
  Vehicle, VehicleDetail, VehicleStats, WeeklyRefuel,
} from '@/types/api';
import type {
  BonusEntry, BonusStatus, CreateDriverRequest, DriverActionEntry, DriverActionRequest, DriverCreationResult,
  DriverDetail, DriverFuelEconomy, PerformancePoint,
} from '@/types/driver-performance';

const V1 = '/api/v1';

/** Deux facons de s'identifier : email, ou nom + prenom (non unique en base, l'ambiguite echoue cote serveur). */
export type LoginCredentials = { email: string } | { firstName: string; lastName: string };

export const authApi = {
  login: (credentials: LoginCredentials, password: string, totpCode?: string) =>
    api.post<AuthResponse>(`${V1}/auth/login`, { ...credentials, password, totpCode })
       .then((r) => r.data),

  me: () => api.get<CurrentUser>(`${V1}/auth/me`).then((r) => r.data),

  logout: () => api.post(`${V1}/auth/logout`),

  /** Changement volontaire par son titulaire — y compris un administrateur, pour son propre compte. */
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post(`${V1}/auth/change-password`, { currentPassword, newPassword }),
};

export const vehicleApi = {
  list: (page = 0, size = 20) =>
    api.get<PageResponse<Vehicle>>(`${V1}/vehicles`, { params: { page, size } })
       .then((r) => r.data),

  stats: () => api.get<VehicleStats>(`${V1}/vehicles/stats`).then((r) => r.data),

  search: (q: string) => api.get<Vehicle[]>(`${V1}/vehicles/search`, { params: { q } }).then((r) => r.data),

  get: (id: number) => api.get<VehicleDetail>(`${V1}/vehicles/${id}`).then((r) => r.data),

  create: (payload: CreateVehicleRequest) =>
    api.post<Vehicle>(`${V1}/vehicles`, payload).then((r) => r.data),

  update: (id: number, payload: CreateVehicleRequest) =>
    api.put<VehicleDetail>(`${V1}/vehicles/${id}`, payload).then((r) => r.data),

  delete: (id: number) => api.delete(`${V1}/vehicles/${id}`),

  assignmentHistory: (vehicleId: number) =>
    api.get<Assignment[]>(`${V1}/vehicles/${vehicleId}/assignments`).then((r) => r.data),

  assignDriver: (vehicleId: number, payload: AssignmentRequest) =>
    api.post<Assignment>(`${V1}/vehicles/${vehicleId}/assignments`, payload).then((r) => r.data),

  releaseAssignment: (vehicleId: number) =>
    api.delete(`${V1}/vehicles/${vehicleId}/assignments/current`),
};

export const trackingApi = {
  currentPositions: () =>
    api.get<LivePosition[]>(`${V1}/tracking/positions/current`).then((r) => r.data),

  stats: () => api.get<TrackingStats>(`${V1}/tracking/stats`).then((r) => r.data),

  history: (vehicleId: number, from?: string, to?: string) =>
    api.get(`${V1}/tracking/vehicles/${vehicleId}/history`, { params: { from, to } })
       .then((r) => r.data),
};

export const missionApi = {
  list: (page = 0, size = 20) =>
    api.get<PageResponse<Mission>>(`${V1}/missions`, { params: { page, size } })
       .then((r) => r.data),

  stats: (from?: string, to?: string) =>
    api.get<MissionStats>(`${V1}/missions/stats`, { params: { from, to } }).then((r) => r.data),

  get: (id: number) => api.get<MissionDetail>(`${V1}/missions/${id}`).then((r) => r.data),

  mine: () => api.get<Mission[]>(`${V1}/missions/mine`).then((r) => r.data),

  estimate: (params: {
    originCityId?: number; destinationCityId?: number;
    originAgencyId?: number; destinationAgencyId?: number;
    originQuartierId?: number; destinationQuartierId?: number; vehicleId?: number;
  }) => api.get<MissionEstimate>(`${V1}/missions/estimate`, { params }).then((r) => r.data),

  create: (payload: CreateMissionRequest) =>
    api.post<MissionDetail>(`${V1}/missions`, payload).then((r) => r.data),

  update: (id: number, payload: CreateMissionRequest) =>
    api.put<MissionDetail>(`${V1}/missions/${id}`, payload).then((r) => r.data),

  start: (id: number) => api.post<MissionDetail>(`${V1}/missions/${id}/start`).then((r) => r.data),

  complete: (id: number, payload: MissionCompleteRequest) =>
    api.post<MissionDetail>(`${V1}/missions/${id}/complete`, payload).then((r) => r.data),

  cancel: (id: number, payload: MissionCancelRequest) =>
    api.post<MissionDetail>(`${V1}/missions/${id}/cancel`, payload).then((r) => r.data),

  addDetour: (id: number, payload: MissionDetourRequest) =>
    api.post<MissionDetail>(`${V1}/missions/${id}/detour`, payload).then((r) => r.data),
};

export const missionAutomationApi = {
  list: () => api.get<MissionAutomation[]>(`${V1}/mission-automations`).then((r) => r.data),

  create: (payload: CreateMissionAutomationRequest) =>
    api.post<MissionAutomation>(`${V1}/mission-automations`, payload).then((r) => r.data),

  deactivate: (id: number) => api.post(`${V1}/mission-automations/${id}/deactivate`),
};

export const clientApi = {
  list: (page = 0, size = 20) =>
    api.get<PageResponse<Client>>(`${V1}/clients`, { params: { page, size } }).then((r) => r.data),

  active: () => api.get<Client[]>(`${V1}/clients/active`).then((r) => r.data),

  create: (payload: CreateClientRequest) =>
    api.post<Client>(`${V1}/clients`, payload).then((r) => r.data),
};

export const serviceTypeApi = {
  list: () => api.get<ServiceType[]>(`${V1}/service-types`).then((r) => r.data),
};

export const documentApi = {
  download: (id: number) =>
    api.get(`${V1}/documents/${id}/download`, { responseType: 'blob' }),
};

export const fuelApi = {
  stats: (from?: string, to?: string, cityId?: number) =>
    api.get<FuelStats>(`${V1}/fuel-logs/stats`, { params: { from, to, cityId } }).then((r) => r.data),

  list: (page = 0, size = 20) =>
    api.get<PageResponse<FuelLog>>(`${V1}/fuel-logs`, { params: { page, size } })
       .then((r) => r.data),

  forVehicle: (vehicleId: number) =>
    api.get<FuelLog[]>(`${V1}/fuel-logs/vehicle/${vehicleId}`).then((r) => r.data),

  anomalies: () => api.get<FuelLog[]>(`${V1}/fuel-logs/anomalies`).then((r) => r.data),

  create: (payload: FuelLogRequest) =>
    api.post<FuelLog>(`${V1}/fuel-logs`, payload).then((r) => r.data),

  update: (id: number, payload: FuelLogRequest) =>
    api.put<FuelLog>(`${V1}/fuel-logs/${id}`, payload).then((r) => r.data),

  cancel: (id: number, reason: string) =>
    api.post<FuelLog>(`${V1}/fuel-logs/${id}/cancel`, { reason }).then((r) => r.data),

  tankLevels: (cityId?: number) =>
    api.get<TankLevel[]>(`${V1}/fuel-logs/tank-levels`, { params: { cityId } }).then((r) => r.data),

  weeklyRefuel: (from?: string, to?: string, cityId?: number) =>
    api.get<WeeklyRefuel[]>(`${V1}/fuel-logs/weekly-refuel`, { params: { from, to, cityId } })
       .then((r) => r.data),
};

export const alertApi = {
  list: (page = 0, size = 20, level?: string) =>
    api.get<PageResponse<Alert>>(`${V1}/alerts`, { params: { page, size, level } })
       .then((r) => r.data),

  recent: () => api.get<Alert[]>(`${V1}/alerts/recent`).then((r) => r.data),

  stats: (from?: string, to?: string) =>
    api.get<AlertStats>(`${V1}/alerts/stats`, { params: { from, to } }).then((r) => r.data),

  acknowledge: (id: number) => api.post<Alert>(`${V1}/alerts/${id}/acknowledge`).then((r) => r.data),

  resolve: (id: number, note: string) =>
    api.post<Alert>(`${V1}/alerts/${id}/resolve`, { note }).then((r) => r.data),
};

export const driverApi = {
  list: (page = 0, size = 20) =>
    api.get<PageResponse<Driver>>(`${V1}/drivers`, { params: { page, size } })
       .then((r) => r.data),

  ranking: () => api.get<Driver[]>(`${V1}/drivers/ranking`).then((r) => r.data),

  semesterRanking: () => api.get<DriverSemesterRanking[]>(`${V1}/drivers/semester-ranking`).then((r) => r.data),

  stats: () => api.get<DriverStats>(`${V1}/drivers/stats`).then((r) => r.data),

  search: (q: string) => api.get<Driver[]>(`${V1}/drivers/search`, { params: { q } }).then((r) => r.data),

  unassigned: () => api.get<Driver[]>(`${V1}/drivers/unassigned`).then((r) => r.data),

  detail: (id: number) => api.get<DriverDetail>(`${V1}/drivers/${id}`).then((r) => r.data),

  me: () => api.get<DriverDetail>(`${V1}/drivers/me`).then((r) => r.data),

  create: (payload: CreateDriverRequest) =>
    api.post<DriverCreationResult>(`${V1}/drivers`, payload).then((r) => r.data),

  update: (id: number, payload: CreateDriverRequest) =>
    api.put<DriverDetail>(`${V1}/drivers/${id}`, payload).then((r) => r.data),

  delete: (id: number) => api.delete(`${V1}/drivers/${id}`),

  performanceHistory: (id: number) =>
    api.get<PerformancePoint[]>(`${V1}/drivers/${id}/performance-history`).then((r) => r.data),

  alerts: (id: number) => api.get<Alert[]>(`${V1}/drivers/${id}/alerts`).then((r) => r.data),

  fuelEconomy: (from: string, to: string, limit = 5) =>
    api.get<DriverFuelEconomy[]>(`${V1}/drivers/fuel-economy`, { params: { from, to, limit } })
       .then((r) => r.data),

  bonuses: (id: number) => api.get<BonusEntry[]>(`${V1}/drivers/${id}/bonuses`).then((r) => r.data),

  proposeBonus: (id: number, period?: string) =>
    api.post<BonusEntry>(`${V1}/drivers/${id}/bonuses`, null, { params: { period } }).then((r) => r.data),

  decideBonus: (bonusId: number, status: BonusStatus, amount?: number, reason?: string) =>
    api.patch<BonusEntry>(`${V1}/drivers/bonuses/${bonusId}`, { status, amount, reason }).then((r) => r.data),

  actions: (id: number) => api.get<DriverActionEntry[]>(`${V1}/drivers/${id}/actions`).then((r) => r.data),

  addAction: (id: number, payload: DriverActionRequest) =>
    api.post<DriverActionEntry>(`${V1}/drivers/${id}/actions`, payload).then((r) => r.data),
};

export const maintenanceApi = {
  list: (page = 0, size = 20) =>
    api.get<PageResponse<MaintenanceLog>>(`${V1}/maintenance-logs`, { params: { page, size } })
       .then((r) => r.data),

  planned: () => api.get<MaintenanceLog[]>(`${V1}/maintenance-logs/planned`).then((r) => r.data),

  stats: (from?: string, to?: string) =>
    api.get<MaintenanceStats>(`${V1}/maintenance-logs/stats`, { params: { from, to } })
       .then((r) => r.data),

  statsByCity: (from?: string, to?: string) =>
    api.get<MaintenanceCityStats[]>(`${V1}/maintenance-logs/stats/by-city`, { params: { from, to } })
       .then((r) => r.data),

  get: (id: number) =>
    api.get<MaintenanceLog>(`${V1}/maintenance-logs/${id}`).then((r) => r.data),

  create: (payload: MaintenanceRequest) =>
    api.post<MaintenanceLog>(`${V1}/maintenance-logs`, payload).then((r) => r.data),

  update: (id: number, payload: MaintenanceRequest) =>
    api.put<MaintenanceLog>(`${V1}/maintenance-logs/${id}`, payload).then((r) => r.data),

  changeStatus: (id: number, status: string, completionDate?: string) =>
    api.patch<MaintenanceLog>(`${V1}/maintenance-logs/${id}/status`, null, { params: { status, completionDate } })
       .then((r) => r.data),
};

export const adminApi = {
  users: (page = 0, size = 20) =>
    api.get<PageResponse<User>>(`${V1}/users`, { params: { page, size } }).then((r) => r.data),

  createUser: (payload: CreateUserRequest) =>
    api.post<UserCreationResult>(`${V1}/users`, payload).then((r) => r.data),

  updateUser: (id: number, payload: UpdateUserRequest) =>
    api.put<User>(`${V1}/users/${id}`, payload).then((r) => r.data),

  changeUserStatus: (id: number, status: string) =>
    api.patch<User>(`${V1}/users/${id}/status`, null, { params: { status } }).then((r) => r.data),

  resetPassword: (id: number) =>
    api.post<{ temporaryPassword: string }>(`${V1}/users/${id}/reset-password`).then((r) => r.data),

  deleteUser: (id: number) => api.delete(`${V1}/users/${id}`),

  roles: () => api.get<Role[]>(`${V1}/roles`).then((r) => r.data),

  agencies: () => api.get<Agency[]>(`${V1}/agencies/active`).then((r) => r.data),

  createAgency: (payload: CreateAgencyRequest) =>
    api.post<Agency>(`${V1}/agencies`, payload).then((r) => r.data),

  cities: () => api.get<City[]>(`${V1}/cities/active`).then((r) => r.data),

  createCity: (payload: CreateCityRequest) =>
    api.post<City>(`${V1}/cities`, payload).then((r) => r.data),

  alertRules: () => api.get<AlertRule[]>(`${V1}/alert-rules`).then((r) => r.data),

  updateAlertRule: (id: number, payload: Partial<AlertRule>) =>
    api.put<AlertRule>(`${V1}/alert-rules/${id}`, payload).then((r) => r.data),
};

export const quartierApi = {
  active: (cityId: number) =>
    api.get<Quartier[]>(`${V1}/quartiers/active`, { params: { cityId } }).then((r) => r.data),

  create: (payload: CreateQuartierRequest) =>
    api.post<Quartier>(`${V1}/quartiers`, payload).then((r) => r.data),
};

export const geocodingApi = {
  /** null si aucun lieu connu pres de ce point (204). */
  reverse: (lat: number, lng: number) =>
    api.get<ReverseGeocodeResult>(`${V1}/geocoding/reverse`, { params: { lat, lng } })
       .then((r) => (r.status === 204 ? null : r.data)),
};

export interface Partner {
  id: number;
  code: string | null;
  name: string;
  partnerType: 'GARAGE' | 'STATION_SERVICE' | 'ASSUREUR' | 'CENTRE_VISITE' | 'FOURNISSEUR' | 'AUTRE';
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cityId: number | null;
  cityName: string | null;
  taxNumber: string | null;
  notes: string | null;
  active: boolean;
}

export const partnerApi = {
  active: (type?: Partner['partnerType']) =>
    api.get<Partner[]>(`${V1}/partners/active`, { params: { type } }).then((r) => r.data),

  create: (payload: Partial<Partner>) =>
    api.post<Partner>(`${V1}/partners`, payload).then((r) => r.data),
};
