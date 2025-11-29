/**
 * Cognito Authentication Utilities
 *
 * Implements JWT token management and permission checking (Section 5.1.5)
 *
 * Features:
 * - JWT token parsing and validation
 * - Permission checking
 * - Token refresh
 * - Custom attribute extraction
 */

/**
 * Decode JWT token (without verification - server verifies)
 */
export function decodeToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    const payload = parts[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );

    return decoded;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Get user info from token
 */
export function getUserFromToken(token) {
  const decoded = decodeToken(token);
  if (!decoded) {
    return null;
  }

  return {
    userId: decoded.sub,
    email: decoded.email,
    labId: decoded["custom:labId"],
    roleId: decoded["custom:roleId"],
    driverLicense: decoded["custom:driverLicense"],
    vehicleId: decoded["custom:vehicleId"],
    exp: decoded.exp,
  };
}

/**
 * Get permissions from token
 */
export function getPermissionsFromToken(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.permissions) {
    return [];
  }

  return Array.isArray(decoded.permissions)
    ? decoded.permissions
    : JSON.parse(decoded.permissions || "[]");
}

/**
 * Check if user has specific permission
 */
export function hasPermission(token, permission) {
  const permissions = getPermissionsFromToken(token);

  // Check for wildcard permission
  if (permissions.includes("ALL_ACCESS")) {
    return true;
  }

  // Check for specific permission
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(token, permissionList) {
  return permissionList.some((permission) => hasPermission(token, permission));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(token, permissionList) {
  return permissionList.every((permission) => hasPermission(token, permission));
}

/**
 * Logistics-specific permission checks
 */
export const LogisticsPermissions = {
  MANAGE: "LOGISTICS_MANAGE", // Create/edit routes, assign drivers
  EXECUTE: "LOGISTICS_EXECUTE", // Update stop status, upload proof
  VIEW: "LOGISTICS_VIEW", // View routes and manifests
  ADMIN: "LOGISTICS_ADMIN", // All logistics operations
};

/**
 * Check if user can manage logistics
 */
export function canManageLogistics(token) {
  return hasAnyPermission(token, [
    LogisticsPermissions.MANAGE,
    LogisticsPermissions.ADMIN,
  ]);
}

/**
 * Check if user can execute deliveries
 */
export function canExecuteDeliveries(token) {
  return hasAnyPermission(token, [
    LogisticsPermissions.EXECUTE,
    LogisticsPermissions.ADMIN,
  ]);
}

/**
 * Check if user can view logistics data
 */
export function canViewLogistics(token) {
  return hasAnyPermission(token, [
    LogisticsPermissions.VIEW,
    LogisticsPermissions.MANAGE,
    LogisticsPermissions.EXECUTE,
    LogisticsPermissions.ADMIN,
  ]);
}

/**
 * Token storage helpers
 */
export const TokenStorage = {
  /**
   * Save token to localStorage
   */
  save(token) {
    localStorage.setItem("authToken", token);
  },

  /**
   * Get token from localStorage
   */
  get() {
    return localStorage.getItem("authToken");
  },

  /**
   * Remove token from localStorage
   */
  remove() {
    localStorage.removeItem("authToken");
  },

  /**
   * Check if token exists and is valid
   */
  isValid() {
    const token = this.get();
    return token && !isTokenExpired(token);
  },
};

/**
 * Refresh token (requires API endpoint)
 */
export async function refreshToken(refreshToken) {
  const COGNITO_URL =
    import.meta.env.VITE_COGNITO_URL ||
    "https://cognito.us-east-1.amazonaws.com";
  const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;

  try {
    const response = await fetch(`${COGNITO_URL}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      idToken: data.id_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error("Token refresh error:", error);
    throw error;
  }
}

/**
 * Auto-refresh token before expiry
 */
export function setupAutoRefresh(onTokenRefreshed) {
  const token = TokenStorage.get();
  if (!token) {
    return null;
  }

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  // Refresh 5 minutes before expiry
  const expiresAt = decoded.exp * 1000;
  const refreshAt = expiresAt - 5 * 60 * 1000;
  const delay = refreshAt - Date.now();

  if (delay < 0) {
    // Token already expired or about to expire
    return null;
  }

  const timerId = setTimeout(async () => {
    try {
      const refreshTokenValue = localStorage.getItem("refreshToken");
      if (!refreshTokenValue) {
        console.warn("No refresh token available");
        return;
      }

      const tokens = await refreshToken(refreshTokenValue);
      TokenStorage.save(tokens.idToken);

      if (onTokenRefreshed) {
        onTokenRefreshed(tokens.idToken);
      }

      // Setup next refresh
      setupAutoRefresh(onTokenRefreshed);
    } catch (error) {
      console.error("Auto-refresh failed:", error);
    }
  }, delay);

  return () => clearTimeout(timerId);
}

/**
 * Authorization header helper
 */
export function getAuthHeader() {
  const token = TokenStorage.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Extract lab context from token
 */
export function getLabContext(token) {
  const user = getUserFromToken(token);
  if (!user) {
    return null;
  }

  return {
    labId: user.labId,
    userId: user.userId,
    roleId: user.roleId,
  };
}

/**
 * Check if user is a driver
 */
export function isDriver(token) {
  const user = getUserFromToken(token);
  return !!(user && user.driverLicense && user.vehicleId);
}

/**
 * Get driver info from token
 */
export function getDriverInfo(token) {
  const user = getUserFromToken(token);
  if (!user || !user.driverLicense) {
    return null;
  }

  return {
    driverId: user.userId,
    licenseNumber: user.driverLicense,
    vehicleId: user.vehicleId,
  };
}

/**
 * Validate token structure (basic checks)
 */
export function validateTokenStructure(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Invalid token format" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Token must have 3 parts" };
  }

  const decoded = decodeToken(token);
  if (!decoded) {
    return { valid: false, error: "Failed to decode token" };
  }

  if (!decoded.sub) {
    return { valid: false, error: "Token missing subject (sub)" };
  }

  if (!decoded.exp) {
    return { valid: false, error: "Token missing expiration (exp)" };
  }

  if (isTokenExpired(token)) {
    return { valid: false, error: "Token expired" };
  }

  return { valid: true };
}

/**
 * Get time until token expires (in seconds)
 */
export function getTokenTimeToExpiry(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return 0;
  }

  const now = Math.floor(Date.now() / 1000);
  const timeLeft = decoded.exp - now;

  return Math.max(0, timeLeft);
}

/**
 * Format time to expiry in human-readable format
 */
export function formatTimeToExpiry(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  } else {
    return `${Math.floor(seconds / 3600)}h ${Math.floor(
      (seconds % 3600) / 60
    )}m`;
  }
}

// Export all utilities
export default {
  decodeToken,
  isTokenExpired,
  getUserFromToken,
  getPermissionsFromToken,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  LogisticsPermissions,
  canManageLogistics,
  canExecuteDeliveries,
  canViewLogistics,
  TokenStorage,
  refreshToken,
  setupAutoRefresh,
  getAuthHeader,
  getLabContext,
  isDriver,
  getDriverInfo,
  validateTokenStructure,
  getTokenTimeToExpiry,
  formatTimeToExpiry,
};
