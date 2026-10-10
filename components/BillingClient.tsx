"use client";

import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, ReceiptText, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useClientProjects } from "@/components/useClientProjects";
import type { PaymentRecord } from "@/lib/types";

type PaymentRow = { id: string; project_id: string | null; client_id: string | null; amount: number | string; currency: string; status: string; provider: string | null; provider_reference: string | null; paid_at: string | null; created_at: string };
type LinkRow = { id: string; project_id: string | null; client_id: string | null; amount: number | string; currency: string; status: string; url: string | null; expires_at: string | null; created_at: string };

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
  } catch {
    return new Intl.NumberFormat("es-MX", { style: "decimal", maximumFractionDigits: 2 }).format(amount) + " " + currency;
  }
};

function statusClass(status: string) {
  if (status === "paid") return "bg-emerald-500/10 text-emerald-300";
  if (status === "pending" || status === "active") return "bg-cb-amber/10 text-cb-amber";
  return "bg-red-500/10 text-red-300";
}

function safeCheckoutUrl(value: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export default function BillingClient() {
  const { currentProject, loading: projectsLoading } = useClientProjects();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [links, setLinks] = useState<Array<{ id: string; amount: number; currency: string; url: string; status: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (active) { setPayments([]); setLinks([]); setLoading(false); }
        return;
      }

      const { data: clients, error: clientError } = await supabase.from("cbdevs_clients")
        .select("id").eq("linked_user_id", auth.user.id).eq("active", true);
      if (clientError) {
        console.error("[Billing] Client lookup failed:", clientError.code);
        if (active) { setError("No se pudieron cargar tus datos de facturación."); setLoading(false); }
        return;
      }
      const clientIds = (clients ?? []).map((client) => client.id as string);
      if (!clientIds.length) {
        if (active) { setPayments([]); setLinks([]); setLoading(false); }
        return;
      }

      const { data: projectRows, error: projectLookupError } = await supabase
        .from("cbdevs_projects")
        .select("id")
        .in("client_id", clientIds);
      if (projectLookupError) {
        console.error("[Billing] Project lookup failed:", projectLookupError.code);
        if (active) { setError("No se pudieron verificar los proyectos para cargar la facturación."); setLoading(false); }
        return;
      }
      const projectIds = (projectRows ?? []).map((project) => project.id as string);
      const filters = [
        clientIds.length ? `client_id.in.(${clientIds.join(",")})` : "",
        projectIds.length ? `project_id.in.(${projectIds.join(",")})` : "",
      ].filter(Boolean).join(",");

      if (!filters) {
        if (active) { setPayments([]); setLinks([]); setLoading(false); }
        return;
      }

      const [paymentResult, linkResult] = await Promise.all([
        supabase.from("cbdevs_payments").select("id, project_id, client_id, amount, currency, status, provider, provider_reference, paid_at, created_at")
          .or(filters).order("created_at", { ascending: false }).limit(100),
        supabase.from("cbdevs_payment_links").select("id, project_id, client_id, amount, currency, status, url, expires_at, created_at")
          .or(filters).eq("status", "active").order("created_at", { ascending: false }).limit(50),
      ]);

      if (paymentResult.error || linkResult.error) {
        console.error("[Billing] Payment query failed:", { payments: paymentResult.error?.code, links: linkResult.error?.code });
        if (active) { setError("No se pudo cargar el historial de pagos. Comprueba que las políticas del portal estén aplicadas."); setLoading(false); }
        return;
      }

      if (!active) return;
      const paymentRows = (paymentResult.data ?? []) as PaymentRow[];
      const linkRows = (linkResult.data ?? []) as LinkRow[];
      setPayments(paymentRows.map((row) => ({
        id: row.id,
        projectId: row.project_id ?? undefined,
        amount: Number(row.amount) || 0,
        currency: row.currency || "MXN",
        status: row.status,
        description: row.provider ? `Pago vía ${row.provider}` : "Pago de proyecto",
        createdAt: row.created_at,
        paidAt: row.paid_at ?? undefined,
      })));
      setLinks(linkRows.flatMap((row) => {
        const url = safeCheckoutUrl(row.url);
        if (!url || (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())) return [];
        return [{ id: row.id, amount: Number(row.amount) || 0, currency: row.currency || "MXN", url, status: row.status, createdAt: row.created_at }];
      }));
      setLoading(false);
    }

    void load().catch((cause) => {
      console.error("[Billing] Unexpected error:", cause);
      if (active) { setError("Ocurrió un error al cargar la facturación."); setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  const total = currentProject?.amount ?? 0;
  const paidForProject = currentProject?.initialPayment ?? 0;
  const paid = currentProject ? paidForProject : payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0);
  const balance = Math.max(total - paid, 0);
  const currency = currentProject?.currency ?? payments[0]?.currency ?? "MXN";

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div><div className="mono-label">BILLING</div><h1 className="mt-1 text-3xl font-bold">Pagos</h1><p className="mt-1 text-sm text-cb-muted">Consulta tu historial de pagos y los enlaces activos proporcionados por CBDEVS.</p></div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5"><CreditCard className="mb-4 text-cb-amber" size={21} /><div className="text-sm text-cb-muted">Total del proyecto principal</div><div className="mt-1 text-2xl font-bold">{money(total, currency)}</div></div>
        <div className="panel p-5"><ReceiptText className="mb-4 text-cb-amber" size={21} /><div className="text-sm text-cb-muted">Anticipo configurado</div><div className="mt-1 text-2xl font-bold">{money(paid, currency)}</div></div>
        <div className="panel p-5"><CreditCard className="mb-4 text-cb-amber" size={21} /><div className="text-sm text-cb-muted">Saldo estimado</div><div className="mt-1 text-2xl font-bold">{money(balance, currency)}</div></div>
      </div>

      {error && <div className="flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200" role="alert"><AlertTriangle size={18} className="shrink-0"/>{error}</div>}

      <section className="panel overflow-hidden">
        <div className="border-b border-cb-line p-5"><div className="mono-label">HISTORY</div><h2 className="mt-1 text-xl font-semibold">Historial de pagos</h2></div>
        {loading || projectsLoading ? <div className="p-5 text-sm text-cb-muted">Cargando historial...</div> : payments.length === 0 ? <div className="p-5 text-sm text-cb-muted">Todavía no hay pagos registrados para esta cuenta.</div> : (
          <div className="scrollbar overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-cb-panel2 text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Concepto</th><th className="p-4">Fecha</th><th className="p-4">Estado</th><th className="p-4">Monto</th></tr></thead><tbody>
            {payments.map((payment) => <tr key={payment.id} className="border-t border-cb-line"><td className="p-4 font-semibold">{payment.description}</td><td className="p-4 text-cb-muted">{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString("es-MX") : "Sin fecha"}</td><td className="p-4"><span className={`rounded-full px-2 py-1 text-xs ${statusClass(payment.status)}`}>{payment.status}</span></td><td className="p-4">{money(payment.amount, payment.currency)}</td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-cb-line p-5"><div className="mono-label">CHECKOUT</div><h2 className="mt-1 text-xl font-semibold">Enlaces de pago activos</h2></div>
        {loading ? <div className="p-5 text-sm text-cb-muted">Cargando enlaces...</div> : links.length === 0 ? <div className="p-5 text-sm text-cb-muted">No hay enlaces de pago activos en este momento.</div> : <div className="divide-y divide-cb-line">
          {links.map((link) => <div key={link.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold">{money(link.amount, link.currency)}</div><div className="mt-1 text-xs text-cb-muted">Creado {new Date(link.createdAt).toLocaleDateString("es-MX")}</div></div><a href={link.url} target="_blank" rel="noopener noreferrer" className="btn-ghost w-fit">Abrir pago <ExternalLink size={14}/></a></div>)}
        </div>}
      </section>
    </div>
  );
}