"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeExternalUrl } from "@/lib/safe-url";
import type { PaymentLink, PaymentRecord, Project } from "@/lib/types";

type PaymentRow = { id: string; project_id: string | null; client_id: string | null; amount: number | string; currency: string; status: string; provider: string | null; provider_reference: string | null; paid_at: string | null; created_at: string };
type LinkRow = { id: string; project_id: string | null; client_id: string | null; amount: number | string; currency: string; status: string; url: string | null; expires_at: string | null; created_at: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROVIDER_LABELS: Record<string, string> = { stripe: "Stripe", mercadopago: "Mercado Pago", paypal: "PayPal", transfer: "Transferencia", transferencia: "Transferencia", cash: "Efectivo", efectivo: "Efectivo" };

function describePayment(provider: string | null): string {
  if (!provider) return "Pago de proyecto";
  const label = PROVIDER_LABELS[provider.toLowerCase()] ?? provider;
  return `Pago vía ${label}`;
}

export interface BillingState {
  payments: PaymentRecord[];
  links: PaymentLink[];
  loading: boolean;
  error: string;
}

/**
 * Loads payment history and active checkout links for the client's own projects.
 * IDs come from the RLS-filtered project list; the database policies enforce ownership again.
 */
export function useBilling(projects: Project[], ready: boolean): BillingState {
  const [state, setState] = useState<BillingState>({ payments: [], links: [], loading: true, error: "" });
  const key = projects.map((p) => `${p.id}:${p.clientId}`).join(",");

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const projectIds = [...new Set(projects.map((p) => p.id).filter((id) => UUID.test(id)))];
    const clientIds = [...new Set(projects.map((p) => p.clientId).filter((id) => id && UUID.test(id)))];
    if (projectIds.length === 0 && clientIds.length === 0) {
      setState({ payments: [], links: [], loading: false, error: "" });
      return;
    }

    const filters = [
      clientIds.length ? `client_id.in.(${clientIds.join(",")})` : "",
      projectIds.length ? `project_id.in.(${projectIds.join(",")})` : "",
    ].filter(Boolean).join(",");

    setState((s) => ({ ...s, loading: true, error: "" }));
    const supabase = createClient();
    void Promise.all([
      supabase.from("cbdevs_payments")
        .select("id, project_id, client_id, amount, currency, status, provider, provider_reference, paid_at, created_at")
        .or(filters).order("created_at", { ascending: false }).limit(200),
      supabase.from("cbdevs_payment_links")
        .select("id, project_id, client_id, amount, currency, status, url, expires_at, created_at")
        .or(filters).eq("status", "active").order("created_at", { ascending: false }).limit(50),
    ]).then(([paymentResult, linkResult]) => {
      if (!active) return;
      if (paymentResult.error || linkResult.error) {
        console.error("[Billing] Payment query failed:", { payments: paymentResult.error?.code, links: linkResult.error?.code });
        setState({ payments: [], links: [], loading: false, error: "No se pudo cargar el historial de pagos. Intenta nuevamente más tarde." });
        return;
      }
      const now = Date.now();
      const payments = ((paymentResult.data ?? []) as PaymentRow[]).map<PaymentRecord>((row) => ({
        id: row.id,
        projectId: row.project_id ?? undefined,
        amount: Number(row.amount) || 0,
        currency: row.currency || "MXN",
        status: row.status,
        description: describePayment(row.provider),
        reference: row.provider_reference ?? undefined,
        createdAt: row.created_at,
        paidAt: row.paid_at ?? undefined,
      }));
      const links = ((linkResult.data ?? []) as LinkRow[]).flatMap<PaymentLink>((row) => {
        const url = safeExternalUrl(row.url);
        if (!url || (row.expires_at && new Date(row.expires_at).getTime() <= now)) return [];
        return [{ id: row.id, projectId: row.project_id ?? undefined, amount: Number(row.amount) || 0, currency: row.currency || "MXN", url, status: row.status, expiresAt: row.expires_at ?? undefined, createdAt: row.created_at }];
      });
      setState({ payments, links, loading: false, error: "" });
    }).catch(() => {
      if (active) setState({ payments: [], links: [], loading: false, error: "Ocurrió un error al cargar la facturación." });
    });

    return () => { active = false; };
    // `key` captures the project/client identity; `projects` itself changes reference on refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return state;
}
