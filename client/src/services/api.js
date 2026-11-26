import axios from "axios";
import { useAuthStore } from "../store/authStore.js";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (config.headers.Authorization) {
    return config;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
    // If not authenticated, attach X-Guest-Token if available for this room
    const match = config.url?.match(/\/rooms\/([a-z0-9]{10})/);
    if (match) {
      const roomId = match[1];
      try {
        const raw = sessionStorage.getItem(`collab_guest_${roomId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.guestToken) {
            config.headers["X-Guest-Token"] = parsed.guestToken;
          }
        }
      } catch {
        // ignore
      }
    }
  }
  return config;
});

let refreshPromise = null;

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token = res.data.token;
        useAuthStore.getState().setToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Silent refresh interceptor for expired in-memory access tokens.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const requestUrl = original?.url || "";
    const isAuthEndpoint = /\/auth\/(login|register|refresh|logout)(?:$|\?)/.test(requestUrl);
    if (err.response?.status !== 401 || original?._retried || isAuthEndpoint) {
      return Promise.reject(err);
    }
    original._retried = true;

    try {
      const newToken = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshErr) {
      useAuthStore.getState().logout();
      return Promise.reject(refreshErr);
    }
  }
);
