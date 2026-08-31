import axios from "axios";

const baseURL = "http://localhost:5000/api/";

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
