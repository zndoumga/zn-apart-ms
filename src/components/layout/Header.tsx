import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Bell,
  Search,
  User,
  Lock,
  Unlock,
  Menu,
} from 'lucide-react';
import { useAppStore, useMode, useCurrency } from '../../store/useAppStore';
import CurrencyToggle from '../ui/CurrencyToggle';
import ModeToggle from './ModeToggle';

const Header: React.FC = () => {
  const { isAdmin, switchToStaff } = useMode();
  const { currency, setCurrency } = useCurrency();
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setMobileMenuOpen = useAppStore((state) => state.setMobileMenuOpen);
  const mobileMenuOpen = useAppStore((state) => state.mobileMenuOpen);
  const [showModeToggle, setShowModeToggle] = useState(false);
  const navigate = useNavigate();

  const handleLockToStaff = () => {
    switchToStaff();
    navigate('/dashboard');
  };

  return (
    <>
      <header
        className={clsx(
          'fixed top-0 right-0 z-30 h-16 bg-white border-b border-gray-200 transition-all duration-300',
          'left-0 lg:left-20',
          sidebarOpen && 'lg:left-64'
        )}
      >
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="bg-transparent border-none outline-none text-sm w-48 lg:w-64"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Currency Toggle */}
            <CurrencyToggle
              value={currency}
              onChange={setCurrency}
              size="sm"
            />

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
            </button>

            {/* Mode Toggle Button */}
            {isAdmin ? (
              <button
                onClick={handleLockToStaff}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
              >
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Verrouiller</span>
              </button>
            ) : (
              <button
                onClick={() => setShowModeToggle(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <Unlock className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Admin</span>
              </button>
            )}

            {/* User menu */}
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600" />
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium text-gray-900">
                  {isAdmin ? 'Administrateur' : 'Staff'}
                </p>
                <p className="text-xs text-gray-500">ZN Apart MS</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mode Toggle Modal */}
      <ModeToggle isOpen={showModeToggle} onClose={() => setShowModeToggle(false)} />
    </>
  );
};

export default Header;

