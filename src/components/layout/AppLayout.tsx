import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { ToastStack } from '@/components/ui/Toast';
import { NotificationPrompt } from './NotificationPrompt';
import { useAlertNotifications } from '@/hooks/useAlertNotifications';
import { alertApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/authStore';

/**
 * Coquille applicative : barre laterale fixe, contenu defilant.
 *
 * Le compteur d'alertes est charge ici et non dans chaque ecran :
 * il alimente a la fois la pastille de la barre laterale et celle de
 * la cloche, sans requete redondante.
 *
 * ToastStack est monte une seule fois ici, jamais par ecran : toute
 * la surface applicative partage la meme pile de notifications.
 */
export function AppLayout() {
  const canReadAlerts = useAuthStore((state) => state.hasPermission('ALERT_READ'));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: alertStats } = useQuery({
    queryKey: ['alerts', 'stats-badge'],
    queryFn: () => alertApi.stats(),
    enabled: canReadAlerts,
    refetchInterval: 60_000,
  });

  const { permission, requestPermission } = useAlertNotifications(canReadAlerts);

  // Compteur dans le titre de l'onglet, comme "(3) WhatsApp" : visible onglet en arriere-plan.
  const activeAlerts = alertStats?.totalActives ?? 0;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = activeAlerts > 0 ? `(${activeAlerts}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [activeAlerts]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        alertCount={alertStats?.totalActives ?? 0}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {canReadAlerts && <NotificationPrompt permission={permission} onEnable={requestPermission} />}
        <Outlet
          context={{
            alertCount: alertStats?.totalActives ?? 0,
            onMenuClick: () => setSidebarOpen(true),
          }}
        />
      </div>
      <ToastStack />
    </div>
  );
}
