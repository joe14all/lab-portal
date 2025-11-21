/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
// In a real app, we would use a service adapter. 
// For now, we import the JSON mock data directly to simulate the DB.
import usersData from '../_mock/data/auth/users.json';
import rolesData from '../_mock/data/auth/roles.json';
// NEW IMPORT: Audit Logs
import auditLogsData from '../_mock/data/auth/audit_logs.json'; 

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // NEW STATE: Audit Logs
  const [auditLogs, setAuditLogs] = useState([]); 

  // --- 1. HELPER: Hydrate User with Role Permissions ---
  const hydrateUser = useCallback((rawUser) => {
    // Find the role definition to get permissions
    const role = rolesData.find(r => r.id === rawUser.roleId);
    
    // Flatten permissions: Role permissions
    const permissions = role ? role.permissions : [];
    
    const fullUser = {
      ...rawUser,
      roleName: role ? role.name : 'Unknown',
      permissions: permissions,
      // Add a convenience flag for super admins
      isAdmin: permissions.includes('ALL_ACCESS'),
    };

    setUser(fullUser);
    setIsAuthenticated(true);
    setError(null);
  }, []);

  // --- 2. INITIALIZE: Check for existing session & Load Audit Logs ---
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      // Simulate network latency for a "token validation" check
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const storedUserId = localStorage.getItem('lab_user_id');
        if (storedUserId) {
          const foundUser = usersData.find(u => u.id === storedUserId);
          if (foundUser) {
            hydrateUser(foundUser);
          } else {
            // User ID in local storage is invalid/stale/deleted
            localStorage.removeItem('lab_user_id');
          }
        }
        
        // LOAD STATIC AUDIT LOGS
        setAuditLogs(auditLogsData);

      } catch (err) {
        console.error("Auth initialization failed", err);
        setError("Failed to restore session");
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [hydrateUser]);

  // --- 3. ACTION: Login ---
  const login = useCallback(async (email, password) => { // WRAPPED IN useCallback
    setLoading(true);
    setError(null);
    
    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 800)); 

    try {
      const foundUser = usersData.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!foundUser) {
         throw new Error("Invalid email or password");
      }
      
      // Simulate Audit Log creation (Backend would do this)
      console.log(`[Audit] Login Success: User ${foundUser.id} at ${new Date().toISOString()}`);

      // Persist session
      localStorage.setItem('lab_user_id', foundUser.id);
      
      // Update State
      hydrateUser(foundUser);
      setLoading(false);
      return { success: true };

    } catch (err) {
      setLoading(false);
      setError(err.message);
      return { success: false, message: err.message };
    }
  }, [hydrateUser]); // Dependency on hydrateUser

  // --- 4. ACTION: Logout ---
  const logout = useCallback(async () => { // WRAPPED IN useCallback
    // Simulate API call to invalidate token
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (user) {
       console.log(`[Audit] Logout: User ${user.id} at ${new Date().toISOString()}`);
    }

    localStorage.removeItem('lab_user_id');
    setUser(null);
    setIsAuthenticated(false);
  }, [user]); // Dependency on user

  // --- 5. ACTION: Update Profile/Preferences ---
  const updateUser = useCallback(async (updates) => { // WRAPPED IN useCallback
    // Simulate API Update
    await new Promise(resolve => setTimeout(resolve, 500));

    setUser(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  }, []); // No external dependencies

  // --- 6. HELPER: Permission Checks (Unchanged) ---
  
  const hasPermission = useCallback((permissionStr) => {
    if (!user) return false;
    if (user.permissions.includes('ALL_ACCESS')) return true;
    return user.permissions.includes(permissionStr);
  }, [user]);

  const hasAnyPermission = useCallback((permissionsArray) => {
    if (!user) return false;
    if (user.permissions.includes('ALL_ACCESS')) return true;
    return permissionsArray.some(p => user.permissions.includes(p));
  }, [user]);

  const hasRole = useCallback((roleId) => {
    if (!user) return false;
    return user.roleId === roleId;
  }, [user]);


  // --- Expose Value ---
  const value = useMemo(() => ({
    // State
    user,
    isAuthenticated,
    loading,
    error,
    auditLogs, 
    
    // Actions (Stable Function References)
    login,
    logout,
    updateUser,
    
    // Helpers
    hasPermission,
    hasAnyPermission,
    hasRole
  }), [
    user, isAuthenticated, loading, error, auditLogs,
    login, logout, updateUser, // Now stable references
    hasPermission, hasAnyPermission, hasRole
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};