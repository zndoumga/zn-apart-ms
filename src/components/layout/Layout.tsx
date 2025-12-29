import React from 'react';
import { Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import Sidebar from './Sidebar';
import Header from './Header';
import { ToastContainer } from '../ui/Toast';
import { useAppStore, useToast } from '../../store/useAppStore';

const Layout: React.FC = () => {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const mobileMenuOpen = useAppStore((state) => state.mobileMenuOpen);
  const setMobileMenuOpen = useAppStore((state) => state.setMobileMenuOpen);
  const { toasts, removeToast } = useToast();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main
        className={clsx(
          'transition-all duration-300 pt-16 min-h-screen',
          'lg:ml-20',
          sidebarOpen && 'lg:ml-64'
        )}
      >
        <div className="p-3 sm:p-4 lg:p-6">
          <Outlet />
        </div>
      </main>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default Layout;

