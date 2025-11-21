import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- Layouts ---
import LabLayout from '../layouts/LabLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';

// --- Pages: Auth ---
// Make sure you have created/populated this file in src/pages/auth/Login.jsx
import Login from '../pages/auth/Login';

// --- Pages: Core Domains ---
// Ensure these files exist in your src/pages directory structure
import LabDashboard from '../pages/dashboard/LabDashboard';
import CaseList from '../pages/cases/CaseList';
import CaseDetail from '../pages/cases/CaseDetail';
import ProductionQueue from '../pages/production/ProductionQueue';
import Invoices from '../pages/finance/Invoices';
import LabSettings from '../pages/settings/LabSettings';
import NotFound from '../pages/NotFound';

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* ====================================================
            1. AUTH ROUTES (Public)
            ==================================================== */}
        <Route element={<AuthLayout />}>
          <Route path="/auth/login" element={<Login />} />
          {/* Redirect root login path to the specific auth login path */}
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        </Route>

        {/* ====================================================
            2. PROTECTED LAB ROUTES
            ==================================================== */}
        {/* The outer Route checks if the user is authenticated.
            If they are not, ProtectedRoute redirects them to /auth/login.
        */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<LabLayout />}>
            
            {/* Dashboard (Accessible to all authenticated users) */}
            <Route index element={<LabDashboard />} />

            {/* Case Management */}
            <Route path="cases">
              {/* List of cases */}
              <Route index element={<CaseList />} />
              {/* Individual case details */}
              <Route path=":caseId" element={<CaseDetail />} />
            </Route>

            {/* Production / Manufacturing */}
            {/* Example of RBAC: Only users with 'CASE_EDIT_PRODUCTION' or similar 
               permissions might be allowed here. For now, we leave it open to all staff,
               or you can restrict it like the Finance route below.
            */}
            <Route path="production" element={<ProductionQueue />} />

            {/* Finance */}
            {/* RBAC ENFORCEMENT:
               This route is wrapped in a specific ProtectedRoute that checks for 
               the 'FINANCE_VIEW' permission. If a 'Driver' or 'Technician' tries 
               to access /finance, they will see the "Access Denied" screen.
            */}
            <Route element={<ProtectedRoute requiredPermissions={['FINANCE_VIEW']} />}>
               <Route path="finance" element={<Invoices />} />
            </Route>

            {/* Settings */}
            {/* Usually restricted to Admins */}
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