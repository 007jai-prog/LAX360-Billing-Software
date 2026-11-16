import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { BusinessConfigProvider } from './context/BusinessConfigContext';

// Layout
import AppLayout from './components/layout/AppLayout';
import AdminLayout from './pages/admin/layout/AdminLayout';

// Public Pages
import Landing from './pages/landing/Landing';
import CategorySelection from './pages/onboarding/CategorySelection';
import Register from './pages/auth/Register';
import Login from './pages/auth/Login';
import BusinessSetupWizard from './pages/onboarding/BusinessSetupWizard';

// Main Business Pages
import Dashboard from './pages/dashboard/Dashboard';
import POS from './pages/pos/POS';
import InvoicesList from './pages/invoices/InvoicesList';
import ProductsList from './pages/products/ProductsList';
import InventoryList from './pages/inventory/InventoryList';
import SuppliersList from './pages/suppliers/SuppliersList';
import PurchasesList from './pages/purchases/PurchasesList';
import ExpensesList from './pages/expenses/ExpensesList';
import ReportsPage from './pages/reports/ReportsPage';
import EmployeesList from './pages/employees/EmployeesList';
import SettingsPage from './pages/settings/SettingsPage';
import AdminPanel from './pages/admin/AdminPanel';

// Specialized Business Vertical Pages
import { RestaurantTables, KitchenOperations } from './pages/business_modules/RestaurantViews';
import { PharmacyExpiry, PrescriptionsLog } from './pages/business_modules/PharmacyViews';
import { TextileExchanges } from './pages/business_modules/TextileViews';
import { WholesaleWarehouses } from './pages/business_modules/WholesaleViews';
import { IMEILookup, RepairTickets } from './pages/business_modules/ElectronicsViews';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// SuperAdmin Route Guard (Exclusively for LAX360 Platform Administrators)
const SuperAdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Authenticating LAX360 SuperAdmin...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Strictly block business users (tenant admins, store managers, cashiers, accountants)
  if (user?.role !== 'saas_super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <BusinessConfigProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/select-category" element={<CategorySelection />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/setup-wizard"
              element={
                <ProtectedRoute>
                  <BusinessSetupWizard />
                </ProtectedRoute>
              }
            />

            {/* Protected Business SaaS Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="pos" element={<POS />} />
              <Route path="invoices" element={<InvoicesList />} />
              <Route path="products" element={<ProductsList />} />
              <Route path="inventory" element={<InventoryList />} />
              <Route path="suppliers" element={<SuppliersList />} />
              <Route path="purchases" element={<PurchasesList />} />
              <Route path="expenses" element={<ExpensesList />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="employees" element={<EmployeesList />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* Specialized Modules */}
              <Route path="specialized/tables" element={<RestaurantTables />} />
              <Route path="specialized/kitchen" element={<KitchenOperations />} />
              <Route path="specialized/pharmacy-expiry" element={<PharmacyExpiry />} />
              <Route path="specialized/grocery-batches" element={<PharmacyExpiry />} />
              <Route path="specialized/prescriptions" element={<PrescriptionsLog />} />
              <Route path="specialized/exchanges" element={<TextileExchanges />} />
              <Route path="specialized/warehouses" element={<WholesaleWarehouses />} />
              <Route path="specialized/imei-lookup" element={<IMEILookup />} />
              <Route path="specialized/repairs" element={<RepairTickets />} />
            </Route>

            {/* Completely Separate, Private Admin Panel Exclusively for LAX360 Company Administrators */}
            <Route
              path="/admin"
              element={
                <SuperAdminRoute>
                  <AdminLayout />
                </SuperAdminRoute>
              }
            >
              <Route index element={<AdminPanel />} />
              <Route path="dashboard" element={<AdminPanel />} />
              <Route path="businesses" element={<AdminPanel />} />
              <Route path="users" element={<AdminPanel />} />
              <Route path="categories" element={<AdminPanel />} />
              <Route path="subscriptions" element={<AdminPanel />} />
              <Route path="announcements" element={<AdminPanel />} />
              <Route path="audit-logs" element={<AdminPanel />} />
              <Route path="appearance" element={<AdminPanel />} />
              <Route path="settings" element={<AdminPanel />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </BusinessConfigProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
