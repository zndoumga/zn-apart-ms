import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import Sidebar from './Sidebar';
import Header from './Header';
import ModeToggle from './ModeToggle';
import { ToastContainer } from '../ui/Toast';
import { useAppStore, useToast } from '../../store/useAppStore';

const Layout: React.FC = () => {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const mobileMenuOpen = useAppStore((state) => state.mobileMenuOpen);
  const setMobileMenuOpen = useAppStore((state) => state.setMobileMenuOpen);
  const mode = useAppStore((state) => state.mode);
  const modeInitialized = useAppStore((state) => state.modeInitialized);
  const setModeInitialized = useAppStore((state) => state.setModeInitialized);
  const { toasts, removeToast } = useToast();
  const [showModeToggle, setShowModeToggle] = useState(false);

  // Auto-initialize if mode exists in localStorage (persisted mode)
  // Only show blocking modal for truly first-time users (no mode set)
  useEffect(() => {
    if (!modeInitialized) {
      // Check localStorage directly to see if mode was previously set
      const stored = localStorage.getItem('zn-apartment-storage');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // If mode exists in storage, auto-initialize (user has previously authenticated)
          if (parsed.state?.mode) {
            setModeInitialized(true);
          } else {
            // First-time user - show blocking modal
            setShowModeToggle(true);
          }
        } catch (e) {
          // First-time user - show blocking modal
          setShowModeToggle(true);
        }
      } else {
        // First-time user - show blocking modal
        setShowModeToggle(true);
      }
    }
  }, [modeInitialized, setModeInitialized]);

  // Block access if mode not initialized (first-time user only)
  if (!modeInitialized && showModeToggle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <ModeToggle 
          isOpen={true} 
          onClose={() => {}} // Prevent closing without authentication
          blocking={true} // Block access until authenticated
        />
      </div>
    );
  }

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

