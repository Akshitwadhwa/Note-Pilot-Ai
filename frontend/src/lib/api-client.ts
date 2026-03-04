import axios from "axios";

import { supabase } from "./supabase";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const useDevProxy =
  import.meta.env.DEV &&
  (!configuredApiBaseUrl ||
    configuredApiBaseUrl.includes("localhost") ||
    configuredApiBaseUrl.includes("127.0.0.1"));
const apiBaseUrl = useDevProxy ? "/api" : configuredApiBaseUrl || "/api";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use(async (config) => {
  if (!supabase) {
    return config;
  }

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Supabase is unreachable (paused project, network issue, etc.)
    // Continue without auth header — the backend will return 401 if needed.
    console.warn("[api-client] Could not reach Supabase for auth token.");
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Provide friendlier error messages for common failures
    if (axios.isAxiosError(error)) {
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        error.message = "Cannot connect to server. Please check your connection.";
      } else if (error.code === "ECONNABORTED" || error.message?.includes("aborted")) {
        error.message = "Request timed out. Please try again.";
      }
    }
    return Promise.reject(error);
  }
);
