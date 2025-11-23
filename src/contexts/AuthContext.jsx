/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { MockService } from '../_mock/service'; // Use the Service Adapter

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeLab, setActiveLab] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]); 

  // --- 1. HELPER: Hydrate User with Contextual Permissions ---
  // Now async because it fetches fresh data from the Service
  const hydrateUser = useCallback(async (rawUser, targetLabId = null) => {
    setLoading(true);
    try {
      // A. Determine Active Membership
      let activeMembership;
      if (targetLabId) {
        activeMembership = rawUser.memberships.find(m => m.labId === targetLabId);
      } else {
        activeMembership = rawUser.memberships.find(m => m.isDefault) || rawUser.memberships[0];
      }

      if (!activeMembership) {
        throw new Error("Access denied: No active lab membership found.");
      }

      // B. Fetch Contextual Data (Parallel for performance)
      // We fetch the specific Role and Lab, plus all lists to map friendly names for the switcher
      const [role, lab, allLabs, allRoles] = await Promise.all([
        MockService.auth.roles.getById(activeMembership.roleId),
        MockService.org.labs.getById(activeMembership.labId),
        MockService.org.labs.getAll(),
        MockService.auth.roles.getAll()
      ]);

      if (!role || !lab) throw new Error("Invalid membership configuration (Role or Lab missing).");

      const permissions = role.permissions || [];

      // C. Flatten User Object for the Session
      const fullUser = {
        ...rawUser,
        // Active Context
        labId: activeMembership.labId,
        roleId: activeMembership.roleId,
        clinicId: activeMembership.clinicId,
        roleName: role.name,
        permissions: permissions,
        isAdmin: permissions.includes('ALL_ACCESS'),
        
        // Available Contexts (for UI Switcher)
        availableLabs: rawUser.memberships.map(m => {
          const l = allLabs.find(x => x.id === m.labId);
          const r = allRoles.find(x => x.id === m.roleId);
          return {
            labId: m.labId,
            labName: l ? l.name : m.labId,
            roleName: r ? r.name : m.roleId
          };
        })
      };

      setUser(fullUser);
      setActiveLab(lab);
      setIsAuthenticated(true);
      setError(null);
    } catch (err) {
      console.error("Hydration Failed:", err);
      setError(err.message);
      // Safety fallback: Logout if hydration fails completely
      if (!user) {
        localStorage.removeItem('lab_user_id');
        localStorage.removeItem('lab_active_id');
      }
    } finally {
      setLoading(false);
    }
  }, []); // removed 'user' dependency to avoid loops, rely on rawUser arg

  // --- 2. INITIALIZE ---
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      // Small delay to let Service initialize if needed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        const storedUserId = localStorage.getItem('lab_user_id');
        const storedLabId = localStorage.getItem('lab_active_id');

        if (storedUserId) {
          // Fetch fresh user data from DB
          const foundUser = await MockService.auth.users.getById(storedUserId);
          if (foundUser) {
            await hydrateUser(foundUser, storedLabId);
          } else {
            localStorage.removeItem('lab_user_id');
            localStorage.removeItem('lab_active_id');
          }
        }
        
        // Load logs (Optional: Filter by user privileges in real app)
        const logs = await MockService.auth.logs.getAll();
        setAuditLogs(logs);

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
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      // Delegate to Service (Simulates network req + password check)
      const foundUser = await MockService.auth.login(email, password);
      
      // Persist
      localStorage.setItem('lab_user_id', foundUser.id);
      
      // Hydrate Context
      await hydrateUser(foundUser);
      
      return { success: true };

    } catch (err) {
      setLoading(false);
      setError(err.message);
      return { success: false, message: err.message };
    }
  }, [hydrateUser]);

  // --- 4. ACTION: Logout ---
  const logout = useCallback(async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    localStorage.removeItem('lab_user_id');
    localStorage.removeItem('lab_active_id');
    setUser(null);
    setActiveLab(null);
    setIsAuthenticated(false);
    setLoading(false);
  }, []);

  // --- 5. ACTION: Switch Lab ---
  const switchLab = useCallback(async (newLabId) => {
    if (!user) return;
    
    // We need to fetch the raw user again or use the current 'user' (which has memberships)
    // It's safer to re-fetch to ensure memberships are up to date
    const freshUser = await MockService.auth.users.getById(user.id);
    
    if (freshUser) {
      await hydrateUser(freshUser, newLabId);
      localStorage.setItem('lab_active_id', newLabId);
    }
  }, [user, hydrateUser]);

  // --- 6. ACTION: Update Profile ---
  const updateUser = useCallback(async (updates) => {
    if (!user) return;
    try {
      // Update DB
      const updatedUser = await MockService.auth.users.update(user.id, updates);
      // Update Local State (Optimistic or via re-hydration)
      // We can just merge for speed, but re-hydration is safer for permissions changes
      // For profile updates (name, phone), merging is fine.
      setUser(prev => ({ ...prev, ...updates }));
    } catch (err) {
      console.error("Update failed", err);
      throw err;
    }
  }, [user]);

  // --- Permission Helpers ---
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

  const value = useMemo(() => ({
    user,
    activeLab,
    isAuthenticated,
    loading,
    error,
    auditLogs, 
    
    login,
    logout,
    switchLab,
    updateUser,
    
    hasPermission,
    hasAnyPermission,
    hasRole
  }), [
    user, activeLab, isAuthenticated, loading, error, auditLogs,
    login, logout, switchLab, updateUser,
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