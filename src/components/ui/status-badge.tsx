import type { BatchStatus, PayoutItemStatus, PayoutStatus } from "@/lib/api/types";

import { Badge, type BadgeTone } from "./badge";

const PAYOUT: Record<PayoutStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  ready: { label: "Ready to send", tone: "blue" },
  submitted: { label: "Sending", tone: "info" },
  paid: { label: "Paid", tone: "success" },
  partially_paid: { label: "Partially paid", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const BATCH: Record<BatchStatus, { label: string; tone: BadgeTone }> = {
  ready: { label: "Ready", tone: "neutral" },
  submitted: { label: "Confirming", tone: "info" },
  confirmed: { label: "Confirmed", tone: "success" },
  dropped: { label: "Dropped", tone: "danger" },
};

const ITEM: Record<PayoutItemStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "neutral" },
  sending: { label: "Sending", tone: "info" },
  paid: { label: "Paid", tone: "success" },
  dropped: { label: "Dropped", tone: "danger" },
};

// Lists (History, dashboard) show four groups; the payment page shows the exact status.
const GROUP: Record<PayoutStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  ready: { label: "In progress", tone: "info" },
  submitted: { label: "In progress", tone: "info" },
  paid: { label: "Done", tone: "success" },
  partially_paid: { label: "Needs attention", tone: "warning" },
  cancelled: { label: "Done", tone: "neutral" },
};

export function PayoutStatusBadge({ status, grouped }: { status: PayoutStatus; grouped?: boolean }) {
  const s = (grouped ? GROUP : PAYOUT)[status] ?? PAYOUT.draft;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const s = BATCH[status] ?? BATCH.ready;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function ItemStatusBadge({ status }: { status: PayoutItemStatus }) {
  const s = ITEM[status] ?? ITEM.pending;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
