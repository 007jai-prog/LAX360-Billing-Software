import axios from 'axios';

const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let clean = envUrl.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api') && clean.startsWith('http')) {
      clean = `${clean}/api`;
    }
    return clean;
  }

  // When deployed to production (e.g. Vercel) and no env var was injected at build time,
  // automatically route API requests directly to the live Render backend
  if (typeof window !== 'undefined' && window.location.hostname && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'https://lax360-billing-software.onrender.com/api';
  }

  // Local development fallback — proxied by Vite dev server
  return '/api';
};

const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds to accommodate Render free tier cold starts
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to inject JWT bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lax360_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle session expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('lax360_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          const newAccess = res.data.access_token;
          localStorage.setItem('lax360_access_token', newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('lax360_access_token');
          localStorage.removeItem('lax360_refresh_token');
          localStorage.removeItem('lax360_user');
          localStorage.removeItem('lax360_tenant');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('lax360_access_token');
        localStorage.removeItem('lax360_user');
        localStorage.removeItem('lax360_tenant');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
