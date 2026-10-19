import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const UNAUTHORIZED_EVENT = "flowpilot:unauthorized";

type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
  data?: { error?: string | null };
};

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function firstValidationMessage(errors?: Record<string, string[]>): string | null {
  if (!errors) return null;

  for (const messages of Object.values(errors)) {
    if (messages?.[0]) return messages[0];
  }

  return null;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const status = error.response?.status;
    const payload = error.response?.data;

    if (status === 401) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    const detail =
      payload?.data && typeof payload.data === "object"
        ? payload.data.error
        : null;

    const message =
      (status === 401
        ? "Sesi login berakhir. Silakan masuk kembali."
        : null) ||
      firstValidationMessage(payload?.errors) ||
      (typeof detail === "string" && detail.trim() ? detail : null) ||
      payload?.message ||
      error.message ||
      "Terjadi kesalahan saat menghubungi server.";

    return Promise.reject(new ApiError(message, status));
  },
);

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default api;
