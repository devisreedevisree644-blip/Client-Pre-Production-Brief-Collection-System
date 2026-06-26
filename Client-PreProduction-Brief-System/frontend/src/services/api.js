import axios from 'axios';

const isProduction = import.meta.env.PROD;
const defaultBaseURL = isProduction ? '/api' : 'http://localhost:5000/api';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseURL,
  timeout: 10000,
});

// Request Interceptor: Attach JWT token if stored
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch 401 unauthorized to clear session
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request detected, signing out...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if window is available
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
