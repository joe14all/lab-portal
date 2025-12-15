import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * A wrapper for routes that checks:
 * 1. Is the user logged in?
 * 2. Does the user have the required permissions?
 * * Usage: <Route element={<ProtectedRoute requiredPermissions={['FINANCE_VIEW']} />}> ... </Route>
 */
const ProtectedRoute = ({ requiredPermissions = [] }) => {
  const location = useLocation();
  
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    // If context is not available, redirect to login
    console.error('AuthContext not available:', error);
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  
  const { user, isAuthenticated, loading } = authContext;

  if (loading) {
    // Basic loading state - matches your app's style
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Loading session...
      </div>
    );
  }

  // 1. Authentication Check
  if (!isAuthenticated) {
    // Redirect to login, remembering where they tried to go (state.from)
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // 2. Authorization (RBAC) Check
  if (requiredPermissions.length > 0) {
    // We expect the AuthContext to have hydrated the user object with a flattened 'permissions' array.
    const userPermissions = user?.permissions || [];
    
    // "Super Admin" check - ALL_ACCESS bypasses everything
    const isSuperAdmin = userPermissions.includes('ALL_ACCESS');
    
    // Check if user has ALL required permissions for this specific route
    const hasRequired = requiredPermissions.every(p => userPermissions.includes(p));

    if (!isSuperAdmin && !hasRequired) {
      // User is logged in but lacks permission
      return (
        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--error-500)', marginBottom: '1rem' }}>Access Denied</h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2rem' }}>
            You do not have the required permissions to view this page. 
            <br/>
            Required: <code>{requiredPermissions.join(', ')}</code>
          </p>
          <button 
            onClick={() => window.history.back()} 
            style={{
              padding: '0.6em 1.2em',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-surface)',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      );
    }
  }

  // If all checks pass, render the child route (The Page)
  return <Outlet />;
};

export default ProtectedRoute;
