import axios from 'axios';
import useAuthStore from '../store/authStore';

// Create an Axios instance with our backend's base URL
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// ───────────────────────────────────────────────
// REQUEST INTERCEPTOR
// Runs BEFORE every request — auto-attaches JWT.
// ───────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ───────────────────────────────────────────────
// RESPONSE INTERCEPTOR
// Runs AFTER every response — handles 401 logout.
// ───────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server returns 401 (token expired/invalid), log out
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      // Optional: redirect to login page (we'll handle this with routing later)
    }
    return Promise.reject(error);
  }
);

export default api;
