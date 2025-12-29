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
  { name: 'Mobile Money', href: '/mobile-money', icon: PiggyBank },
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
  { name: 'Appartements', href: '/properties', icon: Building2, adminOnly: true },
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
        'bg-white border-r border-gray-200/80 shadow-sm',
        // Desktop: show based on sidebarOpen
        'hidden lg:block',
        sidebarOpen ? 'lg:w-64' : 'lg:w-20',
        // Mobile: show based on mobileMenuOpen
        mobileMenuOpen && '!block w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Home className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="animate-fadeIn">
              <h1 className="text-base font-semibold text-gray-900">ZN Apart MS</h1>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
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
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                'group relative',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 flex-shrink-0',
                  isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'
                )}
              />
              {(sidebarOpen || mobileMenuOpen) && (
                <span className={clsx(
                  'text-sm font-medium truncate animate-fadeIn',
                  isActive ? 'text-indigo-700' : 'text-gray-700'
                )}>
                  {item.name}
                </span>
              )}
              {!sidebarOpen && !mobileMenuOpen && (
                <div
                  className={clsx(
                    'absolute left-full ml-3 px-3 py-1.5 rounded-lg text-sm font-medium',
                    'bg-gray-900 text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible',
                    'transition-all duration-200 whitespace-nowrap z-50 shadow-lg'
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
      <div className="p-4 border-t border-gray-100">
        <div
          className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl',
            isAdmin ? 'bg-indigo-50' : 'bg-emerald-50'
          )}
        >
          <div
            className={clsx(
              'w-2 h-2 rounded-full',
              isAdmin ? 'bg-indigo-500' : 'bg-emerald-500'
            )}
          />
          {(sidebarOpen || mobileMenuOpen) && (
            <span
              className={clsx(
                'text-sm font-medium animate-fadeIn',
                isAdmin ? 'text-indigo-700' : 'text-emerald-700'
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

