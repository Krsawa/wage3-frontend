// Mirrors the Rust DTOs in wage3-backend/src/handlers/*/dto.rs.
// Amounts are always base-unit strings (1 USDC = "1000000"); never put them in a Number.

export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  message: string;
};

export type Pagination = {
  total_items: number;
  total_pages: number;
  current_page: number;
  limit: number;
  has_next_page: boolean;
  has_previous_page: boolean;
};

export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};

// ---- Auth ----

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  access_expires_at: number; // unix seconds
  refresh_expires_at: number;
};

export type User = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  user: User;
  tokens: AuthTokens;
};

// ---- Users ----

export type TokenTotal = {
  token_address: string;
  token_symbol: string | null;
  token_decimals: number | null;
  amount: string;
};

export type Stats = {
  total_sent: TokenTotal[];
  payouts_sent: number;
  wallets_paid: number;
  last_sent_at: string | null;
};

/** `YYYY-MM-DD`, UTC days. `to` includes its whole day. */
export type DateRangeQuery = {
  from?: string;
  to?: string;
};

// ---- Lists ----

export type ListSummary = {
  id: string;
  name: string;
  recipient_count: number;
  created_at: string;
  updated_at: string;
};

export type Recipient = {
  id: string;
  position: number;
  name: string | null;
  email: string | null;
  wallet_address: string;
  default_amount: string | null;
};

export type ListDetail = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  recipients: Recipient[];
};

export type RecipientInput = {
  name?: string | null;
  email?: string | null;
  wallet_address: string;
  default_amount?: string | null; // base units
};

// ---- Payouts ----

export type PayoutStatus =
  | "draft"
  | "ready"
  | "submitted"
  | "paid"
  | "partially_paid"
  | "cancelled";

export type BatchStatus = "ready" | "submitted" | "confirmed" | "dropped";

export type PayoutItemStatus = "pending" | "sending" | "paid" | "dropped";

export type PayoutItem = {
  id: string;
  batch_id: string | null;
  position: number;
  name: string | null;
  email: string | null;
  wallet_address: string;
  amount: string;
  status: PayoutItemStatus;
  tx_hash: string | null;
  paid_at: string | null;
};

export type PayoutBatch = {
  id: string;
  /** bytes16 for the contract: "0x" + 32 hex chars */
  ref: `0x${string}`;
  batch_index: number;
  total_amount: string;
  recipient_count: number;
  status: BatchStatus;
  tx_hash: string | null;
  block_number: number | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  /** Only while status is "ready": same order as amounts, ready for batchTransfer. */
  recipients: string[] | null;
  amounts: string[] | null;
};

export type Payout = {
  id: string;
  list_id: string | null;
  name: string;
  chain_id: number;
  token_address: string;
  token_symbol: string | null;
  token_decimals: number | null;
  sender_address: string | null;
  status: PayoutStatus;
  total_amount: string | null;
  recipient_count: number | null;
  batch_count: number;
  confirmed_batch_count: number;
  prepared_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  items: PayoutItem[];
  batches: PayoutBatch[];
};

export type PayoutItemInput = {
  name?: string | null;
  email?: string | null;
  wallet_address: string;
  amount: string; // base units
};

export type CreatePayoutInput = {
  name?: string | null;
  list_id?: string | null;
  chain_id: number;
  token_address: string;
  items: PayoutItemInput[];
};

// ---- History ----

export type SentStatus = "submitted" | "paid" | "partially_paid";

export type SentPayout = {
  id: string;
  list_id: string | null;
  name: string;
  chain_id: number;
  token_address: string;
  token_symbol: string | null;
  token_decimals: number | null;
  sender_address: string | null;
  status: SentStatus;
  total_amount: string | null;
  recipient_count: number | null;
  batch_count: number;
  confirmed_batch_count: number;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export type SentHistoryQuery = DateRangeQuery & {
  status?: SentStatus;
  list_id?: string;
  search?: string;
  page?: number;
  limit?: number;
};

// ---- Status ----

export type AppStatus = {
  payments: {
    enabled: boolean;
    message: string | null;
  };
};
