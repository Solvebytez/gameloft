import axios from 'axios';

// Get API base URL from environment variable or use default
// Note: baseURL should NOT include /v1 as routes already have it
// If env var includes /v1, we'll strip it to avoid double /v1/v1/
let envApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
// Remove trailing /v1 if present
if (envApiUrl.endsWith('/v1')) {
  envApiUrl = envApiUrl.replace('/v1', '');
}
const API_BASE_URL = envApiUrl;

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Important: This sends cookies automatically
});

// Request interceptor (optional - for adding auth tokens if needed)
api.interceptors.request.use(
  (config) => {
    // If data is FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    // You can add auth headers here if needed
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Check for authentication errors (401 or 500 with "Unauthenticated" message)
    const isUnauthenticated = 
      error.response?.status === 401 || 
      (error.response?.status === 500 && 
       (error.response?.data?.error === 'Unauthenticated.' || 
        error.response?.data?.message?.includes('Unauthenticated')));
    
    // Handle authentication errors
    if (isUnauthenticated && error.config && !error.config._retry) {
      error.config._retry = true;
      
      // Try to refresh token (works for both admin and superadmin)
      try {
        // Determine which refresh endpoint to use based on current path
        const currentPath = error.config.url || '';
        const refreshEndpoint = currentPath.includes('/superadmin') 
          ? '/v1/superadmin/refresh' 
          : '/v1/admin/refresh';
        
        await api.post(refreshEndpoint);
        
        // Preserve FormData if present
        if (error.config.data instanceof FormData) {
          // Ensure Content-Type is not set for FormData (let browser set it)
          delete error.config.headers['Content-Type'];
        }
        
        // Retry original request
        return api.request(error.config);
      } catch (refreshError) {
        // Refresh failed, redirect to appropriate login
        // Don't redirect if we're already on a login page - let the error be handled by the form
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          // Only redirect if we're NOT already on a login page (exact match)
          if (currentPath !== '/login' && currentPath !== '/superadmin-login') {
            if (currentPath.includes('/superadmin')) {
              window.location.href = '/superadmin-login';
            } else {
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

