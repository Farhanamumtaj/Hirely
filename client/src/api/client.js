import axios from "axios";
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});
let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/login") &&
      !original.url?.includes("/auth/register") &&
      !original.url?.includes("/auth/refresh") &&
      !original.url?.includes("/auth/google")
    ) {
      original._retry = true;
      try {
        refreshing ||= api.post("/auth/refresh").finally(() => {
          refreshing = null;
        });
        await refreshing;
        return api(original);
      } catch {
        if (
          !window.location.pathname.startsWith("/login") &&
          !window.location.pathname.startsWith("/register")
        )
          window.dispatchEvent(new Event("hirely:session-expired"));
      }
    }
    return Promise.reject(error);
  },
);
export default api;
