import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';

// ==========================================
// AUTH CONTEXT
// ==========================================

const AuthContext = createContext(null);

// Session duration configuration (in milliseconds)
const SESSION_CHECK_INTERVAL = 60000; // Check session every minute

/**
 * AuthProvider - Manages authentication state across the app
 * Handles:
 * - Session persistence across refreshes
 * - Automatic session restoration
 * - Token refresh
 * - Logout
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Initialize auth state from stored tokens
   * On app load, attempts to refresh the access token using HTTP-only cookie
   * This keeps users logged in for 21 days
   */
  const initializeAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if we have stored session data
      const hasStoredSession = api.hasSession();
      
      if (!hasStoredSession) {
        // No stored session, but try to refresh anyway (cookie might still be valid)
        try {
          const newToken = await api.refreshAccessToken();
          if (newToken) {
            // We have a valid refresh token cookie, get session info
            const { data } = await api.validateSession();
            if (data.valid) {
              setUser(data.user);
              setRole(data.role);
              setIsAuthenticated(true);
              // Store role/user for future checks
              localStorage.setItem('role', data.role);
              localStorage.setItem('user', JSON.stringify(data.user));
            }
          }
        } catch (err) {
          // No valid session
          setIsAuthenticated(false);
          setUser(null);
          setRole(null);
        }
        setIsLoading(false);
        return;
      }

      // Try to refresh access token using HTTP-only cookie
      try {
        await api.refreshAccessToken();
        
        // Token refreshed successfully, validate session
        const { data } = await api.validateSession();
        
        if (data.valid) {
          setUser(data.user);
          setRole(data.role);
          setIsAuthenticated(true);
        } else {
          // Session invalid, clear everything
          api.clearSession();
          setIsAuthenticated(false);
          setUser(null);
          setRole(null);
        }
      } catch (err) {
        // Refresh failed - either network error or 21 days expired
        // Use stored data as fallback for offline scenarios
        const storedUser = api.getStoredUser();
        const storedRole = api.getStoredRole();
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          // Session expired (21 days passed), clear everything
          api.clearSession();
          setIsAuthenticated(false);
          setUser(null);
          setRole(null);
        } else if (storedUser && storedRole) {
          // Network error - use cached data
          setUser(storedUser);
          setRole(storedRole);
          setIsAuthenticated(true);
        } else {
          api.clearSession();
          setIsAuthenticated(false);
        }
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
      setError(err.message);
      api.clearSession();
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Login handler
   */
  const login = useCallback(async (email, password, userRole = 'customer') => {
    setError(null);
    
    try {
      const { data } = await api.loginUser({ email, password, role: userRole });
      
      // Store session data (refresh token is now in HTTP-only cookie)
      api.setSession({
        accessToken: data.accessToken,
        expiresIn: data.expiresIn,
        role: data.role,
        user: data.user,
        isProfileComplete: data.user?.isProfileComplete,
      });
      
      setUser(data.user);
      setRole(data.role);
      setIsAuthenticated(true);
      
      return data;
    } catch (err) {
      const message = err.response?.data?.message || err.userMessage || 'Login failed';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * Signup and verify handler (after OTP verification)
   */
  const handleVerification = useCallback((data) => {
    // Store session data from verification response (refresh token in HTTP-only cookie)
    api.setSession({
      accessToken: data.accessToken,
      expiresIn: data.expiresIn,
      role: data.role,
      user: data.user,
      isProfileComplete: data.user?.isProfileComplete,
    });
    
    setUser(data.user);
    setRole(data.role);
    setIsAuthenticated(true);
  }, []);

  /**
   * Logout handler
   */
  const logout = useCallback(async () => {
    try {
      // Call logout API - server will clear HTTP-only cookie
      await api.logoutUser();
    } catch (err) {
      // Ignore errors - we'll clear local session anyway
      console.log('Logout API call failed:', err.message);
    } finally {
      // Always clear local session
      api.clearSession();
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
    }
  }, []);

  /**
   * Logout from all devices
   */
  const logoutAll = useCallback(async () => {
    try {
      await api.logoutAllDevices();
    } catch (err) {
      console.error('Logout all failed:', err);
      throw err;
    } finally {
      api.clearSession();
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
    }
  }, []);

  /**
   * Update user data in context
   */
  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      // Also update localStorage
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  /**
   * Refresh profile from server
   */
  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await api.fetchProfile();
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      if (data.isProfileComplete !== undefined) {
        localStorage.setItem('isProfileComplete', data.isProfileComplete.toString());
      }
      return data;
    } catch (err) {
      console.error('Failed to refresh profile:', err);
      throw err;
    }
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Periodic session check
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = () => {
      // Check if role is still present (basic session indicator)
      if (!api.hasSession()) {
        setIsAuthenticated(false);
        setUser(null);
        setRole(null);
      }
    };

    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Context value
  const value = {
    // State
    user,
    role,
    isLoading,
    isAuthenticated,
    error,
    
    // Actions
    login,
    logout,
    logoutAll,
    handleVerification,
    updateUser,
    refreshProfile,
    initializeAuth,
    
    // Utilities
    isCustomer: role === 'customer',
    isMerchant: role === 'merchant',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
