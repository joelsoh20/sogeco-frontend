import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { DriverPortalPage } from '@/pages/DriverPortalPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TrackingPage } from '@/pages/TrackingPage';
import { VehiclesPage } from '@/pages/VehiclesPage';
import { MissionsPage } from '@/pages/MissionsPage';
import { FuelPage } from '@/pages/FuelPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { DriversPage } from '@/pages/DriversPage';
import { MaintenancePage } from '@/pages/MaintenancePage';
import { CompliancePage } from '@/pages/CompliancePage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/connexion" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/mon-espace" element={<DriverPortalPage />} />
            <Route path="/tableau-de-bord" element={<DashboardPage />} />
            <Route path="/carte" element={<TrackingPage />} />
            <Route path="/camions" element={<VehiclesPage />} />
            <Route path="/missions" element={<MissionsPage />} />
            <Route path="/carburant" element={<FuelPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/conformite" element={<CompliancePage />} />
            <Route path="/chauffeurs" element={<DriversPage />} />
            <Route path="/rapports" element={<ReportsPage />} />
            <Route path="/alertes" element={<AlertsPage />} />
            <Route path="/parametres" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
