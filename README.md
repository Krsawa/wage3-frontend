# Wage3 frontend

Next.js app for the Wage3 Rust API: send USDC to up to 1,000 wallets on Base in a few signatures.

## Run

```bash
cp .env.example .env.local   # match CHAIN_ID / BATCHER_ADDRESS / TOKEN_ADDRESS to the backend
pnpm install
pnpm dev                     # http://localhost:3000 (the backend's FRONTEND_URL)
```

The backend must be running on `BACKEND_URL` (default `http://localhost:8080`). The browser never calls it directly: `next.config.ts` rewrites `/api/*` to it, because the backend has no CORS layer.

`BACKEND_URL` is read when the app is built, so set it in your host's environment (e.g. Vercel) before deploying. On the backend, `FRONTEND_URL` must be this app's URL, because Google sign-in redirects there.

`test-data/` has sample CSVs for the import flow. Their wallets are random throwaway addresses: use them on testnet only.

In dev the email sign-in code is printed in the backend logs (`login code for …`).

## Stack

- **React Query** for every API call: `src/lib/api/queries.ts` holds the hooks and query keys.
- **axios**: `src/lib/api/client.ts` attaches the bearer token and handles refresh. Refreshes run one at a time across tabs (Web Locks) because the backend revokes every session when a refresh token is reused.
- **Jotai** for the session (`src/lib/auth/session.ts`, persisted and synced across tabs) and in-flight send progress (`src/lib/send-payout.ts`).
- **Motion** (Framer Motion) for transitions. The rules come from the Emil Kowalski skills in `.claude/skills`.
- **wagmi + viem** for wallets: Base Account plus injected wallets (EIP-6963).
- **Agentation**: dev-only annotation toolbar (bottom right). Set `NEXT_PUBLIC_AGENTATION_ENDPOINT` to sync with `npx agentation-mcp server`.

## How a payment is sent

1. `POST /payouts` creates a draft. `PUT /payouts/:id/items` edits it.
2. `POST /payouts/:id/prepare` with the sender wallet locks it into batches of 200, each with a `ref`.
3. The app approves exactly the USDC still to send to `PayBatcher`, then calls `batchTransfer(ref, token, recipients, amounts)` once per batch.
4. Each tx hash goes to `POST /payouts/:id/batches/:batchId/submitted` straight away. The backend indexer confirms it, and the page polls until the batch shows `paid`.

Each send skips a batch whose `ref` the contract already marks as used, so resuming after a closed tab never pays anyone twice.

## Routes

| Route | |
| --- | --- |
| `/` | Landing |
| `/sign-in`, `/auth/callback` | Email code and Google sign-in |
| `/dashboard` | Stats, recent payments, lists |
| `/lists`, `/lists/[id]` | Saved recipient lists (CSV import, bulk amounts) |
| `/pay/new?list=…` / `?from=…` | Compose a payment from scratch, from a list, or as a repeat |
| `/pay/[id]` | Draft editing, sending, live confirmation, receipt |
| `/history` | Sent payments with filters and pagination |
