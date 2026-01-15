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
  const { isAdmin, isInvestor } = useMode();
  const { currency, setCurrency } = useCurrency();
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setMobileMenuOpen = useAppStore((state) => state.setMobileMenuOpen);
  const mobileMenuOpen = useAppStore((state) => state.mobileMenuOpen);
  const [showModeToggle, setShowModeToggle] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header
        className={clsx(
          'fixed top-0 right-0 z-30 h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200/80 transition-all duration-300',
          'left-0 lg:left-20',
          sidebarOpen && 'lg:left-64'
        )}
      >
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200/60">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 w-48 lg:w-64"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Currency Toggle */}
            <CurrencyToggle
              value={currency}
              onChange={setCurrency}
              size="sm"
            />

            {/* Notifications */}
            <button className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            {/* Mode Toggle Button */}
            <button
              onClick={() => setShowModeToggle(true)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-xl transition-colors",
                isAdmin 
                  ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  : isInvestor
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {isAdmin ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Changer de mode</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Changer de mode</span>
                </>
              )}
            </button>

            {/* User menu */}
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-semibold text-gray-900">
                  {isAdmin ? 'Administrateur' : isInvestor ? 'Investisseur' : 'Staff'}
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

