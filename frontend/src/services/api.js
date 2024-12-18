import axios from 'axios';

// API Configuration
const DEFAULT_TIMEOUT = 10000;
const API_CONFIG = {
  baseURL: (process.env.REACT_APP_API_URL) + '/api',
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
};

// Create axios instance
const api = axios.create(API_CONFIG);

// Request Interceptor
api.interceptors.request.use(
  config => {
    
    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    if (!token || (tokenExpiry && new Date(tokenExpiry) < new Date())) {
  // Redirect to login or refresh token
}
    if (token) {

      config.headers.Authorization = `Bearer ${token}`;

      config.headers = {
        'Authorization': `Bearer ${token}`,
        // Add these headers to ensure proper CORS handling
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...config.headers,
      };

    }

    // Log complete request details
    console.log('Request Details:', {
      url: `${config.baseURL}${config.url}`,
      method: config.method,
      headers: config.headers,
    });

    return config;
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.error('Auth error details:', {
        config: error.config,
        headers: error.config?.headers,
        token: !!localStorage.getItem('token')
      });
    }
    return Promise.reject(error);
  },
  (error) => {
    // Enhanced error logging with more details
    const errorDetails = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      requestData: error.config?.data
    };

    console.error('API Error Details:', errorDetails);

    // Handle different error scenarios
    if (error.code === 'ERR_NETWORK') {
      console.error('Network Error - Server may be unreachable');
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }

    if (error.code === 'ECONNABORTED') {
      console.error('Request Timeout');
      throw new Error('Request timed out. Please try again.');
    }

    if (error.response) {
      // Handle different HTTP error status codes
      switch (error.response.status) {
        case 400:
          console.error('Bad Request:', error.response.data);
          throw new Error(error.response.data.message || 'Please check your input and try again');
        
        case 401:
          console.error('Authentication Error:', {
            url: error.config.url,
            method: error.config.method,
            responseData: error.response.data
          });
          
          // Only clear auth data and redirect if not on auth pages
          if (!window.location.pathname.match(/\/(login|register)/)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
          
          throw new Error(
            error.response.data?.error || 
            'Invalid credentials. Please check your email and password.'
          );
        
        case 403:
          console.error('Forbidden Access:', error.response.data);
          throw new Error('You do not have permission to perform this action');
        
        case 404:
          console.error('Resource Not Found:', {
            url: error.config.url,
            method: error.config.method
          });
          throw new Error('The requested resource could not be found');
        
        case 409:
          console.error('Conflict Error:', error.response.data);
          throw new Error(error.response.data.message || 'This operation conflicts with existing data');
        
        case 422:
          console.error('Validation Error:', error.response.data);
          throw new Error(error.response.data.message || 'The provided data is invalid');
        
        case 429:
          console.error('Rate Limit Exceeded:', error.response.data);
          throw new Error('Too many requests. Please wait a moment and try again');
        
        case 500:
          console.error('Server Error:', error.response.data);
          throw new Error('An unexpected server error occurred. Please try again later');
        
        default:
          console.error('Unhandled Error Status:', error.response.status);
          throw new Error('An unexpected error occurred. Please try again');
      }
    }

    return Promise.reject(error);
  }
);

// Enhanced API helper methods
const apiHelpers = {
  // Retry a failed request with exponential backoff
  retryRequest: async (fn, retries = 3, delay = 1000) => {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;
      console.log(`Retrying request. Attempts remaining: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiHelpers.retryRequest(fn, retries - 1, delay * 2);
    }
  },

  // Enhanced health check
  checkHealth: async () => {
    try {
      const response = await api.get('/health');
      console.log('API Health Status:', response.data);
      return response.data;
    } catch (error) {
      console.error('Health Check Failed:', {
        status: error.response?.status,
        error: error.message
      });
      throw error;
    }
  },

  // Verify authentication status
  verifyAuth: async () => {
    try {
      const response = await api.get('/auth/verify');
      return response.data;
    } catch (error) {
      console.error('Auth Verification Failed:', error);
      throw error;
    }
  },

  // Clear authentication data
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
  }
};

// Export both the api instance and helpers
export { api as default, apiHelpers };