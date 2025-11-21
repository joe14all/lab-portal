import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- Layouts ---
import LabLayout from '../layouts/LabLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';

// --- Pages: Auth ---
import Login from '../pages/auth/Login';

// --- Pages: Core Domains ---
import LabDashboard from '../pages/dashboard/LabDashboard';
import CaseList from '../pages/cases/CaseList';
import CaseDetail from '../pages/cases/CaseDetail';
import ProductionQueue from '../pages/production/ProductionQueue';
import Invoices from '../pages/finance/Invoices';
import LabSettings from '../pages/settings/LabSettings';
import NotFound from '../pages/NotFound';

// NEW: Import for Logistics Page (placeholder)
import LogisticsRoutes from '../pages/logistics/LogisticsRoutes'; 

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* ====================================================
            1. AUTH ROUTES (Public)
            ==================================================== */}
        <Route element={<AuthLayout />}>
          <Route path="/auth/login" element={<Login />} />
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        </Route>

        {/* ====================================================
            2. PROTECTED LAB ROUTES
            ==================================================== */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<LabLayout />}>
            
            {/* Dashboard */}
            <Route index element={<LabDashboard />} />

            {/* Case Management */}
            <Route path="cases">
              <Route index element={<CaseList />} />
              <Route path=":caseId" element={<CaseDetail />} />
            </Route>

            {/* Production / Manufacturing */}
            <Route path="production" element={<ProductionQueue />} />
            
            {/* Logistics (Driver/Shipping role access) */}
            <Route element={<ProtectedRoute requiredPermissions={['LOGISTICS_VIEW']} />}>
               <Route path="logistics" element={<LogisticsRoutes />} />
            </Route>

            {/* Finance */}
            <Route element={<ProtectedRoute requiredPermissions={['FINANCE_VIEW']} />}>
               <Route path="finance" element={<Invoices />} />
            </Route>

            {/* Settings */}
            <Route element={<ProtectedRoute requiredPermissions={['ALL_ACCESS']} />}>
              <Route path="settings" element={<LabSettings />} />
            </Route>

          </Route>
        </Route>

        {/* ====================================================
            3. CATCH-ALL (404)
            ==================================================== */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
};