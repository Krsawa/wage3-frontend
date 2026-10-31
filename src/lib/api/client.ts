import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

import { sessionStore } from "@/lib/auth/session";

import type { ApiEnvelope, AuthTokens } from "./types";

/** Every non-2xx from the backend is `{ success: false, message }`; this keeps the status too. */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isConflict() {
    return this.status === 409;
  }
  get isPaused() {
    return this.status === 503;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as Partial<ApiEnvelope<unknown>> | undefined;
    if (!error.response) {
      return new ApiError("Can't reach Wage3 right now. Check your connection and try again.", 0);
    }
    const status = error.response.status;
    const message =
      typeof body?.message === "string" && body.message
        ? body.message
        : status >= 500
          ? "Something went wrong on our side. Please try again."
          : "Request failed";
    return new ApiError(message, status);
  }
  return new ApiError(error instanceof Error ? error.message : "Something went wrong", -1);
}

export const http = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

// Endpoints that take a refresh token or none: never attach or retry with a bearer.
const PUBLIC_PATHS = ["/auth/", "/status"];
const isPublic = (url = "") => PUBLIC_PATHS.some((p) => url.startsWith(p));

/** Refresh a little early so a request never leaves with a token about to expire. */
const EXPIRY_SKEW_SECONDS = 30;

let refreshing: Promise<string | null> | null = null;

async function rotateTokens(): Promise<string | null> {
  const run = async () => {
    const before = sessionStore.get();
    // Another tab may have rotated while we waited for the lock.
    const persisted = sessionStore.readPersisted();
    if (
      persisted &&
      before &&
      persisted.tokens.refresh_token !== before.tokens.refresh_token &&
      persisted.tokens.access_expires_at > Date.now() / 1000 + EXPIRY_SKEW_SECONDS
    ) {
      sessionStore.set(persisted);
      return persisted.tokens.access_token;
    }

    const session = persisted ?? before;
    if (!session) return null;

    try {
      // Plain axios: this request must not go through our own interceptors.
      const res = await axios.post<ApiEnvelope<AuthTokens>>("/api/v1/auth/refresh", {
        refresh_token: session.tokens.refresh_token,
      });
      const tokens = res.data.data;
      if (!tokens) throw new Error("No tokens");
      sessionStore.setTokens(tokens);
      return tokens.access_token;
    } catch (e) {
      // 401 = the refresh token is dead (expired, revoked or reused). Network errors keep the session.
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        sessionStore.set(null);
      }
      return null;
    }
  };

  // Refresh tokens rotate and a reused one revokes every session, so only one
  // refresh may run at a time, across tabs too.
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("wage3.refresh", run);
  }
  return run();
}

export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= rotateTokens().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

http.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (isPublic(config.url)) return config;

  const session = sessionStore.get();
  if (!session) return config;

  let token: string | null = session.tokens.access_token;
  if (session.tokens.access_expires_at < Date.now() / 1000 + EXPIRY_SKEW_SECONDS) {
    token = (await refreshAccessToken()) ?? token;
  }
  config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    if (
      error.response?.status === 401 &&
      config &&
      !config._retried &&
      !isPublic(config.url) &&
      sessionStore.get()
    ) {
      config._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
        return http(config);
      }
    }
    throw toApiError(error);
  },
);

/** Unwraps the `{ success, data, message }` envelope. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await http.request<ApiEnvelope<T>>(config);
  return res.data.data as T;
}

/** For endpoints whose useful output is the message (e.g. "OTP sent to your email"). */
export async function requestMessage(config: AxiosRequestConfig): Promise<string> {
  const res = await http.request<ApiEnvelope<unknown>>(config);
  return res.data.message;
}
