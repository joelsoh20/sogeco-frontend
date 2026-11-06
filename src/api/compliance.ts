import { api } from './client';
import type { PageResponse } from '@/types/api';
import type {
  AgencyProfitability, CarteBleue, CarteBleueRequest, CarteGrise, CarteGriseRequest,
  CarteRose, CarteRoseRequest,
  CityExpenseSummary, Claim, ClaimRequest,
  ClientProfitability, ComplianceStats, CorridorProfitability, CostBreakdown, DeadlineItem,
  ExecutiveDashboard, FleetPerformancePoint, GeneratedReport, InsurancePolicy, InsurancePolicyRequest,
  MissingDocumentItem,
  MonthlyFinancialPoint, OperationalDashboard, ReportFormat, ReportType, TechnicalInspection,
  TechnicalInspectionRequest, TransportLicense, TransportLicenseRequest, VehicleExpenseSummary,
  VehicleProfitability,
  VehicleExpenseReport,
} from '@/types/compliance';

const V1 = '/api/v1';

export const complianceApi = {
  stats: () =>
    api.get<ComplianceStats>(`${V1}/compliance/stats`).then((r) => r.data),

  schedule: (daysAhead = 90) =>
    api.get<DeadlineItem[]>(`${V1}/compliance/schedule`, { params: { daysAhead } }).then((r) => r.data),

  missingDocuments: () =>
    api.get<MissingDocumentItem[]>(`${V1}/compliance/missing-documents`).then((r) => r.data),

  policies: (page = 0, size = 20) =>
    api.get<PageResponse<InsurancePolicy>>(`${V1}/insurance-policies`, { params: { page, size } })
       .then((r) => r.data),

  getPolicy: (id: number) =>
    api.get<InsurancePolicy>(`${V1}/insurance-policies/${id}`).then((r) => r.data),

  createPolicy: (payload: InsurancePolicyRequest) =>
    api.post<InsurancePolicy>(`${V1}/insurance-policies`, payload).then((r) => r.data),

  updatePolicy: (id: number, payload: InsurancePolicyRequest) =>
    api.put<InsurancePolicy>(`${V1}/insurance-policies/${id}`, payload).then((r) => r.data),

  cancelPolicy: (id: number) => api.delete(`${V1}/insurance-policies/${id}`),

  inspections: (page = 0, size = 20) =>
    api.get<PageResponse<TechnicalInspection>>(`${V1}/technical-inspections`, { params: { page, size } })
       .then((r) => r.data),

  getInspection: (id: number) =>
    api.get<TechnicalInspection>(`${V1}/technical-inspections/${id}`).then((r) => r.data),

  inspectionsForVehicle: (vehicleId: number) =>
    api.get<TechnicalInspection[]>(`${V1}/technical-inspections/vehicle/${vehicleId}`).then((r) => r.data),

  createInspection: (payload: TechnicalInspectionRequest) =>
    api.post<TechnicalInspection>(`${V1}/technical-inspections`, payload).then((r) => r.data),

  updateInspection: (id: number, payload: TechnicalInspectionRequest) =>
    api.put<TechnicalInspection>(`${V1}/technical-inspections/${id}`, payload).then((r) => r.data),

  mineInspections: () =>
    api.get<TechnicalInspection[]>(`${V1}/technical-inspections/mine`).then((r) => r.data),

  claims: (page = 0, size = 20) =>
    api.get<PageResponse<Claim>>(`${V1}/claims`, { params: { page, size } }).then((r) => r.data),

  getClaim: (id: number) =>
    api.get<Claim>(`${V1}/claims/${id}`).then((r) => r.data),

  createClaim: (payload: ClaimRequest) =>
    api.post<Claim>(`${V1}/claims`, payload).then((r) => r.data),

  updateClaim: (id: number, payload: ClaimRequest) =>
    api.put<Claim>(`${V1}/claims/${id}`, payload).then((r) => r.data),

  mineClaims: () =>
    api.get<Claim[]>(`${V1}/claims/mine`).then((r) => r.data),

  decideClaim: (id: number, status: string, reimbursedAmount?: number) =>
    api.patch<Claim>(`${V1}/claims/${id}`, { status, reimbursedAmount }).then((r) => r.data),

  cartesBleues: (page = 0, size = 20) =>
    api.get<PageResponse<CarteBleue>>(`${V1}/cartes-bleues`, { params: { page, size } }).then((r) => r.data),

  getCarteBleue: (id: number) =>
    api.get<CarteBleue>(`${V1}/cartes-bleues/${id}`).then((r) => r.data),

  cartesBleuesForVehicle: (vehicleId: number) =>
    api.get<CarteBleue[]>(`${V1}/cartes-bleues/vehicle/${vehicleId}`).then((r) => r.data),

  createCarteBleue: (payload: CarteBleueRequest) =>
    api.post<CarteBleue>(`${V1}/cartes-bleues`, payload).then((r) => r.data),

  updateCarteBleue: (id: number, payload: CarteBleueRequest) =>
    api.put<CarteBleue>(`${V1}/cartes-bleues/${id}`, payload).then((r) => r.data),

  cartesGrises: (page = 0, size = 20) =>
    api.get<PageResponse<CarteGrise>>(`${V1}/cartes-grises`, { params: { page, size } }).then((r) => r.data),

  getCarteGrise: (id: number) =>
    api.get<CarteGrise>(`${V1}/cartes-grises/${id}`).then((r) => r.data),

  cartesGrisesForVehicle: (vehicleId: number) =>
    api.get<CarteGrise[]>(`${V1}/cartes-grises/vehicle/${vehicleId}`).then((r) => r.data),

  createCarteGrise: (payload: CarteGriseRequest) =>
    api.post<CarteGrise>(`${V1}/cartes-grises`, payload).then((r) => r.data),

  updateCarteGrise: (id: number, payload: CarteGriseRequest) =>
    api.put<CarteGrise>(`${V1}/cartes-grises/${id}`, payload).then((r) => r.data),

  mineCartesGrises: () =>
    api.get<CarteGrise[]>(`${V1}/cartes-grises/mine`).then((r) => r.data),

  cartesRoses: (page = 0, size = 20) =>
    api.get<PageResponse<CarteRose>>(`${V1}/cartes-roses`, { params: { page, size } }).then((r) => r.data),

  getCarteRose: (id: number) =>
    api.get<CarteRose>(`${V1}/cartes-roses/${id}`).then((r) => r.data),

  cartesRosesForVehicle: (vehicleId: number) =>
    api.get<CarteRose[]>(`${V1}/cartes-roses/vehicle/${vehicleId}`).then((r) => r.data),

  createCarteRose: (payload: CarteRoseRequest) =>
    api.post<CarteRose>(`${V1}/cartes-roses`, payload).then((r) => r.data),

  updateCarteRose: (id: number, payload: CarteRoseRequest) =>
    api.put<CarteRose>(`${V1}/cartes-roses/${id}`, payload).then((r) => r.data),

  mineCartesRoses: () =>
    api.get<CarteRose[]>(`${V1}/cartes-roses/mine`).then((r) => r.data),

  transportLicenses: (page = 0, size = 20) =>
    api.get<PageResponse<TransportLicense>>(`${V1}/transport-licenses`, { params: { page, size } })
       .then((r) => r.data),

  getTransportLicense: (id: number) =>
    api.get<TransportLicense>(`${V1}/transport-licenses/${id}`).then((r) => r.data),

  createTransportLicense: (payload: TransportLicenseRequest) =>
    api.post<TransportLicense>(`${V1}/transport-licenses`, payload).then((r) => r.data),

  updateTransportLicense: (id: number, payload: TransportLicenseRequest) =>
    api.put<TransportLicense>(`${V1}/transport-licenses/${id}`, payload).then((r) => r.data),
};

export const reportApi = {
  /** Statistiques de depenses par domaine et missions par type : un camion (vehicleId) ou toute la flotte. */
  vehicleExpenseReport: (from: string, to: string, vehicleIds: number[] = []) =>
    api.get<VehicleExpenseReport>(`${V1}/reports/vehicle-expenses/report`, { params: { from, to, vehicleIds: vehicleIds.join(',') || undefined } })
      .then((r) => r.data),

  /** Rapport PDF des depenses par camion et par domaine, avec le bilan des missions par type. */
  vehicleExpensesPdf: (from: string, to: string, vehicleIds: number[] = []) =>
    api.get<Blob>(`${V1}/reports/vehicle-expenses/pdf`, { params: { from, to, vehicleIds: vehicleIds.join(',') || undefined }, responseType: 'blob' })
      .then((r) => r.data)
      .catch(async (e) => {
        // Avec responseType blob, le corps de l'erreur est un Blob : on le relit pour que
        // errorMessage affiche le vrai motif (droit manquant, periode invalide...).
        if (e?.response?.data instanceof Blob) {
          try { e.response.data = JSON.parse(await e.response.data.text()); } catch { /* corps non JSON */ }
        }
        throw e;
      }),

  vehicleExpenses: (year: number) =>
    api.get<VehicleExpenseSummary[]>(`${V1}/reports/vehicle-expenses`, { params: { year } }).then((r) => r.data),

  cityExpenses: (year: number) =>
    api.get<CityExpenseSummary[]>(`${V1}/reports/city-expenses`, { params: { year } }).then((r) => r.data),

  vehicles: (from: string, to: string) =>
    api.get<VehicleProfitability[]>(`${V1}/reports/vehicles`, { params: { from, to } }).then((r) => r.data),

  clients: (from: string, to: string) =>
    api.get<ClientProfitability[]>(`${V1}/reports/clients`, { params: { from, to } }).then((r) => r.data),

  corridors: (from: string, to: string) =>
    api.get<CorridorProfitability[]>(`${V1}/reports/corridors`, { params: { from, to } }).then((r) => r.data),

  agencies: (from: string, to: string) =>
    api.get<AgencyProfitability[]>(`${V1}/reports/agencies`, { params: { from, to } }).then((r) => r.data),

  costBreakdown: (from: string, to: string) =>
    api.get<CostBreakdown>(`${V1}/reports/cost-breakdown`, { params: { from, to } }).then((r) => r.data),

  monthlyTrend: (from: string, to: string) =>
    api.get<MonthlyFinancialPoint[]>(`${V1}/reports/monthly-trend`, { params: { from, to } }).then((r) => r.data),

  fleetPerformance: (from: string, to: string) =>
    api.get<FleetPerformancePoint[]>(`${V1}/reports/fleet-performance`, { params: { from, to } }).then((r) => r.data),

  export: (type: ReportType, format: ReportFormat, from: string, to: string) =>
    api.post<GeneratedReport>(`${V1}/reports/export`, null, { params: { type, format, from, to } })
       .then((r) => r.data),

  history: (page = 0, size = 10) =>
    api.get<PageResponse<GeneratedReport>>(`${V1}/reports/history`, { params: { page, size } })
       .then((r) => r.data),

  /**
   * Telechargement d'un rapport.
   *
   * Un simple lien <a href> ne porterait pas le jeton d'acces : la
   * route est protegee. On recupere donc le fichier binaire via axios,
   * puis on declenche l'enregistrement navigateur avec une URL Blob
   * temporaire, revoquee juste apres usage.
   */
  download: async (report: GeneratedReport) => {
    const response = await api.get(`${V1}/reports/${report.id}/download`, { responseType: 'blob' });
    const extension = report.format.toLowerCase();
    const fileName = `${report.reportType}_${report.periodStart}_${report.periodEnd}.${extension}`;

    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const dashboardApi = {
  executive: (from?: string, to?: string) =>
    api.get<ExecutiveDashboard>(`${V1}/dashboard/executive`, { params: { from, to } }).then((r) => r.data),

  operational: () =>
    api.get<OperationalDashboard>(`${V1}/dashboard/operational`).then((r) => r.data),
};
