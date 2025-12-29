import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout';

// Pages
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Expenses from './pages/Expenses';
import Tasks from './pages/Tasks';
import Requests from './pages/Requests';
import Properties from './pages/Properties';
import Customers from './pages/Customers';
import Maintenance from './pages/Maintenance';
import MobileMoney from './pages/MobileMoney';
import Finances from './pages/Finances';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';

// Guards
import { useMode } from './store/useAppStore';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Admin-only route guard
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useMode();
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Common routes (Staff + Admin) */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/mobile-money" element={<MobileMoney />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/requests" element={<Requests />} />
            
            {/* Admin-only routes */}
            <Route
              path="/properties"
              element={
                <AdminRoute>
                  <Properties />
                </AdminRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <AdminRoute>
                  <Customers />
                </AdminRoute>
              }
            />
            <Route
              path="/maintenance"
              element={
                <AdminRoute>
                  <Maintenance />
                </AdminRoute>
              }
            />
            <Route
              path="/finances"
              element={
                <AdminRoute>
                  <Finances />
                </AdminRoute>
              }
            />
            <Route
              path="/audit-log"
              element={
                <AdminRoute>
                  <AuditLog />
                </AdminRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <AdminRoute>
                  <Settings />
                </AdminRoute>
              }
            />
            
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
