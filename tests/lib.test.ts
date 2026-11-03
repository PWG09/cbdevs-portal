import { describe, expect, it } from "vitest";
import { daysUntil, formatDate, formatMoney, initialsFrom, parseDate, relativeDays } from "@/lib/format";
import { normalizeStatus, paymentStatusLabel, statusTone } from "@/lib/status";
import { billingSummary, milestoneSummary, projectProgress } from "@/lib/project-metrics";
import { safeExternalUrl } from "@/lib/safe-url";
import type { PaymentRecord } from "@/lib/types";

describe("format", () => {
  it("keeps date-only values on the same calendar day in every time zone", () => {
    expect(parseDate("2026-03-01")?.toISOString()).toBe("2026-03-01T12:00:00.000Z");
    expect(formatDate("2026-03-01")).toMatch(/1/);
    expect(formatDate("2026-03-01")).toMatch(/2026/);
  });

  it("returns fallbacks for missing or invalid dates", () => {
    expect(formatDate("")).toBe("Por definir");
    expect(formatDate("not-a-date", "—")).toBe("—");
    expect(parseDate(undefined)).toBeNull();
  });

  it("computes relative days", () => {
    const now = new Date(2026, 9, 22, 18, 0);
    expect(daysUntil("2026-10-22", now)).toBe(0);
    expect(relativeDays("2026-10-23", now)).toBe("Mañana");
    expect(relativeDays("2026-10-27", now)).toBe("En 5 días");
    expect(relativeDays("2026-10-20", now)).toBe("Hace 2 días");
  });

  it("formats money and survives invalid currency codes", () => {
    expect(formatMoney(1500, "MXN")).toContain("1,500");
    expect(formatMoney(10, "NOT_A_CODE")).toContain("NOT_A_CODE");
    expect(formatMoney(Number.NaN, "USD")).toContain("0");
  });

  it("builds initials", () => {
    expect(initialsFrom("ana maría lópez")).toBe("AM");
    expect(initialsFrom("   ")).toBe("C");
  });
});

describe("status", () => {
  it("treats accented and unaccented statuses the same", () => {
    expect(normalizeStatus("Mantenimiento al día")).toBe(normalizeStatus("mantenimiento al dia"));
    expect(statusTone("Mantenimiento al día")).toBe("success");
    expect(statusTone("En revisión")).toBe("progress");
    expect(statusTone("En revision")).toBe("progress");
    expect(statusTone("Mantenimiento atrasado")).toBe("danger");
    expect(statusTone("Algo nuevo")).toBe("neutral");
  });

  it("translates payment codes", () => {
    expect(paymentStatusLabel("paid")).toBe("Pagado");
    expect(paymentStatusLabel("refunded")).toBe("Reembolsado");
    expect(paymentStatusLabel("weird")).toBe("weird");
  });
});

describe("project metrics", () => {
  it("uses milestones when present", () => {
    expect(projectProgress({ deliveryStatus: "Cotizado", milestones: [
      { id: "1", title: "a", status: "Completado" },
      { id: "2", title: "b", status: "En progreso" },
      { id: "3", title: "c", status: "Pendiente" },
      { id: "4", title: "d", status: "Completado" },
    ] })).toBe(50);
  });

  it("falls back to the delivery status and does not invent progress for paused projects", () => {
    expect(projectProgress({ deliveryStatus: "En revisión", milestones: [] })).toBe(82);
    expect(projectProgress({ deliveryStatus: "Pausado/Cancelado", milestones: [] })).toBeNull();
  });

  it("finds the next pending milestone in order", () => {
    const summary = milestoneSummary([
      { id: "b", title: "B", status: "Pendiente", sortOrder: 2 },
      { id: "a", title: "A", status: "Completado", sortOrder: 1 },
      { id: "c", title: "C", status: "En progreso", sortOrder: 3 },
    ]);
    expect(summary).toMatchObject({ total: 3, completed: 1 });
    expect(summary.next?.id).toBe("b");
    expect(summary.upcoming.map((m) => m.id)).toEqual(["b", "c"]);
  });

  it("sums only paid payments of the project in the project currency", () => {
    const project = { id: "p1", amount: 10000, currency: "MXN" };
    const payment = (over: Partial<PaymentRecord>): PaymentRecord => ({ id: Math.random().toString(), projectId: "p1", amount: 0, currency: "MXN", status: "paid", description: "", ...over });
    const summary = billingSummary(project, [
      payment({ amount: 3000 }),
      payment({ amount: 2000.5 }),
      payment({ amount: 999, status: "failed" }),
      payment({ amount: 1500, status: "pending" }),
      payment({ amount: 500, currency: "USD" }),
      payment({ amount: 4000, projectId: "other" }),
    ]);
    expect(summary).toMatchObject({ paid: 5000.5, balance: 4999.5, pending: 1500, paidCount: 2, hasMixedCurrency: true });
  });

  it("never reports a negative balance", () => {
    expect(billingSummary({ id: "p", amount: 100, currency: "MXN" }, [{ id: "x", projectId: "p", amount: 250, currency: "MXN", status: "paid", description: "" }]).balance).toBe(0);
  });
});

describe("safeExternalUrl", () => {
  it("only allows plain https URLs", () => {
    expect(safeExternalUrl("https://cbdevs.com/doc.pdf")).toBe("https://cbdevs.com/doc.pdf");
    expect(safeExternalUrl("http://cbdevs.com")).toBeUndefined();
    expect(safeExternalUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeExternalUrl("https://user:pass@cbdevs.com")).toBeUndefined();
    expect(safeExternalUrl("data:text/html,hi")).toBeUndefined();
    expect(safeExternalUrl(`https://a.com/${"x".repeat(3000)}`)).toBeUndefined();
  });
});
