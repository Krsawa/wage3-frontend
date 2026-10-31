import { request, requestMessage } from "./client";
import type {
  AppStatus,
  AuthResponse,
  CreatePayoutInput,
  DateRangeQuery,
  ListDetail,
  ListSummary,
  Paginated,
  Payout,
  PayoutItemInput,
  RecipientInput,
  SentHistoryQuery,
  SentPayout,
  Stats,
  User,
} from "./types";

/** Drops empty strings/undefined so the backend never sees `?search=`. */
function params<T extends object>(q: T | undefined) {
  if (!q) return undefined;
  return Object.fromEntries(
    Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

export const authApi = {
  emailStart: (email: string) =>
    requestMessage({ method: "POST", url: "/auth/email/start", data: { email } }),
  emailVerify: (email: string, code: string) =>
    request<AuthResponse>({ method: "POST", url: "/auth/email/verify", data: { email, code } }),
  googleExchange: (ticket: string) =>
    request<AuthResponse>({ method: "POST", url: "/auth/google/exchange", data: { ticket } }),
  logout: (refresh_token: string) =>
    requestMessage({ method: "POST", url: "/auth/logout", data: { refresh_token } }),
  /** A full-page navigation, not XHR: the backend redirects to Google. */
  googleStartUrl: "/api/v1/auth/google",
};

export const usersApi = {
  me: () => request<User>({ url: "/users/me" }),
  stats: (q?: DateRangeQuery) => request<Stats>({ url: "/users/me/stats", params: params(q) }),
};

export const listsApi = {
  all: (search?: string) => request<ListSummary[]>({ url: "/lists", params: params({ search }) }),
  get: (id: string) => request<ListDetail>({ url: `/lists/${id}` }),
  create: (body: { name: string; recipients?: RecipientInput[] }) =>
    request<ListDetail>({ method: "POST", url: "/lists", data: body }),
  rename: (id: string, name: string) =>
    request<ListDetail>({ method: "PATCH", url: `/lists/${id}`, data: { name } }),
  remove: (id: string) => requestMessage({ method: "DELETE", url: `/lists/${id}` }),
  /** Appends to the end. Rejects a wallet already in the list. */
  addRecipients: (id: string, recipients: RecipientInput[]) =>
    request<ListDetail>({ method: "POST", url: `/lists/${id}/recipients`, data: { recipients } }),
  /** Full replace, order = order sent. Use for edits and deletes. */
  replaceRecipients: (id: string, recipients: RecipientInput[]) =>
    request<ListDetail>({ method: "PUT", url: `/lists/${id}/recipients`, data: { recipients } }),
};

export const payoutsApi = {
  create: (body: CreatePayoutInput) =>
    request<Payout>({ method: "POST", url: "/payouts", data: body }),
  get: (id: string) => request<Payout>({ url: `/payouts/${id}` }),
  rename: (id: string, name: string) =>
    request<Payout>({ method: "PATCH", url: `/payouts/${id}`, data: { name } }),
  /** Draft only. Full replace. */
  updateItems: (id: string, items: PayoutItemInput[]) =>
    request<Payout>({ method: "PUT", url: `/payouts/${id}/items`, data: { items } }),
  /** Locks the payout and splits it into batches of 200. Idempotent for the same wallet. */
  prepare: (id: string, sender_address: string) =>
    request<Payout>({ method: "POST", url: `/payouts/${id}/prepare`, data: { sender_address } }),
  saveAsList: (id: string, name: string) =>
    request<ListDetail>({ method: "POST", url: `/payouts/${id}/save-as-list`, data: { name } }),
  submitBatch: (id: string, batchId: string, tx_hash: string) =>
    request<Payout>({
      method: "POST",
      url: `/payouts/${id}/batches/${batchId}/submitted`,
      data: { tx_hash },
    }),
};

export const historyApi = {
  sent: (q?: SentHistoryQuery) =>
    request<Paginated<SentPayout>>({ url: "/history/sent", params: params(q) }),
};

export const statusApi = {
  get: () => request<AppStatus>({ url: "/status" }),
};
