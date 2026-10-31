import type { BatchStatus, PayoutItemStatus, PayoutStatus } from "@/lib/api/types";

import { Badge, type BadgeTone } from "./badge";

const PAYOUT: Record<PayoutStatus, { label: string; tone: BadgeTone; pulse?: boolean }> = {
  draft: { label: "Draft", tone: "neutral" },
  ready: { label: "Ready to send", tone: "blue" },
  submitted: { label: "Sending", tone: "info", pulse: true },
  paid: { label: "Paid", tone: "success" },
  partially_paid: { label: "Partially paid", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const BATCH: Record<BatchStatus, { label: string; tone: BadgeTone; pulse?: boolean }> = {
  ready: { label: "Ready", tone: "neutral" },
  submitted: { label: "Confirming", tone: "info", pulse: true },
  confirmed: { label: "Confirmed", tone: "success" },
  dropped: { label: "Dropped", tone: "danger" },
};

const ITEM: Record<PayoutItemStatus, { label: string; tone: BadgeTone; pulse?: boolean }> = {
  pending: { label: "Pending", tone: "neutral" },
  sending: { label: "Sending", tone: "info", pulse: true },
  paid: { label: "Paid", tone: "success" },
  dropped: { label: "Dropped", tone: "danger" },
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const s = PAYOUT[status] ?? PAYOUT.draft;
  return <Badge tone={s.tone} dot pulse={s.pulse}>{s.label}</Badge>;
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const s = BATCH[status] ?? BATCH.ready;
  return <Badge tone={s.tone} dot pulse={s.pulse}>{s.label}</Badge>;
}

export function ItemStatusBadge({ status }: { status: PayoutItemStatus }) {
  const s = ITEM[status] ?? ITEM.pending;
  return <Badge tone={s.tone} dot pulse={s.pulse}>{s.label}</Badge>;
}
