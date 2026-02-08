import axios from "axios";

import { supabase } from "./supabase";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api",
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
