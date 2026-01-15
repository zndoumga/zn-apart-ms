import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Currency, UserMode, ToastData } from '../types';

interface AppState {
  // Mode
  mode: UserMode;
  switchToAdmin: (password: string, correctPassword: string) => boolean;
  switchToStaff: (password: string, correctPassword: string) => boolean;
  switchToInvestor: (password: string, correctPassword: string) => boolean;
  
  // Currency
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  
  // Toasts
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
  
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  
  // Mobile Menu
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  
  // Settings
  lowBalanceThreshold: number;
  setLowBalanceThreshold: (threshold: number) => void;
  
  // First time access
  modeInitialized: boolean;
  setModeInitialized: (initialized: boolean) => void;
}

// Generate unique ID for toasts
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Mode - default to staff
      mode: 'staff',
      
      switchToAdmin: (password: string, correctPassword: string) => {
        if (password === correctPassword) {
          set({ mode: 'admin', modeInitialized: true });
          get().addToast({
            type: 'success',
            title: 'Mode Admin activé',
            message: 'Vous avez maintenant accès à toutes les fonctionnalités.',
          });
          return true;
        }
        get().addToast({
          type: 'error',
          title: 'Mot de passe incorrect',
          message: 'Le mot de passe admin est incorrect.',
        });
        return false;
      },
      
      switchToStaff: (password: string, correctPassword: string) => {
        if (password === correctPassword) {
          set({ mode: 'staff', modeInitialized: true });
          get().addToast({
            type: 'success',
            title: 'Mode Staff activé',
            message: 'Vous êtes maintenant en mode staff.',
          });
          return true;
        }
        get().addToast({
          type: 'error',
          title: 'Mot de passe incorrect',
          message: 'Le mot de passe staff est incorrect.',
        });
        return false;
      },
      
      switchToInvestor: (password: string, correctPassword: string) => {
        if (password === correctPassword) {
          set({ mode: 'investor', modeInitialized: true });
          get().addToast({
            type: 'success',
            title: 'Mode Investisseur activé',
            message: 'Vous avez maintenant accès en lecture seule.',
          });
          return true;
        }
        get().addToast({
          type: 'error',
          title: 'Mot de passe incorrect',
          message: 'Le mot de passe investisseur est incorrect.',
        });
        return false;
      },
      
      // Currency
      currency: 'EUR',
      setCurrency: (currency) => set({ currency }),
      
      exchangeRate: 655.957, // Default EUR to FCFA rate
      setExchangeRate: (exchangeRate) => set({ exchangeRate }),
      
      // Toasts
      toasts: [],
      addToast: (toast) => {
        const newToast: ToastData = {
          ...toast,
          id: generateId(),
        };
        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));
      },
      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },
      
      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      // Mobile Menu
      mobileMenuOpen: false,
      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
      
      // Settings
      lowBalanceThreshold: 100, // EUR
      setLowBalanceThreshold: (lowBalanceThreshold) => set({ lowBalanceThreshold }),
      
      // First time access
      modeInitialized: false,
      setModeInitialized: (modeInitialized) => set({ modeInitialized }),
    }),
    {
      name: 'zn-apartment-storage',
      partialize: (state) => ({
        mode: state.mode,
        currency: state.currency,
        exchangeRate: state.exchangeRate,
        sidebarOpen: state.sidebarOpen,
        lowBalanceThreshold: state.lowBalanceThreshold,
        modeInitialized: state.modeInitialized,
      }),
    }
  )
);

// Custom hooks for common operations
export const useMode = () => {
  const mode = useAppStore((state) => state.mode);
  const switchToAdmin = useAppStore((state) => state.switchToAdmin);
  const switchToStaff = useAppStore((state) => state.switchToStaff);
  const switchToInvestor = useAppStore((state) => state.switchToInvestor);
  const isAdmin = mode === 'admin';
  const isStaff = mode === 'staff';
  const isInvestor = mode === 'investor';
  
  return { mode, switchToAdmin, switchToStaff, switchToInvestor, isAdmin, isStaff, isInvestor };
};

export const useCurrency = () => {
  const currency = useAppStore((state) => state.currency);
  const setCurrency = useAppStore((state) => state.setCurrency);
  const exchangeRate = useAppStore((state) => state.exchangeRate);
  const setExchangeRate = useAppStore((state) => state.setExchangeRate);
  
  const formatAmount = (amountEUR: number, amountFCFA: number) => {
    if (currency === 'EUR') {
      const formatted = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amountEUR);
      // Replace space/non-breaking space thousand separators with dot
      // Format is typically "1 200 €" (without decimals)
      // We want "1.200€" (dot for thousands, no space before €)
      let result = formatted.replace(/(\d)[\s\u00A0](\d)/g, '$1.$2'); // Replace spaces between digits
      result = result.replace(/[\s\u00A0]+€/, '€'); // Remove space before €
      return result;
    }
    // For FCFA: round up to nearest 25 and use dot as thousand separator
    const rounded = Math.ceil(amountFCFA / 25) * 25;
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted} FCFA`;
  };
  
  const convertToFCFA = (amountEUR: number) => Math.round(amountEUR * exchangeRate);
  const convertToEUR = (amountFCFA: number) => Math.round((amountFCFA / exchangeRate) * 100) / 100;
  
  return {
    currency,
    setCurrency,
    exchangeRate,
    setExchangeRate,
    formatAmount,
    convertToFCFA,
    convertToEUR,
  };
};

export const useToast = () => {
  const addToast = useAppStore((state) => state.addToast);
  const removeToast = useAppStore((state) => state.removeToast);
  const toasts = useAppStore((state) => state.toasts);
  
  const success = (title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  };
  
  const error = (title: string, message?: string) => {
    addToast({ type: 'error', title, message });
  };
  
  const warning = (title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  };
  
  const info = (title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  };
  
  return { toasts, addToast, removeToast, success, error, warning, info };
};

export default useAppStore;

