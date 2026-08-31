import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, BarChart3, Fuel, Home, LayoutDashboard, MapPin, Package,
  Settings, ShieldCheck, Truck, User, Users, Wrench, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { SPRING_SNAPPY } from '@/lib/motion';

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof Truck;
  /** Permissions donnant acces a l'entree. Vide : toujours visible. */
  permissions?: string[];
  /**
   * Roles donnant acces a l'entree, verifies en plus de `permissions`.
   * Necessaire pour "Mon espace" : SELF_READ est accorde a tous les
   * roles (ROLE_ADMIN a TOUTES les permissions), donc un filtre par
   * permission seul le ferait apparaitre pour l'administrateur aussi.
   */
  roles?: string[];
  badgeKey?: 'alerts';
}

const NAVIGATION: NavItem[] = [
  { to: '/',              labelKey: 'nav.home',        icon: Home },
  { to: '/mon-espace',    labelKey: 'nav.driverPortal', icon: User,          roles: ['ROLE_CHAUFFEUR'] },
  { to: '/tableau-de-bord', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/carte',         labelKey: 'nav.map',         icon: MapPin,        permissions: ['TRACKING_READ'] },
  { to: '/camions',       labelKey: 'nav.vehicles',    icon: Truck,         permissions: ['VEHICLE_READ'] },
  { to: '/missions',      labelKey: 'nav.missions',    icon: Package,       permissions: ['MISSION_READ'] },
  { to: '/carburant',     labelKey: 'nav.fuel',        icon: Fuel,          permissions: ['FUEL_READ'] },
  { to: '/maintenance',   labelKey: 'nav.maintenance', icon: Wrench,        permissions: ['MAINTENANCE_READ'] },
  { to: '/conformite',    labelKey: 'nav.compliance',  icon: ShieldCheck,   permissions: ['INSURANCE_READ'] },
  { to: '/chauffeurs',    labelKey: 'nav.drivers',     icon: Users,         permissions: ['DRIVER_READ'] },
  { to: '/rapports',      labelKey: 'nav.reports',     icon: BarChart3,     permissions: ['REPORT_READ'] },
  { to: '/alertes',       labelKey: 'nav.alerts',      icon: AlertTriangle, permissions: ['ALERT_READ'], badgeKey: 'alerts' },
  { to: '/parametres',    labelKey: 'nav.settings',    icon: Settings,      permissions: ['SETTING_MANAGE', 'USER_MANAGE'] },
];

interface SidebarProps {
  alertCount?: number;
  /** Ouvert en superposition sur mobile/tablette (< lg) — sans effet en desktop, toujours visible. */
  open?: boolean;
  onClose?: () => void;
}

/**
 * Le fond navy-900 (#0B1730) ne change pas entre les deux themes : il
 * est deja assez sombre pour fonctionner tel quel en mode sombre.
 * C'est le reste de l'application qui s'assombrit pour la rejoindre.
 *
 * En dessous de lg (tablette portrait et telephone), la barre laterale
 * n'occupe plus de largeur en permanence : elle devient un panneau qui
 * glisse depuis la gauche par-dessus le contenu, ouvert via le bouton
 * menu du Topbar et ferme au clic sur le fond ou sur un lien.
 */
export function Sidebar({ alertCount = 0, open = false, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasRole = useAuthStore((state) => state.hasRole);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[450] bg-black/40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          // z-[460] : au-dessus de tout contenu de page flottant (ex. carte
          // GPS, z-[400]) — le menu mobile, une fois ouvert, doit toujours
          // recouvrir l'integralite de la page, jamais laisser un element
          // flottant par-dessus. Seuls les toasts (z-[600]) restent au-dessus.
          'fixed inset-y-0 left-0 z-[460] flex w-64 shrink-0 flex-col bg-navy-900 text-slate-300',
          'transition-transform duration-200 ease-out lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
            <img src="/logo.jpeg" alt="SOGECO" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="font-semibold tracking-wide text-white">SOGECO</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Fleet Manager</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {NAVIGATION.map((item) => {
            // Une entree dont l'utilisateur n'a pas les droits n'est pas
            // affichee grisee : elle n'existe pas pour lui.
            if (item.permissions && !hasAnyPermission(...item.permissions)) {
              return null;
            }
            if (item.roles && !item.roles.some((role) => hasRole(role))) {
              return null;
            }

            const Icon = item.icon;
            const badge = item.badgeKey === 'alerts' && alertCount > 0 ? alertCount : null;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:text-white"
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-lg bg-accent"
                        transition={SPRING_SNAPPY}
                      />
                    )}
                    <Icon size={18} className={cn('relative z-10 shrink-0', isActive && 'text-white')} />
                    <span className={cn('relative z-10 flex-1 truncate', isActive && 'text-white')}>
                      {t(item.labelKey)}
                    </span>
                    {badge && (
                      <motion.span
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={SPRING_SNAPPY}
                        className="relative z-10 rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold text-white"
                      >
                        {badge}
                      </motion.span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-[11px] leading-relaxed text-slate-500">
            {t('nav.footer')}
            <br />
            {t('nav.tagline')}
          </p>
        </div>
      </aside>
    </>
  );
}
