import { isCompletedMilestone, normalizeStatus } from "@/lib/status";
import type { PaymentRecord, Project, ProjectMilestone } from "@/lib/types";

const STATUS_PROGRESS: Record<string, number> = {
  cotizado: 10,
  "en desarrollo": 55,
  "en revision": 82,
  entregado: 100,
  "en mantenimiento": 100,
};

/**
 * Project completion percentage. Milestones are the source of truth when present;
 * otherwise the delivery status gives an approximate value. Paused/cancelled or unknown
 * states return null so the UI does not invent progress.
 */
export function projectProgress(project: Pick<Project, "milestones" | "deliveryStatus">): number | null {
  const milestones = project.milestones ?? [];
  if (milestones.length > 0) {
    return Math.round((milestones.filter((m) => isCompletedMilestone(m.status)).length / milestones.length) * 100);
  }
  const fallback = STATUS_PROGRESS[normalizeStatus(project.deliveryStatus)];
  return fallback ?? null;
}

export function milestoneSummary(milestones: ProjectMilestone[] = []) {
  const completed = milestones.filter((m) => isCompletedMilestone(m.status)).length;
  const sorted = [...milestones].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const next = sorted.find((m) => !isCompletedMilestone(m.status)) ?? null;
  const upcoming = sorted.filter((m) => !isCompletedMilestone(m.status)).slice(0, 3);
  return { total: milestones.length, completed, next, upcoming };
}

export interface BillingSummary {
  total: number;
  paid: number;
  balance: number;
  pending: number;
  paidCount: number;
  currency: string;
  /** True when a recorded payment uses a different currency from the project and was excluded. */
  hasMixedCurrency: boolean;
}

/**
 * Summarizes recorded payments for one project. Only payments with status `paid` and the
 * project's currency count toward the paid amount; the balance never goes negative.
 */
export function billingSummary(project: Pick<Project, "id" | "amount" | "currency">, payments: PaymentRecord[]): BillingSummary {
  const forProject = payments.filter((p) => p.projectId === project.id);
  let paid = 0;
  let pending = 0;
  let paidCount = 0;
  let hasMixedCurrency = false;
  for (const payment of forProject) {
    if (payment.currency !== project.currency) {
      hasMixedCurrency = true;
      continue;
    }
    if (payment.status === "paid") {
      paid += payment.amount;
      paidCount += 1;
    } else if (payment.status === "pending") {
      pending += payment.amount;
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    total: project.amount,
    paid: round(paid),
    pending: round(pending),
    balance: round(Math.max(project.amount - paid, 0)),
    paidCount,
    currency: project.currency,
    hasMixedCurrency,
  };
}
