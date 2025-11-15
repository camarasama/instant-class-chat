// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Only check auth once on mount
    if (!authChecked) {
      checkAuth();
    }
  }, [authChecked]);

  const checkAuth = async () => {
    try {
      console.log('🔄 Checking authentication...');
      const response = await authAPI.getMe();
      setUser(response.data.user);
      console.log('✅ User authenticated:', response.data.user.email);
    } catch (error) {
      console.log('🔐 No active session or token expired');
      setUser(null);
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  };

  const login = async (credentials) => {
    try {
      setError('');
      console.log('🔄 Attempting login with:', { email: credentials.email });
      
      const response = await authAPI.login(credentials);
      console.log('✅ Login successful:', response.data);
      
      setUser(response.data.user);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      console.error('❌ Login failed:', message);
      
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      setError('');
      const response = await authAPI.register(userData);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const verifyOTP = async (email, otpCode) => {
    try {
      setError('');
      const response = await authAPI.verifyOTP(email, otpCode);
      setUser(response.data.user);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'OTP verification failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const resendOTP = async (email) => {
    try {
      setError('');
      const response = await authAPI.resendOTP(email);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend OTP';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setError('');
      setAuthChecked(false);
    }
  };

  const clearError = () => setError('');

  const value = {
    user,
    loading,
    error,
    login,
    register,
    verifyOTP,
    resendOTP,
    logout,
    clearError,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;