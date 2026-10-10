"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { CreditCard, ExternalLink, ReceiptText } from "lucide-react";
import { getAuthClient, getDbClient } from "@/lib/firebase";
import { useClientProjects } from "@/components/useClientProjects";
import type { PaymentRecord } from "@/lib/types";

const money = (n: number, c: string) => new Intl.NumberFormat("es-MX", { style: "currency", currency: c }).format(n);

function paymentDate(value: PaymentRecord["createdAt"]) {
  if (!value) return "Sin fecha";
  if (value instanceof Date) return value.toLocaleDateString("es-MX");
  return value.toDate?.().toLocaleDateString("es-MX") ?? "Sin fecha";
}

function statusClass(status: string) {
  if (status === "paid") return "bg-emerald-500/10 text-emerald-300";
  if (status === "pending") return "bg-cb-amber/10 text-cb-amber";
  return "bg-red-500/10 text-red-300";
}

export default function BillingClient() {
  const { currentProject } = useClientProjects();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    const auth = getAuthClient();
    const db = getDbClient();
    if (!auth || !db) return;

    let unsubscribePayments: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      if (unsubscribePayments) unsubscribePayments();
      if (!user) return;
      unsubscribePayments = onSnapshot(
        query(collection(db, "payments"), where("metadata.clientUid", "==", user.uid)),
        snap => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })) as PaymentRecord[])
      );
    });

    return () => {
      if (unsubscribePayments) unsubscribePayments();
      unsubscribeAuth();
    };
  }, []);

  const total = currentProject?.amount ?? 0;
  const paid = currentProject?.initialPayment ?? payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const balance = Math.max(total - paid, 0);
  const currency = currentProject?.currency ?? "MXN";

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <div className="mono-label">BILLING</div>
        <h1 className="mt-1 text-3xl font-bold">Pagos</h1>
        <p className="mt-1 text-sm text-cb-muted">Consulta anticipos, saldo estimado y enlaces de pago activos.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <CreditCard className="mb-4 text-cb-amber" size={21} />
          <div className="text-sm text-cb-muted">Total del proyecto</div>
          <div className="mt-1 text-2xl font-bold">{money(total, currency)}</div>
        </div>
        <div className="panel p-5">
          <ReceiptText className="mb-4 text-cb-amber" size={21} />
          <div className="text-sm text-cb-muted">Pagado</div>
          <div className="mt-1 text-2xl font-bold">{money(paid, currency)}</div>
        </div>
        <div className="panel p-5">
          <CreditCard className="mb-4 text-cb-amber" size={21} />
          <div className="text-sm text-cb-muted">Saldo estimado</div>
          <div className="mt-1 text-2xl font-bold">{money(balance, currency)}</div>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-cb-line p-5">
          <div className="mono-label">HISTORY</div>
          <h2 className="mt-1 text-xl font-semibold">Historial de pagos</h2>
        </div>
        {payments.length === 0 ? (
          <div className="p-5 text-sm text-cb-muted">No hay pagos registrados en este portal todavia.</div>
        ) : (
          <div className="scrollbar overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-cb-panel2 text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="p-4">Concepto</th><th className="p-4">Fecha</th><th className="p-4">Estado</th><th className="p-4">Monto</th><th className="p-4">Link</th></tr>
              </thead>
              <tbody>
                {payments.map(payment => (
                  <tr key={payment.id} className="border-t border-cb-line">
                    <td className="p-4 font-semibold">{payment.description}</td>
                    <td className="p-4 text-cb-muted">{paymentDate(payment.createdAt)}</td>
                    <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs ${statusClass(payment.status)}`}>{payment.status}</span></td>
                    <td className="p-4">{money(payment.amount, payment.currency)}</td>
                    <td className="p-4">{payment.checkoutUrl && <a href={payment.checkoutUrl} target="_blank" className="inline-flex items-center gap-1 text-cb-amber hover:underline">Abrir <ExternalLink size={13} /></a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
