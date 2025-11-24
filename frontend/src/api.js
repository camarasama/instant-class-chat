// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to handle errors
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Call: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  // Register with school validation
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        success: false, 
        message: 'Network error during registration' 
      };
    }
  },

  // Login with email OR index number
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        success: false, 
        message: 'Network error during login' 
      };
    }
  },

  // Verify OTP
  verifyOTP: async (otpData) => {
    try {
      const response = await api.post('/auth/verify-otp', otpData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        success: false, 
        message: 'Network error during OTP verification' 
      };
    }
  },

  // Resend OTP
  resendOTP: async (email) => {
    try {
      const response = await api.post('/auth/resend-otp', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        success: false, 
        message: 'Network error during OTP resend' 
      };
    }
  },

  // Logout
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        success: false, 
        message: 'Network error during logout' 
      };
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        success: false, 
        message: 'Network error fetching user data' 
      };
    }
  },

  // Check school registry (for debugging)
  checkSchoolRegistry: async (email, indexNumber) => {
    try {
      const response = await api.post('/auth/check-school-registry', { 
        email, 
        indexNumber 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { 
        success: false, 
        message: 'Network error checking school registry' 
      };
    }
  }
};

export default api;