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
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use(async (config) => {
  if (!supabase) {
    return config;
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
