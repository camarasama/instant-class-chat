// src/services/api.js
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Create axios instance with better error handling
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - REMOVE the auto-redirect on 401
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Don't auto-redirect on 401 - let components handle it
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  verifyOTP: (email, otpCode) => api.post('/auth/verify-otp', { email, otpCode }),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  resendOTP: (email) => api.post('/auth/resend-otp', { email }),
};

export const channelAPI = {
  getAll: () => api.get('/channels'),
  getAvailable: () => api.get('/channels/available'),
  getById: (id) => api.get(`/channels/${id}`),
  create: (channelData) => api.post('/channels', channelData),
  join: (id) => api.post(`/channels/${id}/join`),
  leave: (id) => api.post(`/channels/${id}/leave`),
};

export default api;