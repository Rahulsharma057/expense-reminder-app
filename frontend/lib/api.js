
import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// =========================================================
// REQUEST INTERCEPTOR
// =========================================================
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =========================================================
// RESPONSE INTERCEPTOR
// =========================================================
api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (typeof window !== "undefined") {
      const status = error?.response?.status;

      // Unauthorized
      if (status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        const currentPath = window.location.pathname;

        if (!currentPath.startsWith("/login")) {
          window.location.replace("/login");
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

