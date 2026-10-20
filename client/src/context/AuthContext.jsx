import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('docai_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('docai_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Get default route for role
  const getRoleDashboardRoute = useCallback((role) => {
    switch (role) {
      case 'student':
        return '/student';
      case 'faculty':
        return '/faculty';
      case 'hod':
        return '/hod';
      case 'admin':
        return '/admin';
      case 'principal':
        return '/principal';
      default:
        return '/login';
    }
  }, []);

  // Fetch current user details on boot
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('docai_token');
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success && res.data.user) {
          setUser(res.data.user);
          localStorage.setItem('docai_user', JSON.stringify(res.data.user));
        } else {
          logout();
        }
      } catch (err) {
        console.error('Failed to verify token:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (identifier, password) => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/login', { identifier, password });
      if (res.data.success) {
        const { token: newToken, user: newUser } = res.data;
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('docai_token', newToken);
        localStorage.setItem('docai_user', JSON.stringify(newUser));
        return { success: true, user: newUser, redirectPath: getRoleDashboardRoute(newUser.role) };
      }
      throw new Error(res.data.message || 'Login failed');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to authenticate';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const register = async (userData) => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/register', userData);
      if (res.data.success) {
        const { token: newToken, user: newUser } = res.data;
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('docai_token', newToken);
        localStorage.setItem('docai_user', JSON.stringify(newUser));
        return { success: true, user: newUser, redirectPath: getRoleDashboardRoute(newUser.role) };
      }
      throw new Error(res.data.message || 'Registration failed');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create account';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('docai_token');
    localStorage.removeItem('docai_user');
    setToken(null);
    setUser(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        login,
        register,
        logout,
        getRoleDashboardRoute,
        isAuthenticated: !!user && !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
