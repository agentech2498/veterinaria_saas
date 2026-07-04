import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Adjust baseURL based on environment. Capacitor uses localhost but through native bridging or explicit IP.
// For dev, Vite runs on 5173, FastAPI on 8000.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      // Navigate to login without a hard reload, keeping React's component tree alive
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    return Promise.reject(error);
  }
);
