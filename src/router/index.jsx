import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- Layouts ---
import LabLayout from '../layouts/LabLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';

// --- Pages ---
import Login from '../pages/auth/Login';
import LabDashboard from '../pages/dashboard/LabDashboard';
import CaseList from '../pages/cases/CaseList';
import CaseDetail from '../pages/cases/CaseDetail';
import ProductionQueue from '../pages/production/ProductionQueue';
import Invoices from '../pages/finance/Invoices';
import LogisticsRoutes from '../pages/logistics/LogisticsRoutes';
import NotFound from '../pages/NotFound';

// --- User Settings Pages ---
import SettingsLayout from '../pages/settings/SettingsLayout';
import ProfileSettings from '../pages/settings/ProfileSettings';
import PreferencesSettings from '../pages/settings/PreferencesSettings';

// --- NEW: Lab Admin Pages ---
import LabSettingsLayout from '../pages/lab-settings/LabSettingsLayout';
import LabGeneralSettings from '../pages/lab-settings/LabGeneralSettings';
import LabCatalogSettings from '../pages/lab-settings/LabCatalogSettings';
import LabFinancialSettings from '../pages/lab-settings/LabFinancialSettings';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* 1. AUTH ROUTES */}
        <Route element={<AuthLayout />}>
          <Route path="/auth/login" element={<Login />} />
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        </Route>

        {/* 2. PROTECTED LAB ROUTES */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<LabLayout />}>
            
            <Route index element={<LabDashboard />} />

            <Route path="cases">
              <Route index element={<CaseList />} />
              <Route path=":caseId" element={<CaseDetail />} />
            </Route>

            <Route path="production" element={<ProductionQueue />} />
            
            <Route element={<ProtectedRoute requiredPermissions={['LOGISTICS_VIEW']} />}>
               <Route path="logistics" element={<LogisticsRoutes />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermissions={['FINANCE_VIEW']} />}>
               <Route path="finance" element={<Invoices />} />
            </Route>

            {/* --- USER SETTINGS (Profile, Theme) --- */}
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<ProfileSettings />} />
              <Route path="preferences" element={<PreferencesSettings />} />
            </Route>

            {/* --- NEW: LAB SETTINGS (Admin Area) --- */}
            <Route element={<ProtectedRoute requiredPermissions={['ALL_ACCESS', 'CASE_MANAGE']} />}>
              <Route path="lab-settings" element={<LabSettingsLayout />}>
                <Route index element={<Navigate to="general" replace />} />
                <Route path="general" element={<LabGeneralSettings />} />
                <Route path="catalog" element={<LabCatalogSettings />} />
                <Route path="financials" element={<LabFinancialSettings />} />
                {/* Placeholder for Workflows */}
                <Route path="workflows" element={<div className="card">Workflows Configuration (Coming Soon)</div>} />
              </Route>
            </Route>

          </Route>
        </Route>

        {/* 3. CATCH-ALL */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
};