import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  CheckSquare,
  MessageSquare,
  Building2,
  Users,
  Wrench,
  PiggyBank,
  BarChart3,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react';
import { useAppStore, useMode } from '../../store/useAppStore';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const staffNavigation: NavItem[] = [
  { name: 'Vue d\'ensemble', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Réservations', href: '/bookings', icon: Calendar },
  { name: 'Dépenses', href: '/expenses', icon: Receipt },
  { name: 'Tâches', href: '/tasks', icon: CheckSquare },
  { name: 'Demandes', href: '/requests', icon: MessageSquare },
];

const adminNavigation: NavItem[] = [
  { name: 'Vue d\'ensemble', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Réservations', href: '/bookings', icon: Calendar },
  { name: 'Clients', href: '/customers', icon: Users, adminOnly: true },
  { name: 'Dépenses', href: '/expenses', icon: Receipt },
  { name: 'Mobile Money', href: '/mobile-money', icon: PiggyBank, adminOnly: true },
  { name: 'Tableau de bord KPI', href: '/finances', icon: BarChart3, adminOnly: true },
  { name: 'Tâches', href: '/tasks', icon: CheckSquare },
  { name: 'Demandes', href: '/requests', icon: MessageSquare },
  { name: 'Propriétés', href: '/properties', icon: Building2, adminOnly: true },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench, adminOnly: true },
  { name: 'Journal', href: '/audit-log', icon: History, adminOnly: true },
  { name: 'Paramètres', href: '/settings', icon: Settings, adminOnly: true },
];

const Sidebar: React.FC = () => {
  const { isAdmin } = useMode();
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const mobileMenuOpen = useAppStore((state) => state.mobileMenuOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const setMobileMenuOpen = useAppStore((state) => state.setMobileMenuOpen);
  const location = useLocation();

  const navigation = isAdmin ? adminNavigation : staffNavigation;

  // Close mobile menu on navigation
  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out',
        'bg-gradient-to-b from-gray-900 to-gray-800 text-white',
        // Desktop: show based on sidebarOpen
        'hidden lg:block',
        sidebarOpen ? 'lg:w-64' : 'lg:w-20',
        // Mobile: show based on mobileMenuOpen
        mobileMenuOpen && '!block w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
            <Home className="w-6 h-6 text-white" />
          </div>
          {sidebarOpen && (
            <div className="animate-fadeIn">
              <h1 className="text-lg font-bold">ZN Apart MS</h1>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={handleNavClick}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                'group relative',
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              )}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 flex-shrink-0',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {(sidebarOpen || mobileMenuOpen) && (
                <span className="text-sm font-medium truncate animate-fadeIn">
                  {item.name}
                </span>
              )}
              {!sidebarOpen && !mobileMenuOpen && (
                <div
                  className={clsx(
                    'absolute left-full ml-2 px-2 py-1 rounded-md text-sm font-medium',
                    'bg-gray-900 text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible',
                    'transition-all duration-200 whitespace-nowrap z-50'
                  )}
                >
                  {item.name}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Mode indicator */}
      <div className="p-4 border-t border-gray-700">
        <div
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg',
            isAdmin ? 'bg-primary-600/20' : 'bg-success-600/20'
          )}
        >
          <div
            className={clsx(
              'w-2 h-2 rounded-full',
              isAdmin ? 'bg-primary-500' : 'bg-success-500'
            )}
          />
          {(sidebarOpen || mobileMenuOpen) && (
            <span
              className={clsx(
                'text-sm font-medium animate-fadeIn',
                isAdmin ? 'text-primary-300' : 'text-success-300'
              )}
            >
              Mode {isAdmin ? 'Admin' : 'Staff'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

