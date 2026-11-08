/* import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/";

console.log("API URL:", baseURL);

const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// IMPORTANT: DO NOT transform error
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);

interface ApiRequest {
  api: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export const apiRequest = async ({
  api,
  endpoint = "",
  method = "GET",
  token,
  body,
}: ApiRequest) => {
  const response = await axiosInstance({
    url: `/${api}${endpoint}`,
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    data: body,
  });

  return response.data;
};
 */

import axios from "axios";
import { supabase } from "../supabase";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/";

const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach authentication to every API request
axiosInstance.interceptors.request.use(
  async (config) => {
    // Playwright E2E tests use a mock token.
    // Playwright should intercept these API requests.
    if (import.meta.env.MODE === "e2e") {
      config.headers.Authorization = "Bearer bdd-test-token";

      console.log("E2E authentication enabled:", {
        url: config.url,
        authorizationAttached: true,
      });

      return config;
    }

    // Normal application uses the real Supabase session.
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Could not retrieve Supabase session:", error.message);
      return Promise.reject(error);
    }

    if (!session?.access_token) {
      console.error("No active Supabase session.");
      return Promise.reject(
        new Error("No active Supabase session. Please log in again."),
      );
    }

    config.headers.Authorization = `Bearer ${session.access_token}`;

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error.message);
    return Promise.reject(error);
  },
);

// Handle API responses and errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API error:", {
        status: error.response.status,
        message:
          error.response.data?.message ||
          error.response.data?.error ||
          error.message,
        url: error.config?.url,
      });
    } else if (error.request) {
      console.error("No API response received:", {
        message: error.message,
        url: error.config?.url,
      });
    } else {
      console.error("Request setup error:", error.message);
    }

    return Promise.reject(error);
  },
);

// API request configuration
interface ApiRequest {
  api: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

// Reusable API request function
export const apiRequest = async ({
  api,
  endpoint = "",
  method = "GET",
  token,
  body,
  headers,
}: ApiRequest) => {
  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  // Allow an explicitly supplied token outside E2E mode.
  // Otherwise, the interceptor attaches the current Supabase session.
  if (token && import.meta.env.MODE !== "e2e") {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await axiosInstance({
    url: `/${api}${endpoint}`,
    method,
    headers: requestHeaders,
    data: body,
  });

  return response.data;
};

export default axiosInstance;
