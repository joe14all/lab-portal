/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// In a real app, we would use a service adapter. 
// For now, we import the JSON mock data directly to simulate the DB.
import usersData from '../_mock/data/auth/users.json';
import rolesData from '../_mock/data/auth/roles.json';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // --- 2. INITIALIZE: Check for existing session ---
  useEffect(() => {
    const initAuth = async () => {
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
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 800)); 

    try {
      // Find user (Simulate backend query)
      // In a real app, the backend would verify the hash.
      const foundUser = usersData.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!foundUser) {
         throw new Error("Invalid email or password");
      }
      
      // Note: In this mock, we accept any password if the email exists. 
      // In production, verify `password` against `foundUser.passwordHash`.

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
  };

  // --- 4. ACTION: Logout ---
  const logout = async () => {
    // Simulate API call to invalidate token
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (user) {
       console.log(`[Audit] Logout: User ${user.id} at ${new Date().toISOString()}`);
    }

    localStorage.removeItem('lab_user_id');
    setUser(null);
    setIsAuthenticated(false);
  };

  // --- 5. ACTION: Update Profile/Preferences ---
  // Allows changing theme, notifications, etc. without re-login
  const updateUser = async (updates) => {
    // Simulate API Update
    await new Promise(resolve => setTimeout(resolve, 500));

    setUser(prev => {
      if (!prev) return null;
      // Deep merge logic would go here for real apps.
      // For now, we perform a shallow merge.
      return { ...prev, ...updates };
    });
    
    // Note: In a real app, you might need to update the local storage or 
    // re-fetch the user to ensure sync with the server.
  };

  // --- 6. HELPER: Permission Checks ---
  
  /**
   * Checks if the current user has a specific permission.
   * Automatically returns true if user has 'ALL_ACCESS'.
   */
  const hasPermission = useCallback((permissionStr) => {
    if (!user) return false;
    if (user.permissions.includes('ALL_ACCESS')) return true;
    return user.permissions.includes(permissionStr);
  }, [user]);

  /**
   * Checks if the user has ANY of the provided permissions.
   * Useful for components accessible by multiple roles (e.g. "Managers OR Admins")
   */
  const hasAnyPermission = useCallback((permissionsArray) => {
    if (!user) return false;
    if (user.permissions.includes('ALL_ACCESS')) return true;
    return permissionsArray.some(p => user.permissions.includes(p));
  }, [user]);

  /**
   * Check if user belongs to a specific role (by ID)
   */
  const hasRole = useCallback((roleId) => {
    if (!user) return false;
    return user.roleId === roleId;
  }, [user]);


  // --- Expose Value ---
  const value = {
    // State
    user,
    isAuthenticated,
    loading,
    error,
    
    // Actions
    login,
    logout,
    updateUser,
    
    // Helpers
    hasPermission,
    hasAnyPermission,
    hasRole
  };

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