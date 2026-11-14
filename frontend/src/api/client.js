import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
          const res = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
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
